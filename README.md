# FilmMetrics — Rating-Based Movie Tracking System

A small dynamic web app to track movies/series you're watching, rate them, and auto-surface your favorites.
Built for CCA2 — Cloud Computing and DevOps — to demonstrate Git, automated testing, Docker, and a GitHub Actions CI/CD pipeline deploying to Render.

## Features

* Home page lists all movies, server-rendered from in-memory data.
* Form to add a movie (`POST /movies`) with title, genre, status, rating — validated (rating must be 0-10).
* **Top Picks**: any movie rated 8+ is automatically surfaced in its own section.
* Filter by genre or status (`?genre=\&status=`).
* JSON API: `GET /api/movies`, `GET /api/top-picks`.
* Health check: `GET /health`.
* Footer shows the live commit ID (`RENDER\_GIT\_COMMIT`).

## Run locally

```bash
npm install
npm test
npm run lint
npm start
# open http://localhost:3000
```

## Run with Docker

```bash
docker build -t filmmetrics .
docker run -p 3000:3000 filmmetrics
```

## Pipeline

```
Git push -> Lint -> Test -> Docker Build + Smoke Test -> Deploy (main only) -> Live site
```

* **Lint + Test**: run on every push and pull request.
* **Build**: Docker image is built and smoke-tested (`/health` must respond).
* **Deploy**: only runs on pushes to `main`, after build succeeds — triggers a Render deploy hook.
* **Verify**: live URL is opened and the footer commit ID is checked against the latest green run.

## Links

* Repository: *add after pushing to GitHub*
* Live application: *add after deploying to Render*
* *Deployed via CI/CD pipeline.*

