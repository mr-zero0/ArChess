# Security Notes

## Production requirements

- Set a strong `SECRET_KEY` in the deployment environment.
- Run Flask behind Gunicorn or another production WSGI server.
- Keep `DEBUG` disabled in production.
- Terminate HTTPS at the hosting layer and forward only trusted proxy headers.

## Rate-limit design

The public API is currently read-only and has no authentication or room state. Before online multiplayer endpoints are added, apply limits at the edge or WSGI layer:

- Configuration and health reads: 60 requests per minute per IP.
- Room creation and join attempts: 10 requests per minute per IP.
- Launch or state-changing actions: 120 requests per minute per authenticated player and room.
- Return HTTP 429 with `Retry-After` when a limit is exceeded.
- Use a shared store such as Redis when more than one worker is deployed.
- Log throttled requests without recording secrets or unnecessary personal data.

Revisit these limits when authenticated multiplayer endpoints exist.
