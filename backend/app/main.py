from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.imports import build_review

app = FastAPI(title="CareerOS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

ROOT = Path(__file__).resolve().parents[2]
CANONICAL = ROOT / "data" / "career-data.json"

@app.get("/health")
def health_check():
    return {"status":"ok"}


@app.post("/imports/review")
def review_import(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix != ".xlsx":
        raise HTTPException(status_code=400, detail="Upload the CareerOS .xlsx workbook")
    with NamedTemporaryFile(suffix=suffix, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(file.file.read())
    try:
        return build_review(temporary, CANONICAL)
    finally:
        temporary.unlink(missing_ok=True)
