# Liam Odiaga CV

The Render service is built with Docker from the repository root. The app
currently lives in `liamPortfoloo/`; `Dockerfile` copies only the public site
files and PHP endpoints to Apache's document root. The SQL schema and admin
account creation script remain outside the public directory.

## Render deployment

Create or sync a Render Blueprint from this repository using `render.yaml`.
This creates the `liamodiaga-cv` Docker web service. If a Static Site already
exists for this repository, replace it with a Docker web service because static
hosting cannot execute the PHP backend.

The public pages can load without database credentials, but contact submission
and portfolio editing require a reachable MySQL database. Set `DB_HOST`,
`DB_NAME`, `DB_USER`, `DB_PASS`, and optionally `DB_PORT` in Render's environment
settings, then import `liamPortfoloo/database/digital_cv.sql` into that database.
Use `liamPortfoloo/backend/README.md` to create the admin account. Never commit
database credentials.
