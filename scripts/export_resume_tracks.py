from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.studio import export_track_manifest


if __name__ == "__main__":
    destination = export_track_manifest(ROOT)
    print(f"Exported résumé track manifest: {destination}")
