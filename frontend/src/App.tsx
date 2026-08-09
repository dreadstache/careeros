import { ChangeEvent, useEffect, useState } from "react";

type Change = { section: string; id: string; result: "create" | "update" | "archive" };
type Review = {
  review_id: string;
  valid: boolean;
  summary: Record<"create" | "update" | "archive" | "errors", number>;
  errors: string[];
  changes: Change[];
};
type Track = {
  slug: string;
  title: string;
  headline?: string;
  summary?: string;
  experience_ids: string[];
  skill_ids: string[];
  project_ids: string[];
};
type CatalogItem = { id: string; label: string };
type TrackStudio = {
  tracks: Track[];
  catalog: Record<"experience" | "skills" | "projects", CatalogItem[]>;
};
type PublishStatus = {
  branch: string;
  publishable_changes: string[];
  unrelated_changes: string[];
  ready: boolean;
};
type SelectionField = "experience_ids" | "skill_ids" | "project_ids";

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const resumeTracks = [
  ["Analytics", "analytics"],
  ["GIS", "gis"],
  ["Game Development", "game-development"],
  ["Technical Art", "technical-art"],
  ["Software & Systems", "software-systems"],
  ["Music Production", "music-production"],
  ["Web Development", "web-development"],
];

export default function App() {
  const baseUrl = import.meta.env.BASE_URL;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [ownerToken, setOwnerToken] = useState("");
  const [trackStudio, setTrackStudio] = useState<TrackStudio | null>(null);
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);

  useEffect(() => {
    if (!isLocal) return;
    fetch(`${apiUrl}/studio/tracks`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error("Could not load résumé tracks")))
      .then(setTrackStudio)
      .catch(error => setMessage(error.message));
  }, [isLocal]);

  function ownerHeaders(includeJson = false) {
    return {
      "X-CareerOS-Owner-Token": ownerToken,
      ...(includeJson ? { "Content-Type": "application/json" } : {}),
    };
  }

  async function responsePayload(response: Response) {
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.detail || "CareerOS Studio request failed");
    return payload;
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] || null);
    setReview(null);
    setMessage("");
  }

  async function reviewFile() {
    if (!file) return;
    setBusy(true);
    const body = new FormData();
    body.append("file", file);
    try {
      const response = await fetch(`${apiUrl}/imports/review`, { method: "POST", body });
      setReview(await responsePayload(response));
      setMessage("Review complete. Nothing has changed yet.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach the local CareerOS API.");
    } finally {
      setBusy(false);
    }
  }

  async function applyReview() {
    if (!review) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/imports/${review.review_id}/apply`, {
        method: "POST",
        headers: ownerHeaders(),
      });
      const payload = await responsePayload(response);
      setReview(null);
      setFile(null);
      setMessage(`Applied and regenerated successfully. Backup: ${payload.backup}`);
      await refreshTracks();
      await refreshPublishStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not apply the reviewed workbook.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshTracks() {
    const response = await fetch(`${apiUrl}/studio/tracks`);
    setTrackStudio(await responsePayload(response));
  }

  function toggleTrackRecord(trackIndex: number, field: SelectionField, recordId: string) {
    setTrackStudio(current => {
      if (!current) return current;
      const tracks = current.tracks.map((track, index) => {
        if (index !== trackIndex) return track;
        const selected = track[field].includes(recordId)
          ? track[field].filter(id => id !== recordId)
          : [...track[field], recordId];
        return { ...track, [field]: selected };
      });
      return { ...current, tracks };
    });
  }

  async function saveTracks() {
    if (!trackStudio) return;
    setBusy(true);
    try {
      const tracks = trackStudio.tracks.map(({ slug, experience_ids, skill_ids, project_ids }) => ({
        slug, experience_ids, skill_ids, project_ids,
      }));
      const response = await fetch(`${apiUrl}/studio/tracks`, {
        method: "PUT",
        headers: ownerHeaders(true),
        body: JSON.stringify({ tracks }),
      });
      const payload = await responsePayload(response);
      setTrackStudio(payload);
      setMessage(`Résumé tracks saved and regenerated. Backup: ${payload.backup}`);
      await refreshPublishStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save résumé tracks.");
    } finally {
      setBusy(false);
    }
  }

  async function refreshPublishStatus() {
    if (!ownerToken) {
      setMessage("Enter the local owner token before checking publish status.");
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/publishing/status`, { headers: ownerHeaders() });
      setPublishStatus(await responsePayload(response));
    } catch (error) {
      setPublishStatus(null);
      setMessage(error instanceof Error ? error.message : "Could not check publish status.");
    }
  }

  async function publishChanges() {
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/publishing/publish`, {
        method: "POST",
        headers: ownerHeaders(),
      });
      const payload = await responsePayload(response);
      setMessage(`Published commit ${payload.commit.slice(0, 7)}. GitHub Pages is rebuilding now.`);
      await refreshPublishStatus();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not publish CareerOS changes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Career knowledge, structured</p>
        <h1 id="page-title">CareerOS</h1>
        <p className="tagline">One source of truth. Infinite ways to tell the story.</p>
        <p className="summary">
          Build focused resumes, portfolio stories, cover letters, and career
          visualizations from a single, durable body of evidence.
        </p>
        <div className="actions">
          <a className="button" href={`${baseUrl}generated/resume/index.html`}>View generated résumé</a>
          <a className="button secondary" href={`${baseUrl}templates/CareerOS_Import_Template.xlsx`}>Download career workbook</a>
          <a className="button secondary" href="https://github.com/dreadstache/careeros#career-data-imports">Import instructions</a>
        </div>
        <div className="track-list" aria-label="Role-specific resumes">
          <p>Choose a focused résumé</p>
          <div>{resumeTracks.map(([label, slug]) => <a key={slug} href={`${baseUrl}generated/resume/${slug}/index.html`}>{label}</a>)}</div>
        </div>
      </section>

      {isLocal && <section className="studio" aria-labelledby="studio-title">
        <p className="eyebrow">Owner workspace</p>
        <h2 id="studio-title">Career Data Studio</h2>
        <p className="studio-copy">Review first, apply locally, tune each résumé lens, then publish only the approved files.</p>

        <label className="token-field">
          <span>Local owner token</span>
          <input type="password" value={ownerToken} onChange={event => setOwnerToken(event.target.value)} autoComplete="off" placeholder="CAREEROS_OWNER_TOKEN" />
        </label>
        {message && <p className="notice" role="status">{message}</p>}

        <div className="studio-step">
          <div className="step-heading"><span>1</span><div><h3>Review and apply workbook</h3><p>Review never writes. Apply uses this exact review and regenerates every résumé.</p></div></div>
          <div className="upload-row">
            <label className="file-picker">
              <span>{file ? file.name : "Choose CareerOS workbook"}</span>
              <input type="file" accept=".xlsx" onChange={chooseFile} />
            </label>
            <button className="button" disabled={!file || busy} onClick={reviewFile}>{busy ? "Working…" : "Review changes"}</button>
          </div>
          {review && <div className="review-panel">
            <div className="summary-grid">
              {(["create", "update", "archive", "errors"] as const).map(key => <div className={`metric ${key}`} key={key}><strong>{review.summary[key]}</strong><span>{key}</span></div>)}
            </div>
            {review.errors.length > 0 && <ul className="errors">{review.errors.map(error => <li key={error}>{error}</li>)}</ul>}
            <div className="change-list">
              {review.changes.length === 0 ? <p>No changes detected. Your workbook matches CareerOS.</p> : review.changes.map(change => <article className="change-card" key={`${change.section}-${change.id}`}><span className={`badge ${change.result}`}>{change.result}</span><div><strong>{change.id}</strong><small>{change.section}</small></div></article>)}
            </div>
            {review.valid && review.changes.length > 0 && <button className="button" disabled={!ownerToken || busy} onClick={applyReview}>Apply reviewed changes & regenerate</button>}
          </div>}
        </div>

        <div className="studio-step">
          <div className="step-heading"><span>2</span><div><h3>Choose résumé evidence</h3><p>Each track stays focused. Check only the experience, skills, and projects that belong.</p></div></div>
          {trackStudio && <div className="track-editor">
            {trackStudio.tracks.map((track, trackIndex) => <details className="track-card" key={track.slug}>
              <summary><strong>{track.title}</strong><span>{track.experience_ids.length} roles · {track.skill_ids.length} skill groups · {track.project_ids.length} projects</span></summary>
              {(["experience", "skills", "projects"] as const).map(section => {
                const field: SelectionField = section === "experience" ? "experience_ids" : section === "skills" ? "skill_ids" : "project_ids";
                return <fieldset key={section}><legend>{section}</legend><div className="check-grid">{trackStudio.catalog[section].map(item => <label key={item.id}><input type="checkbox" checked={track[field].includes(item.id)} onChange={() => toggleTrackRecord(trackIndex, field, item.id)} /><span>{item.label}</span></label>)}</div></fieldset>;
              })}
            </details>)}
            <button className="button" disabled={!ownerToken || busy} onClick={saveTracks}>Save tracks & regenerate</button>
          </div>}
        </div>

        <div className="studio-step">
          <div className="step-heading"><span>3</span><div><h3>Publish approved changes</h3><p>Publishing is allowed only from synchronized <code>main</code> with no unrelated changes.</p></div></div>
          <div className="publish-actions">
            <button className="button secondary" disabled={!ownerToken || busy} onClick={refreshPublishStatus}>Check publish status</button>
            <button className="button" disabled={!publishStatus?.ready || busy} onClick={publishChanges}>Commit & publish to GitHub</button>
          </div>
          {publishStatus && <div className="publish-status">
            <p><strong>Branch:</strong> {publishStatus.branch}</p>
            <p><strong>Ready files:</strong> {publishStatus.publishable_changes.join(", ") || "none"}</p>
            {publishStatus.unrelated_changes.length > 0 && <p><strong>Resolve first:</strong> {publishStatus.unrelated_changes.join(", ")}</p>}
          </div>}
        </div>
      </section>}
    </main>
  );
}
