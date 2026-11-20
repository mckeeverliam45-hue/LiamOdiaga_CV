# Liam Odiaga CV

The Render service is built with Docker from the repository root. The app
currently lives in `liamPortfoloo/`. The public homepage does not link to the
admin sign-in. The dashboard is available at `/admin.html`, requires an admin
login, and is marked `noindex`; portfolio edits are stored in the shared
PostgreSQL database so visitors see the updated content.

## Render deployment

Create or sync a Render Blueprint from this repository using `render.yaml`.
This creates the `liamodiaga-cv` Docker web service. If a Static Site already
exists for this repository, replace it with a Docker web service because static
hosting cannot execute the PHP backend.

Create a PostgreSQL database in Render in the same region as the web service,
then set its Internal Database URL as `DATABASE_URL` in the service's
environment. Set `ADMIN_PASSWORD` there to a strong password of at least 12
characters; `ADMIN_USERNAME` defaults to `Mckeever`. On startup, the service
creates the schema and starter content and creates or resets the admin account.
Keep database URLs and passwords in Render's environment settings, never in Git
or chat. Review the selected database plan, cost, and retention before creating
it. See `liamPortfoloo/backend/README.md` for local MySQL setup instructions.
