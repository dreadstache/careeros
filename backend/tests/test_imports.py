import json
from pathlib import Path

from openpyxl import Workbook

from app.imports import apply_import, build_review


def _canonical(path: Path) -> Path:
    path.write_text(json.dumps({"experience": [{"id": "old-role", "status": "active", "organization": "Old Co"}]}), encoding="utf-8")
    return path


def test_review_does_not_mutate_and_reports_create_update_archive(tmp_path):
    canonical = _canonical(tmp_path / "career.json")
    before = canonical.read_text(encoding="utf-8")
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Experience"
    sheet.append(["id", "operation", "status", "organization", "position", "source", "note"])
    sheet.append(["old-role", "archive", "active", "Old Co", "", "career workbook", "retired"])
    sheet.append(["new-role", "upsert", "active", "New Co", "Artist", "career workbook", "verified"])
    source = tmp_path / "import.xlsx"
    workbook.save(source)

    review = build_review(source, canonical)

    assert review["valid"] is True
    assert review["summary"] == {"create": 1, "update": 0, "archive": 1, "errors": 0}
    assert canonical.read_text(encoding="utf-8") == before

    applied = apply_import(review, canonical)
    assert {item["id"]: item["status"] for item in applied["experience"]} == {"old-role": "archived", "new-role": "active"}


def test_review_rejects_missing_id(tmp_path):
    canonical = _canonical(tmp_path / "career.json")
    source = tmp_path / "skills.csv"
    source.write_text("id,operation,name\n,upsert,Python\n", encoding="utf-8")
    review = build_review(source, canonical, "skills")
    assert review["valid"] is False
    assert review["summary"]["errors"] == 1


def test_unchanged_row_is_not_reported(tmp_path):
    canonical = _canonical(tmp_path / "career.json")
    source = tmp_path / "experience.csv"
    source.write_text("id,operation,status,organization\nold-role,upsert,active,Old Co\n", encoding="utf-8")
    review = build_review(source, canonical, "experience")
    assert review["summary"] == {"create": 0, "update": 0, "archive": 0, "errors": 0}
