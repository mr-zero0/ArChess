# ArChess Deployment Baseline

## Container

The repository now includes a Python 3.12 Docker image with Gunicorn, a healthcheck and configurable worker/thread/timeout settings.

Build:

```bash
docker build -t archess:dev .
```

Run:

```bash
docker run --rm -p 8000:8000 \
  -e SECRET_KEY="replace-me" \
  -e DATABASE_URL="sqlite:///prod.db" \
  -e TELEMETRY_SALT="replace-me" \
  -e ANALYTICS_API_KEY="replace-me" \
  archess:dev
```

## Production requirements before public exposure

- Use a managed or durable database instead of the local SQLite default.
- Run migrations before accepting traffic.
- Set a unique `SECRET_KEY` and `TELEMETRY_SALT`.
- Keep `ANALYTICS_API_KEY` private and never expose it to browser code.
- Terminate HTTPS at the ingress/proxy layer.
- Configure backups, rollback and health monitoring.
- Keep analytics access restricted to operators.

This file describes the reproducible application baseline; actual zero-cost provider choice and external deployment verification remain release gates.
