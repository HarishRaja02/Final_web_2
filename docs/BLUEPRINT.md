# Introlligent — Developer Blueprint

This document captures the structured plan for expanding the Introlligent resume evaluation project into a small ATS-style app with project management, resume scoring, comparisons, and basic analytics.

## Overview

Goal: Provide project-level recruitment workflows where users can create recruitment projects, upload resumes, automatically evaluate them, and surface the top candidates.

Key components:
- Backend: Flask + SQLAlchemy (SQLite for local dev, optional Postgres for production)
- Storage: Local `/uploads/` or cloud (S3/GCS) for resume PDFs
- LLM: existing Groq wrapper for profile generation
- Frontend: existing static JS/CSS; add pages for dashboard, project, compare, and preview

## Database Models (high level)

- Users (email PK, name, totals)
- Projects (project_id, project_name, created_by_email, created_at)
- Resumes (resume_id, project_id, resume_file_path, score, uploaded_at)
- EvaluationLog (log_id, user_email, resume_id, project_id, status, evaluated_at)

See `api/models.py` for SQLAlchemy model scaffolding.

## API Endpoints (suggested)

All endpoints under `/api` namespace; adapt existing routes in `api/index.py`.

- POST /api/projects — create project
- GET /api/projects — list projects for user
- GET /api/projects/<project_id> — project detail (resumes, top-k)
- POST /api/projects/<project_id>/upload — upload one or more resumes (multipart form)
- POST /api/projects/<project_id>/evaluate — trigger evaluation (if not auto)
- POST /api/resumes/<resume_id>/select — mark selected
- POST /api/resumes/<resume_id>/reject — mark rejected
- GET /api/compare?ids=1,2,3 — returns structured comparison payload

## Frontend Pages & UI

1. Dashboard — user stats, recent projects, quick actions
2. New Project — create project form
3. Project View — upload resumes, show top candidates, preview, select/reject, compare
4. Compare View — 2–3 candidate side-by-side

UX notes:
- Allow multi-file upload (client + server)
- Inline PDF preview using PDF.js
- Highlight top 2–3 resumes visually
- Accessible controls (keyboard, focus outlines)

## Implementation Roadmap (phases)

1. Add database models and migrations (SQLAlchemy)
2. Wire simple project creation/listing endpoints
3. Enhance upload route to accept project_id and save file paths
4. Run evaluation pipeline on upload and store scores
5. Add select/reject endpoints and update EvaluationLog
6. Implement frontend pages (dashboard, project, compare) reusing existing components
7. Optional: Add background worker for heavy LLM profile generation

## Local dev tips

- Use `.env` for secrets
- For local file storage, create `uploads/` at project root and add to `.gitignore`
- For production, use S3/GCS and store URLs in DB

## Notes

This blueprint is intentionally incremental and designed to integrate with the current Flask app in `api/index.py`. The included `api/models.py` and `api/init_db.py` provide a minimal starting point.
