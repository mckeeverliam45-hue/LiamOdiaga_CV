# Liam Odiaga CV

The Render service is built with Docker from the repository root. The app
currently lives in `liamPortfoloo/`; `Dockerfile` copies only the public site
files and PHP endpoints to Apache's document root. The admin dashboard page,
styles, script, setup guide, SQL schema, and account creation script are not
included in the public image. Use the local Laragon site for admin access.

## Render deployment

Create or sync a Render Blueprint from this repository using `render.yaml`.
This creates the `liamodiaga-cv` Docker web service. If a Static Site already
exists for this repository, replace it with a Docker web service because static
hosting cannot execute the PHP backend.

The public pages can load without database credentials, but contact submission
and dynamic portfolio content require a reachable MySQL database. Set `DB_HOST`,
`DB_NAME`, `DB_USER`, `DB_PASS`, and optionally `DB_PORT` in Render's environment
settings, then import `liamPortfoloo/database/digital_cv.sql` into that database.
Manage portfolio edits through the local Laragon admin dashboard. Never commit
database credentials.
