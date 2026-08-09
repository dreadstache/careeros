from __future__ import annotations

import hashlib
import json
import os
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
PUBLISHABLE_PATHS = {"data/career-data.json", "forge.resume.json"}


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
        "tracks": profiles,
        "catalog": {
            "experience": _active_catalog(data, "experience"),
            "skills": _active_catalog(data, "skills"),
            "projects": _active_catalog(data, "projects"),
        },
    }


def save_track_selections(root: Path, selections: list[dict[str, Any]]) -> dict[str, Any]:
    config_path = root / "forge.resume.json"
    config = json.loads(config_path.read_text(encoding="utf-8"))
    profiles = config.get("module_options", {}).get("resume", {}).get("profiles", [])
    by_slug = {profile["slug"]: profile for profile in profiles}
    incoming = {selection["slug"]: selection for selection in selections}
    if set(incoming) != set(by_slug):
        raise ValueError("Track selection must include every existing résumé track exactly once")

    data = json.loads((root / "data" / "career-data.json").read_text(encoding="utf-8"))
    valid_ids = {
        "experience_ids": {item["id"] for item in data.get("experience", []) if item.get("id") and item.get("status", "active") == "active"},
        "skill_ids": {item["id"] for item in data.get("skills", []) if item.get("id") and item.get("status", "active") == "active"},
        "project_ids": {item["id"] for item in data.get("projects", []) if item.get("id") and item.get("status", "active") == "active"},
    }
    updated = deepcopy(config)
    updated_profiles = updated["module_options"]["resume"]["profiles"]
    for profile in updated_profiles:
        selection = incoming[profile["slug"]]
        for field, allowed in valid_ids.items():
            values = list(dict.fromkeys(selection.get(field, [])))
            unknown = sorted(set(values) - allowed)
            if unknown:
                raise ValueError(f"{profile['slug']} contains unknown {field}: {', '.join(unknown)}")
            profile[field] = values
        if not any(profile[field] for field in valid_ids):
            raise ValueError(f"{profile['slug']} must include at least one career record")

    backup = _backup_file(config_path, root / "backups", "forge-resume")
    original = config_path.read_bytes()

    def operation():
        try:
            config_path.write_text(json.dumps(updated, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            generation = run_generation(root)
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
    _run_git(root, "add", "--", *status["publishable_changes"])
    _run_git(root, "commit", "-m", "Publish reviewed CareerOS Studio changes")
    commit = _run_git(root, "rev-parse", "HEAD")
    _run_git(root, "push", "origin", "main")
    return {"status": "published", "commit": commit}
