# CareerOS

> One source of truth. Infinite ways to tell the story.

CareerOS stores structured career knowledge and generates résumés,
portfolio pages, cover letters, case studies, search, and visualizations.

## Domains

Analytics · Games · Technical Art · Software · GIS · Music · Film · Simulation

## Stack

FastAPI · SQLite/PostgreSQL-ready · SQLAlchemy · React · TypeScript · D3.js · Jinja2

## Run locally

```powershell
python -m pip install "careeros-forge @ git+https://github.com/dreadstache/careeros-forge.git@f0467676b0d74d7cabcbaad2700fc27e2af8c867"
careeros-forge --config forge.resume.json
cd frontend
npm install
npm run dev
```

CareerOS owns the verified data in `data/career-data.json`. CareerOS Forge
validates that source and generates the browser- and print-ready résumé under
`frontend/public/generated/` before each local or GitHub Pages build.

The frontend is deployed to GitHub Pages from `main` by the
`deploy-pages.yml` workflow.

## Career data imports

Download `frontend/public/templates/CareerOS_Import_Template.xlsx`, edit the
career records, and leave existing IDs unchanged. Every row uses an explicit
operation:

- `upsert` creates or updates a record.
- `archive` hides a record from generated outputs while preserving its history.
- Missing rows make no changes.

Always review an import before applying it:

```powershell
python scripts/import_career_data.py review path\to\CareerOS_Import_Template.xlsx
```

The command writes `exports/import-review.json` with every proposed create,
update, and archive. Once the report looks right, apply the same file:

```powershell
python scripts/import_career_data.py apply path\to\CareerOS_Import_Template.xlsx
careeros-forge --config forge.resume.json
```

CSV files are supported one section at a time with `--section experience`,
`education`, `skills`, or `projects`.

### Local Import Studio

The owner-only workflow is available only when CareerOS is running locally.
Create a local token, point the API at Forge when using a source checkout, and
start the API and frontend in separate PowerShell windows:

```powershell
$env:CAREEROS_OWNER_TOKEN=[Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:CAREEROS_FORGE_SOURCE="D:\GITHUB\careeros-forge\src"
$env:PYTHONPATH="backend"
python -m uvicorn app.main:app --reload
```

```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` and paste the same owner token into Career Data
Studio. The guarded workflow is:

1. Choose the edited workbook and review every proposed change.
2. Apply that exact review. CareerOS creates a local backup and regenerates all
   résumés; stale reviews and generation failures are rejected or rolled back.
3. Expand each résumé track and select only the experience, skills, and projects
   that belong in that track, then save and regenerate.
4. Check publish status, then commit and publish. Publishing is allowed only
   from synchronized `main`, permits only `data/career-data.json` and
   `forge.resume.json`, and stops when unrelated changes are present.

The public GitHub Pages site remains view-only and does not contain Studio
controls. The owner token is kept in browser memory only and is required by
every API endpoint that changes data, track configuration, or Git state.

For new work history, add a row to **Experience**, use `upsert`, and create a
unique lowercase ID such as `experience-company-role`. For skills, add a row to
**Skills** for each useful category and separate individual keywords with `|`.
Keep every existing ID unchanged.
