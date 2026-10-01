# CareerOS on Windows and Mac

Keep independent local Git checkouts on each computer. GitHub carries committed
changes between them. Use a folder outside iCloud, OneDrive, or Dropbox.

## First Mac setup

Install Git, Python 3.11 or newer, and Node.js 22 LTS (including npm). Sign in to
GitHub with your usual Git credential manager or GitHub CLI if needed.

In Terminal:

```sh
mkdir -p ~/Developer/CareerOS
cd ~/Developer/CareerOS
git clone https://github.com/dreadstache/careeros.git
python3 careeros/scripts/bootstrap_workspace.py
```

The script clones the other four repositories, creates `careeros/.venv`, installs
the backend requirements and editable sibling Forge package, generates the
résumé library, exports its tracks, and installs frontend dependencies using
the lockfile. It never pulls, switches branches, resets, or deletes existing
checkouts. Existing origins are checked before use. Rerunning setup may update
dependencies and generated files; commit your source edits first.

Use `--root /your/workspace` for a different destination or `--clone-only` to
skip dependencies and generation. Each repository remains independent:

| Folder | Purpose |
| --- | --- |
| careeros | Career data, résumé application, backend, import tools |
| careeros-forge | Generator installed as an editable Python package |
| luccote-portfolio | Public technology portfolio |
| dreadstache-portfolio | Games portfolio |
| dreadstache-music | Music site |

Add these five local folders to your Codex project, with `careeros` primary.
Read each repository's instructions when working there. The Mac's local paths,
tools, credentials, and permissions must be configured on the Mac; Git does not
transfer Windows app settings or guarantee chat-history continuity. Use this
guide and committed handoff notes to preserve context.

## Run CareerOS

In one Terminal window:

```sh
cd ~/Developer/CareerOS/careeros
source .venv/bin/activate
export CAREEROS_OWNER_TOKEN="$(python -c 'import secrets; print(secrets.token_hex(32))')"
export CAREEROS_FORGE_SOURCE="$(cd ../careeros-forge/src && pwd)"
export PYTHONPATH=backend
export DATABASE_URL="sqlite:///$(pwd)/database/careeros.sqlite"
printf 'Local Studio token: %s\n' "$CAREEROS_OWNER_TOKEN"
python -m uvicorn app.main:app --reload --host 127.0.0.1
```

Keep that token private. In another Terminal window:

```sh
cd ~/Developer/CareerOS/careeros/frontend
npm run dev -- --host 127.0.0.1
```

Open the URL Vite prints (normally `http://localhost:5173`). Paste the token into
Career Data Studio when using owner controls. To regenerate after editing data
or Forge, activate the virtual environment from the `careeros` folder and run:

```sh
careeros-forge --config forge.resume.json
python scripts/export_resume_tracks.py
```

Static sibling sites can be previewed individually with `python3 -m http.server
8001 --bind 127.0.0.1` from their folder. Use different ports for simultaneous
previews. The separately located Dreadstache Web Development source project
and any external assets are not included in these five clones.

## Switching computers

Before editing a repository, check `git status`, fetch, and select the branch
you intend to work on. With a clean working tree on that branch, use
`git pull --ff-only`. Stop and inspect if it cannot fast-forward.

Before leaving a computer, review the diff, commit only intended source files,
and push the branch with `git push -u origin BRANCH_NAME`. On the other computer,
fetch and check out that same branch to continue unfinished work. Repeat for
every repository you changed. Avoid editing the same branch on two machines
at once. A commit is local until pushed. A stash does not travel through GitHub.

Use `codex/` for new development branch names. Publishing from CareerOS Studio
requires synchronized `main` and permits only its designated data/config files;
use the normal Git/PR workflow for code or setup changes.

## What Git does not transfer

- Recreate `.venv`, `node_modules`, caches, and generated output on each machine.
- Transfer necessary secrets securely; never commit `.env` or owner tokens.
- Tracked `data/career-data.json` travels with Git. Ignored SQLite databases,
  import exports, and backups need a deliberate backup/export workflow if needed.
  Stop database writers before transferring a SQLite backup.
- Inventory large source media and external assets separately. Use controlled
  asset storage or Git LFS when appropriate rather than assuming clones contain
  files outside these repositories.

## Validation

From `careeros`, after activating `.venv`:

```sh
python -m pytest backend/tests -q
cd frontend
npm run build
```

For Forge, from its folder with the same environment active:

```sh
python -m pytest tests -q
```

Complete a browser check of the résumé library and Studio on the actual Mac.
Passing Windows checks does not verify a Mac installation.
