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
  original_slug: string | null;
  title: string;
  headline?: string;
  summary?: string;
  experience_ids: string[];
  skill_ids: string[];
  project_ids: string[];
};
type PublicTrack = Pick<Track, "slug" | "title" | "headline" | "summary">;
type EcosystemDestination = { id: string; label: string; description: string; url: string; status: string };
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
const fallbackTracks: PublicTrack[] = [
  { title: "Analytics", slug: "analytics" },
  { title: "GIS", slug: "gis" },
  { title: "Game Development", slug: "game-development" },
  { title: "Technical Art", slug: "technical-art" },
  { title: "Software & Systems", slug: "software-systems" },
  { title: "Music Production", slug: "music-production" },
  { title: "Web Development", slug: "web-development" },
];
const fallbackDestinations: EcosystemDestination[] = [
  { id: "tech", label: "Tech & Systems", description: "Analytics, GIS, software, and automation.", url: "https://dreadstache.github.io/luccote-portfolio/", status: "live" },
  { id: "three-d", label: "Games, Film & 3D", description: "Interactive models and technical art.", url: "https://vanta-model-atelier.dreadstache.chatgpt.site/", status: "live" },
  { id: "music", label: "Music", description: "Dreadstache releases and production.", url: "https://dreadstache.com/", status: "live" },
  { id: "resumes", label: "Résumé Library", description: "Focused, verified career stories.", url: "https://dreadstache.github.io/careeros/generated/resume/", status: "live" },
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
  const [publicTracks, setPublicTracks] = useState<PublicTrack[]>(fallbackTracks);
  const [destinations, setDestinations] = useState<EcosystemDestination[]>(fallbackDestinations);
  const [removedTracks, setRemovedTracks] = useState<Track[]>([]);
  const [confirmRemovals, setConfirmRemovals] = useState(false);
  const [publishStatus, setPublishStatus] = useState<PublishStatus | null>(null);

  useEffect(() => {
    fetch(`${baseUrl}generated/resume/tracks.json`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(payload => Array.isArray(payload.tracks) && setPublicTracks(payload.tracks))
      .catch(() => undefined);
  }, [baseUrl]);

  useEffect(() => {
    fetch(`${baseUrl}generated/ecosystem.json`, { cache: "no-store" })
      .then(response => response.ok ? response.json() : Promise.reject())
      .then(payload => Array.isArray(payload.destinations) && setDestinations(payload.destinations))
      .catch(() => undefined);
  }, [baseUrl]);

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

  function updateTrack(trackIndex: number, field: "slug" | "title" | "headline" | "summary", value: string) {
    setTrackStudio(current => current && ({
      ...current,
      tracks: current.tracks.map((track, index) => index === trackIndex ? { ...track, [field]: value } : track),
    }));
  }

  function addTrack() {
    setTrackStudio(current => {
      if (!current) return current;
      let sequence = current.tracks.length + 1;
      let slug = `new-resume-track-${sequence}`;
      while (current.tracks.some(track => track.slug === slug)) {
        slug = `new-resume-track-${++sequence}`;
      }
      return {
        ...current,
        tracks: [...current.tracks, {
          slug,
          original_slug: null,
          title: "New Résumé Track",
          headline: "",
          summary: "",
          experience_ids: [],
          skill_ids: [],
          project_ids: [],
        }],
      };
    });
  }

  function moveTrack(trackIndex: number, direction: -1 | 1) {
    setTrackStudio(current => {
      if (!current) return current;
      const destination = trackIndex + direction;
      if (destination < 0 || destination >= current.tracks.length) return current;
      const tracks = [...current.tracks];
      [tracks[trackIndex], tracks[destination]] = [tracks[destination], tracks[trackIndex]];
      return { ...current, tracks };
    });
  }

  function removeTrack(trackIndex: number) {
    if (!trackStudio || trackStudio.tracks.length === 1) return;
    const track = trackStudio.tracks[trackIndex];
    if (track.original_slug) setRemovedTracks(removed => [...removed, track]);
    setConfirmRemovals(false);
    setTrackStudio({ ...trackStudio, tracks: trackStudio.tracks.filter((_, index) => index !== trackIndex) });
  }

  function restoreTrack(track: Track) {
    setTrackStudio(current => current && ({ ...current, tracks: [...current.tracks, track] }));
    setRemovedTracks(current => current.filter(item => item.original_slug !== track.original_slug));
    setConfirmRemovals(false);
  }

  async function saveTracks() {
    if (!trackStudio) return;
    setBusy(true);
    try {
      const response = await fetch(`${apiUrl}/studio/tracks`, {
        method: "PUT",
        headers: ownerHeaders(true),
        body: JSON.stringify({
          tracks: trackStudio.tracks,
          removed_slugs: removedTracks.map(track => track.original_slug).filter(Boolean),
          confirm_removals: confirmRemovals,
        }),
      });
      const payload = await responsePayload(response);
      setTrackStudio(payload);
      setPublicTracks(payload.tracks);
      setRemovedTracks([]);
      setConfirmRemovals(false);
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
        <details className="ecosystem-switcher">
          <summary>Explore Luc's work <span aria-hidden="true">▾</span></summary>
          <div><p><strong>Luc Cote</strong><span>One practice, several ways in.</span></p>{destinations.filter(destination => destination.status === "live").map(destination => <a key={destination.id} href={destination.url} aria-current={destination.id === "resumes" ? "page" : undefined}><strong>{destination.label}</strong><span>{destination.description}</span></a>)}</div>
        </details>
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
          <div>{publicTracks.map(track => <a key={track.slug} href={`${baseUrl}generated/resume/${track.slug}/index.html`}>{track.title.replace(/\s+R[eé]sum[eé]$/i, "")}</a>)}</div>
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
          <div className="step-heading"><span>2</span><div><h3>Build résumé tracks</h3><p>Add, rename, reorder, and focus each résumé on the evidence that belongs.</p></div></div>
          {trackStudio && <div className="track-editor">
            {trackStudio.tracks.map((track, trackIndex) => <details className="track-card" key={track.original_slug || track.slug}>
              <summary><strong>{track.title}</strong><span>{track.experience_ids.length} roles · {track.skill_ids.length} skill groups · {track.project_ids.length} projects</span></summary>
              <div className="track-controls">
                <button className="mini-button" disabled={trackIndex === 0} onClick={() => moveTrack(trackIndex, -1)}>Move up</button>
                <button className="mini-button" disabled={trackIndex === trackStudio.tracks.length - 1} onClick={() => moveTrack(trackIndex, 1)}>Move down</button>
                <button className="mini-button danger" disabled={trackStudio.tracks.length === 1} onClick={() => removeTrack(trackIndex)}>Remove</button>
              </div>
              <div className="track-fields">
                <label><span>URL slug</span><input value={track.slug} onChange={event => updateTrack(trackIndex, "slug", event.target.value)} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
                <label><span>Title</span><input value={track.title} onChange={event => updateTrack(trackIndex, "title", event.target.value)} /></label>
                <label className="wide"><span>Headline</span><input value={track.headline || ""} onChange={event => updateTrack(trackIndex, "headline", event.target.value)} /></label>
                <label className="wide"><span>Summary</span><textarea rows={3} value={track.summary || ""} onChange={event => updateTrack(trackIndex, "summary", event.target.value)} /></label>
              </div>
              {(["experience", "skills", "projects"] as const).map(section => {
                const field: SelectionField = section === "experience" ? "experience_ids" : section === "skills" ? "skill_ids" : "project_ids";
                return <fieldset key={section}><legend>{section}</legend><div className="check-grid">{trackStudio.catalog[section].map(item => <label key={item.id}><input type="checkbox" checked={track[field].includes(item.id)} onChange={() => toggleTrackRecord(trackIndex, field, item.id)} /><span>{item.label}</span></label>)}</div></fieldset>;
              })}
            </details>)}
            {removedTracks.length > 0 && <div className="removal-panel">
              <strong>Tracks queued for removal</strong>
              {removedTracks.map(track => <div key={track.original_slug}><span>{track.title}</span><button className="mini-button" onClick={() => restoreTrack(track)}>Restore</button></div>)}
              <label><input type="checkbox" checked={confirmRemovals} onChange={event => setConfirmRemovals(event.target.checked)} /> I understand their generated pages will be removed.</label>
            </div>}
            <div className="track-actions">
              <button className="button secondary" onClick={addTrack}>Add résumé track</button>
              <button className="button" disabled={!ownerToken || busy || (removedTracks.length > 0 && !confirmRemovals)} onClick={saveTracks}>Save tracks & regenerate</button>
            </div>
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
