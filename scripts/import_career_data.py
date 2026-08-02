from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.imports import apply_import, build_review


def main() -> int:
    parser = argparse.ArgumentParser(description="Review and apply CareerOS spreadsheet imports")
    parser.add_argument("mode", choices=("review", "apply"))
    parser.add_argument("input", type=Path)
    parser.add_argument("--canonical", type=Path, default=ROOT / "data" / "career-data.json")
    parser.add_argument("--report", type=Path, default=ROOT / "exports" / "import-review.json")
    parser.add_argument("--section", choices=("experience", "education", "skills", "projects"))
    args = parser.parse_args()

    review = build_review(args.input, args.canonical, args.section)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(review, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(review["summary"], indent=2))
    print(f"Review report: {args.report}")
    if args.mode == "apply":
        apply_import(review, args.canonical)
        print(f"Applied to: {args.canonical}")
    return 0 if review["valid"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
