# Canvas LTI 1.3 – Pangram AI Check

Instructors launch this tool from an assignment in Canvas; it fetches student submissions
(online text + .docx/.pdf/.txt uploads) via the Canvas API and scores each with the
[Pangram API](https://docs.pangram.com/api-reference/ai-detection).

## Setup
1. `cp .env.example .env`, fill in values (Pangram key, Canvas URL + API token, secrets).
2. In Canvas: Admin → Developer Keys → + LTI Key → *Paste JSON*, use `canvas-config.json`
   (replace `YOUR_TOOL_URL`). Enable the key, copy its client ID into `CANVAS_CLIENT_ID`.
3. Add the tool to your account/course by client ID (Settings → Apps → + App → By Client ID).
4. `docker compose up --build` (needs a public HTTPS URL, e.g. behind a reverse proxy).

## Notes / TODO
- LTI doesn't expose submission files, so a Canvas API token with read access is used.
  For production, prefer a dedicated service account token or the Canvas Asset Processor
  (Plagiarism Detection Platform) API, which pushes submissions to the tool.
- Student-data/FERPA: submissions are sent to Pangram; get institutional approval first.
- Cache results (Mongo) to avoid re-billing Pangram on re-scans; add per-student detail view
  using Pangram's `windows` for highlighted segments; post results back via LTI AGS.
- Untested against a live Canvas instance.
