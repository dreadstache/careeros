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
python -m pip install "careeros-forge @ git+https://github.com/dreadstache/careeros-forge.git@ca87db2"
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
