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
python -m pip install "careeros-forge @ git+https://github.com/dreadstache/careeros-forge.git@df46b2a997980342147e80104f4cedfc1d143de4"
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
