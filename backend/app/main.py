import os
import secrets
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Annotated

from fastapi import Depends, FastAPI, File, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.studio import (
    apply_review,
    load_track_studio,
    publish,
    publishing_status,
    register_review,
    save_tracks,
)

app = FastAPI(title="CareerOS API", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_methods=["GET", "POST", "PUT"],
    allow_headers=["*"],
)

ROOT = Path(__file__).resolve().parents[2]
CANONICAL = ROOT / "data" / "career-data.json"


class TrackSelection(BaseModel):
    slug: str
    original_slug: str | None = None
    title: str
    headline: str
    summary: str
    experience_ids: list[str] = Field(default_factory=list)
    skill_ids: list[str] = Field(default_factory=list)
    project_ids: list[str] = Field(default_factory=list)


class TrackSelectionRequest(BaseModel):
    tracks: list[TrackSelection]
    removed_slugs: list[str] = Field(default_factory=list)
    confirm_removals: bool = False


def require_owner(
    owner_token: Annotated[str | None, Header(alias="X-CareerOS-Owner-Token")] = None,
) -> None:
    configured = os.getenv("CAREEROS_OWNER_TOKEN", "").strip()
    if not configured:
        raise HTTPException(status_code=503, detail="Set CAREEROS_OWNER_TOKEN before using Studio write actions")
    if not owner_token or not secrets.compare_digest(owner_token, configured):
        raise HTTPException(status_code=401, detail="Invalid CareerOS owner token")

@app.get("/health")
def health_check():
    return {"status":"ok"}


@app.post("/imports/review")
def review_import(file: UploadFile = File(...)):
    suffix = Path(file.filename or "").suffix.lower()
    if suffix != ".xlsx":
        raise HTTPException(status_code=400, detail="Upload the CareerOS .xlsx workbook")
    workbook = file.file.read()
    with NamedTemporaryFile(suffix=suffix, delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(workbook)
    try:
        return register_review(workbook, temporary, CANONICAL)
    finally:
        temporary.unlink(missing_ok=True)


@app.post("/imports/{review_id}/apply", dependencies=[Depends(require_owner)])
def apply_reviewed_import(review_id: str):
    try:
        return apply_review(review_id, ROOT)
    except KeyError as error:
        raise HTTPException(status_code=404, detail=str(error.args[0])) from error
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        status_code = 409 if "changed after this review" in str(error) else 500
        raise HTTPException(status_code=status_code, detail=str(error)) from error


@app.get("/studio/tracks")
def get_track_studio():
    return load_track_studio(ROOT)


@app.put("/studio/tracks", dependencies=[Depends(require_owner)])
def update_track_studio(request: TrackSelectionRequest):
    try:
        return save_tracks(
            ROOT,
            [track.model_dump() for track in request.tracks],
            request.removed_slugs,
            request.confirm_removals,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.get("/publishing/status", dependencies=[Depends(require_owner)])
def get_publishing_status():
    try:
        return publishing_status(ROOT)
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error


@app.post("/publishing/publish", dependencies=[Depends(require_owner)])
def publish_studio_changes():
    try:
        return publish(ROOT)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
