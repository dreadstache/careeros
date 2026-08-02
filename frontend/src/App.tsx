export default function App() {
  const baseUrl = import.meta.env.BASE_URL;

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
            href="https://github.com/dreadstache/careeros"
          >
            Explore the project
          </a>
        </div>
      </section>
    </main>
  );
}
