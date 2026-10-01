#!/usr/bin/env python3
"""Create a sibling CareerOS workspace without changing existing checkouts."""
import argparse
import shutil
import subprocess
import sys
from pathlib import Path

REPOSITORIES = (
    "careeros", "careeros-forge", "luccote-portfolio",
    "dreadstache-portfolio", "dreadstache-music",
)


def run(*command, cwd=None):
    print("+ " + " ".join(str(part) for part in command), flush=True)
    subprocess.run([str(part) for part in command], cwd=cwd, check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.home() / "Developer" / "CareerOS")
    parser.add_argument("--clone-only", action="store_true", help="Skip dependency installation and generation")
    args = parser.parse_args()
    if sys.version_info < (3, 11):
        parser.error("Python 3.11 or newer is required")
    for executable in (("git",) if args.clone_only else ("git", "node", "npm")):
        if not shutil.which(executable):
            parser.error(f"Install {executable} before running setup")
    root = args.root.expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True)
    for name in REPOSITORIES:
        checkout = root / name
        remote = f"https://github.com/dreadstache/{name}.git"
        if checkout.exists():
            actual = subprocess.check_output(
                ["git", "-C", str(checkout), "remote", "get-url", "origin"], text=True
            ).strip()
            expected = f"github.com/dreadstache/{name}"
            normalized = actual.removesuffix(".git").replace("github.com:", "github.com/")
            if not normalized.endswith(expected):
                parser.error(f"{checkout} has an unexpected origin: {actual}")
            print(f"Keeping existing checkout: {checkout} (no pull or branch switch)")
        else:
            run("git", "clone", remote, checkout)
    if args.clone_only:
        return
    core = root / "careeros"
    venv = core / ".venv"
    if not venv.exists():
        run(sys.executable, "-m", "venv", venv)
    python = venv / ("Scripts/python.exe" if sys.platform == "win32" else "bin/python")
    run(python, "-m", "pip", "install", "-r", core / "backend/requirements.txt", "-e", root / "careeros-forge")
    forge = venv / ("Scripts/careeros-forge.exe" if sys.platform == "win32" else "bin/careeros-forge")
    run(forge, "--config", "forge.resume.json", cwd=core)
    run(python, "scripts/export_resume_tracks.py", cwd=core)
    npm = shutil.which("npm")
    run(npm, "ci", cwd=core / "frontend")
    print(f"\nReady: {root}\nSee careeros/docs/mac-workspace.md for launch and handoff instructions.")


if __name__ == "__main__":
    try:
        main()
    except (subprocess.CalledProcessError, OSError) as error:
        print(f"Setup stopped: {error}", file=sys.stderr)
        sys.exit(1)
