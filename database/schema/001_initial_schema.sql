PRAGMA foreign_keys = ON;

CREATE TABLE people (
    person_id INTEGER PRIMARY KEY,
    display_name TEXT NOT NULL,
    professional_title TEXT,
    biography TEXT
);

CREATE TABLE companies (
    company_id INTEGER PRIMARY KEY,
    company_name TEXT NOT NULL UNIQUE,
    industry TEXT
);

CREATE TABLE employment (
    employment_id INTEGER PRIMARY KEY,
    person_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    role_title TEXT NOT NULL,
    start_date TEXT,
    end_date TEXT,
    summary TEXT,
    FOREIGN KEY (person_id) REFERENCES people(person_id),
    FOREIGN KEY (company_id) REFERENCES companies(company_id)
);

CREATE TABLE projects (
    project_id INTEGER PRIMARY KEY,
    project_name TEXT NOT NULL,
    project_type TEXT,
    summary TEXT,
    public_url TEXT
);

CREATE TABLE skills (
    skill_id INTEGER PRIMARY KEY,
    skill_name TEXT NOT NULL UNIQUE,
    category TEXT,
    proficiency TEXT
);

CREATE TABLE technologies (
    technology_id INTEGER PRIMARY KEY,
    technology_name TEXT NOT NULL UNIQUE,
    category TEXT
);

CREATE TABLE project_skills (
    project_id INTEGER NOT NULL,
    skill_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, skill_id),
    FOREIGN KEY (project_id) REFERENCES projects(project_id),
    FOREIGN KEY (skill_id) REFERENCES skills(skill_id)
);

CREATE TABLE music_tracks (
    track_id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    release_date TEXT,
    genre TEXT,
    bpm INTEGER,
    musical_key TEXT,
    daw TEXT,
    spotify_url TEXT,
    youtube_url TEXT,
    production_notes TEXT
);
