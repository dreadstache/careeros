from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

from app.studio import export_public_manifests


if __name__ == "__main__":
    tracks, ecosystem = export_public_manifests(ROOT)
    print(f"Exported résumé track manifest: {tracks}")
    print(f"Exported portfolio ecosystem manifest: {ecosystem}")
