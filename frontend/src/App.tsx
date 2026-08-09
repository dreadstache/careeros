import { ChangeEvent, useState } from "react";

type Change = { section: string; id: string; result: "create" | "update" | "archive" };
type Review = {
  valid: boolean;
  summary: Record<"create" | "update" | "archive" | "errors", number>;
  errors: string[];
  changes: Change[];
};
const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function App() {
  const baseUrl = import.meta.env.BASE_URL;
  const isLocal = ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const [file, setFile] = useState<File | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const resumeTracks = [["Analytics", "analytics"], ["GIS", "gis"], ["Game Development", "game-development"], ["Technical Art", "technical-art"], ["Software & Systems", "software-systems"], ["Music Production", "music-production"], ["Web Development", "web-development"]];

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
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.detail || "Import review failed");
      setReview(payload);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not reach the local CareerOS API.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Career knowledge, structured</p>
        <h1 id="page-title">CareerOS</h1>
        <p className="tagline">
          One source of truth. Infinite ways to tell the story.
        </p>
        <p className="summary">
          Build focused resumes, portfolio stories, cover letters, and career
          visualizations from a single, durable body of evidence.
        </p>
        <div className="actions">
          <a className="button" href={`${baseUrl}generated/resume/index.html`}>
            View generated résumé
          </a>
          <a
            className="button secondary"
            href={`${baseUrl}templates/CareerOS_Import_Template.xlsx`}
          >
            Download career workbook
          </a>
          <a className="button secondary" href="https://github.com/dreadstache/careeros#career-data-imports">
            Import instructions
          </a>
        </div>
        <div className="track-list" aria-label="Role-specific resumes">
          <p>Choose a focused résumé</p>
          <div>{resumeTracks.map(([label, slug]) => <a key={slug} href={`${baseUrl}generated/resume/${slug}/index.html`}>{label}</a>)}</div>
        </div>
      </section>
      {isLocal && <section className="studio" aria-labelledby="studio-title">
        <p className="eyebrow">Owner workspace</p>
        <h2 id="studio-title">Import Studio</h2>
        <p className="studio-copy">Upload your edited workbook and preview every proposed change. Review never alters CareerOS.</p>
        <div className="upload-row">
          <label className="file-picker">
            <span>{file ? file.name : "Choose CareerOS workbook"}</span>
            <input type="file" accept=".xlsx" onChange={chooseFile} />
          </label>
          <button className="button" disabled={!file || busy} onClick={reviewFile}>{busy ? "Reviewing…" : "Review changes"}</button>
        </div>
        {message && <p className="notice">{message}</p>}
        {review && (
          <div className="review-panel">
            <div className="summary-grid">
              {(["create", "update", "archive", "errors"] as const).map(key => (
                <div className={`metric ${key}`} key={key}><strong>{review.summary[key]}</strong><span>{key}</span></div>
              ))}
            </div>
            {review.errors.length > 0 && <ul className="errors">{review.errors.map(error => <li key={error}>{error}</li>)}</ul>}
            <div className="change-list">
              {review.changes.length === 0 ? <p>No changes detected. Your workbook matches CareerOS.</p> : review.changes.map(change => (
                <article className="change-card" key={`${change.section}-${change.id}`}>
                  <span className={`badge ${change.result}`}>{change.result}</span>
                  <div><strong>{change.id}</strong><small>{change.section}</small></div>
                </article>
              ))}
            </div>
            {review.valid && review.changes.length > 0 && <p className="next-step">Looks right? Run the documented <code>apply</code> command locally. One-click approval comes after owner authentication.</p>}
          </div>
        )}
      </section>}
    </main>
  );
}
