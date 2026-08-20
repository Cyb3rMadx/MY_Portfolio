# Render backend

The portfolio now includes a small Node/Express service:

- `POST /api/contact` validates and stores messages in Postgres.
- `GET /api/health` is the Render health check.
- `GET /admin` shows the inbox behind HTTP Basic Auth.
- Optional Resend variables send an email notification after storage.

## Deploy safely

1. Revoke the GitHub token that was pasted into chat. It is compromised and must not be used in a repository, shell command, or environment variable.
2. Push this project using a newly authenticated Git client or GitHub's normal sign-in flow. Never commit `.env` or credentials.
3. In Render, create a Postgres database and a web service from the repository. `render.yaml` documents the service.
4. Set every secret in Render's environment settings: `DATABASE_URL`, `IP_HASH_SALT`, `ADMIN_USER`, `ADMIN_PASSWORD`, and `RESEND_API_KEY`.
5. Visit `/api/health`, then `/admin` with the configured admin credentials.

The backend stores message content, sender name/email, user-agent, referrer, and a salted one-way IP hash. It does not store raw IP addresses. Messages are automatically deleted after 31 days. Update the public privacy wording and retention period before inviting real visitors.

Render's free service can sleep and its local filesystem is not durable, which is why contact data uses Postgres instead of a local JSON or SQLite file.