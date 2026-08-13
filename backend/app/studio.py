from __future__ import annotations

import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any
from uuid import uuid4

from app.imports import apply_import, build_review

MAX_WORKBOOK_BYTES = 10 * 1024 * 1024
PUBLISHABLE_PATHS = {"data/career-data.json", "data/ecosystem.json", "forge.resume.json"}
TRACK_SLUG_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")


@dataclass
class PendingReview:
    workbook: bytes
    canonical_sha256: str
    review: dict[str, Any]


PENDING_REVIEWS: dict[str, PendingReview] = {}


def _sha256(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def _timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _backup_file(source: Path, backup_directory: Path, prefix: str) -> Path:
    backup_directory.mkdir(parents=True, exist_ok=True)
    destination = backup_directory / f"{prefix}-{_timestamp()}-{uuid4().hex[:8]}{source.suffix}"
    shutil.copy2(source, destination)
    return destination


def register_review(workbook: bytes, source: Path, canonical: Path) -> dict[str, Any]:
    if not workbook:
        raise ValueError("The workbook is empty")
    if len(workbook) > MAX_WORKBOOK_BYTES:
        raise ValueError("The workbook exceeds the 10 MB Studio limit")
    review = build_review(source, canonical)
    while len(PENDING_REVIEWS) >= 20:
        PENDING_REVIEWS.pop(next(iter(PENDING_REVIEWS)))
    review_id = uuid4().hex
    PENDING_REVIEWS[review_id] = PendingReview(
        workbook=workbook,
        canonical_sha256=_sha256(canonical.read_bytes()),
        review=review,
    )
    return {**review, "review_id": review_id}


def _generation_environment() -> dict[str, str]:
    environment = os.environ.copy()
    forge_source = environment.get("CAREEROS_FORGE_SOURCE", "").strip()
    if forge_source:
        existing = environment.get("PYTHONPATH", "")
        environment["PYTHONPATH"] = os.pathsep.join(part for part in (forge_source, existing) if part)
    return environment


def run_generation(root: Path) -> str:
    result = subprocess.run(
        [sys.executable, "-m", "careeros_forge", "--config", str(root / "forge.resume.json")],
        cwd=root,
        capture_output=True,
        text=True,
        env=_generation_environment(),
        check=False,
    )
    if result.returncode:
        detail = (result.stderr or result.stdout).strip()
        raise RuntimeError(detail or "CareerOS Forge generation failed")
    return result.stdout.rstrip()


def export_track_manifest(root: Path) -> Path:
    config = json.loads((root / "forge.resume.json").read_text(encoding="utf-8"))
    profiles = config.get("module_options", {}).get("resume", {}).get("profiles", [])
    manifest = {
        "schema_version": "1.0",
        "tracks": [
            {
                "slug": profile["slug"],
                "title": profile["title"],
                "headline": profile.get("headline", ""),
                "summary": profile.get("summary", ""),
            }
            for profile in profiles
        ],
    }
    destination = root / "frontend" / "public" / "generated" / "resume" / "tracks.json"
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return destination


def export_ecosystem_manifest(root: Path) -> Path:
    source = root / "data" / "ecosystem.json"
    manifest = json.loads(source.read_text(encoding="utf-8"))
    destinations = manifest.get("destinations", [])
    destination_ids = [destination.get("id") for destination in destinations]
    if not manifest.get("identity", {}).get("name"):
        raise ValueError("The ecosystem manifest requires an identity name")
    if not destinations or any(not destination_id for destination_id in destination_ids):
        raise ValueError("The ecosystem manifest requires named destinations")
    if len(destination_ids) != len(set(destination_ids)):
        raise ValueError("The ecosystem manifest contains duplicate destination IDs")
    for destination in destinations:
        if destination.get("status") == "live" and not str(destination.get("url", "")).startswith("https://"):
            raise ValueError(f"Live destination {destination['id']} requires an HTTPS URL")
    output = root / "frontend" / "public" / "generated" / "ecosystem.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return output


def export_public_manifests(root: Path) -> tuple[Path, Path]:
    return export_track_manifest(root), export_ecosystem_manifest(root)


def _with_generated_backup(root: Path, operation):
    generated = root / "frontend" / "public" / "generated"
    with TemporaryDirectory(prefix="careeros-generated-") as temporary_directory:
        snapshot = Path(temporary_directory) / "generated"
        if generated.exists():
            shutil.copytree(generated, snapshot)
        try:
            return operation()
        except Exception:
            if generated.exists():
                shutil.rmtree(generated)
            if snapshot.exists():
                shutil.copytree(snapshot, generated)
            raise


def apply_review(review_id: str, root: Path) -> dict[str, Any]:
    pending = PENDING_REVIEWS.get(review_id)
    if pending is None:
        raise KeyError("Review not found or expired. Review the workbook again.")
    canonical = root / "data" / "career-data.json"
    if _sha256(canonical.read_bytes()) != pending.canonical_sha256:
        raise RuntimeError("Career data changed after this review. Review the workbook again.")
    if not pending.review["valid"]:
        raise ValueError("Cannot apply a review with validation errors")
    if not pending.review["changes"]:
        raise ValueError("This review contains no changes to apply")

    backup = _backup_file(canonical, root / "backups", "career-data")
    original = canonical.read_bytes()

    def operation():
        try:
            apply_import(pending.review, canonical)
            generation = run_generation(root)
            export_public_manifests(root)
        except Exception:
            canonical.write_bytes(original)
            raise
        return generation

    generation = _with_generated_backup(root, operation)
    PENDING_REVIEWS.pop(review_id, None)
    return {
        "status": "applied",
        "summary": pending.review["summary"],
        "backup": str(backup.relative_to(root)),
        "generation": generation,
    }


def _active_catalog(data: dict[str, Any], section: str) -> list[dict[str, str]]:
    catalog = []
    for record in data.get(section, []):
        if record.get("status", "active") != "active" or not record.get("id"):
            continue
        if section == "experience":
            label = " — ".join(part for part in (record.get("organization"), record.get("position")) if part)
        else:
            label = str(record.get("name") or record.get("id"))
        catalog.append({"id": str(record["id"]), "label": label})
    return catalog


def load_track_studio(root: Path) -> dict[str, Any]:
    config = json.loads((root / "forge.resume.json").read_text(encoding="utf-8"))
    data = json.loads((root / "data" / "career-data.json").read_text(encoding="utf-8"))
    profiles = config.get("module_options", {}).get("resume", {}).get("profiles", [])
    return {
        "tracks": [{**profile, "original_slug": profile["slug"]} for profile in profiles],
        "catalog": {
            "experience": _active_catalog(data, "experience"),
            "skills": _active_catalog(data, "skills"),
            "projects": _active_catalog(data, "projects"),
        },
    }


def save_tracks(
    root: Path,
    tracks: list[dict[str, Any]],
    removed_slugs: list[str],
    confirm_removals: bool,
) -> dict[str, Any]:
    config_path = root / "forge.resume.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    profiles = config.get("module_options", {}).get("resume", {}).get("profiles", [])
    existing_slugs = {profile["slug"] for profile in profiles}
    if not tracks:
        raise ValueError("CareerOS must contain at least one résumé track")

    new_slugs: set[str] = set()
    original_slugs: set[str] = set()
    for track in tracks:
        slug = str(track.get("slug", "")).strip()
        original_slug = track.get("original_slug")
        if not TRACK_SLUG_PATTERN.fullmatch(slug):
            raise ValueError(f"Invalid track slug: {slug or '(empty)'}")
        if slug in new_slugs:
            raise ValueError(f"Duplicate track slug: {slug}")
        new_slugs.add(slug)
        if original_slug:
            if original_slug not in existing_slugs:
                raise ValueError(f"Unknown original track slug: {original_slug}")
            if original_slug in original_slugs:
                raise ValueError(f"Original track appears more than once: {original_slug}")
            original_slugs.add(original_slug)

    missing = existing_slugs - original_slugs
    if set(removed_slugs) != missing:
        raise ValueError("Removed track list does not match the tracks omitted from this save")
    if missing and not confirm_removals:
        raise ValueError("Confirm track removal before saving")

    data = json.loads((root / "data" / "career-data.json").read_text(encoding="utf-8"))
    valid_ids = {
        "experience_ids": {item["id"] for item in data.get("experience", []) if item.get("id") and item.get("status", "active") == "active"},
        "skill_ids": {item["id"] for item in data.get("skills", []) if item.get("id") and item.get("status", "active") == "active"},
        "project_ids": {item["id"] for item in data.get("projects", []) if item.get("id") and item.get("status", "active") == "active"},
    }
    updated_profiles = []
    for track in tracks:
        slug = track["slug"].strip()
        title = str(track.get("title", "")).strip()
        headline = str(track.get("headline", "")).strip()
        summary = str(track.get("summary", "")).strip()
        if not title or not headline or not summary:
            raise ValueError(f"{slug} requires a title, headline, and summary")
        profile = {"slug": slug, "title": title, "headline": headline, "summary": summary}
        for field, allowed in valid_ids.items():
            values = list(dict.fromkeys(track.get(field, [])))
            unknown = sorted(set(values) - allowed)
            if unknown:
                raise ValueError(f"{slug} contains unknown {field}: {', '.join(unknown)}")
            profile[field] = values
        if not any(profile[field] for field in valid_ids):
            raise ValueError(f"{slug} must include at least one career record")
        updated_profiles.append(profile)

    updated = deepcopy(config)
    updated["module_options"]["resume"]["profiles"] = updated_profiles

    backup = _backup_file(config_path, root / "backups", "forge-resume")
    original = config_path.read_bytes()

    def operation():
        try:
            config_path.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            generation = run_generation(root)
            resume_root = root / "frontend" / "public" / "generated" / "resume"
            for stale_slug in existing_slugs - new_slugs:
                stale_directory = resume_root / stale_slug
                if stale_directory.is_dir():
                    shutil.rmtree(stale_directory)
            export_public_manifests(root)
        except Exception:
            config_path.write_bytes(original)
            raise
        return generation

    generation = _with_generated_backup(root, operation)
    return {
        "status": "saved",
        "backup": str(backup.relative_to(root)),
        "generation": generation,
        **load_track_studio(root),
    }


def _run_git(root: Path, *arguments: str, check: bool = True) -> str:
    result = subprocess.run(
        ["git", *arguments],
        cwd=root,
        capture_output=True,
        text=True,
        check=False,
    )
    if check and result.returncode:
        raise RuntimeError((result.stderr or result.stdout).strip() or f"git {' '.join(arguments)} failed")
    return result.stdout.rstrip()


def publishing_status(root: Path) -> dict[str, Any]:
    branch = _run_git(root, "branch", "--show-current")
    lines = [line for line in _run_git(root, "status", "--porcelain").splitlines() if line]
    changed = [line[3:].replace("\\", "/") for line in lines]
    unrelated = sorted(path for path in changed if path not in PUBLISHABLE_PATHS)
    publishable = sorted(path for path in changed if path in PUBLISHABLE_PATHS)
    return {
        "branch": branch,
        "publishable_changes": publishable,
        "unrelated_changes": unrelated,
        "ready": branch == "main" and bool(publishable) and not unrelated,
    }


def publish(root: Path) -> dict[str, Any]:
    status = publishing_status(root)
    if status["branch"] != "main":
        raise ValueError("Publishing is only allowed from the main branch")
    if status["unrelated_changes"]:
        raise ValueError("Unrelated local changes must be resolved before publishing")
    if not status["publishable_changes"]:
        raise ValueError("There are no reviewed CareerOS changes to publish")

    _run_git(root, "fetch", "origin", "main")
    if _run_git(root, "rev-parse", "HEAD") != _run_git(root, "rev-parse", "origin/main"):
        raise RuntimeError("Local main is not synchronized with origin/main")
    _run_git(root, "diff", "--check")
    run_generation(root)
    export_public_manifests(root)
    _run_git(root, "add", "--", *status["publishable_changes"])
    _run_git(root, "commit", "-m", "Publish reviewed CareerOS Studio changes")
    commit = _run_git(root, "rev-parse", "HEAD")
    _run_git(root, "push", "origin", "main")
    return {"status": "published", "commit": commit}
