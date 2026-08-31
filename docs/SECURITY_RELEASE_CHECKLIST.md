# ArChess Security / Release Checklist

## Implemented controls

- Server-authoritative multiplayer state and physics.
- Client-authoritative state writes rejected during authoritative play.
- Request-size limits.
- Rate limiting.
- Security headers.
- Production secret requirement.
- Privacy-safe telemetry actor hashing.
- Operator-only analytics endpoint.
- No analytics secret exposed to browser code.
- Docker/Gunicorn production baseline.

## Human/release gates

- Configure a real authentication/session provider and review session rotation, CSRF, and account recovery.
- Perform dependency vulnerability review before external exposure.
- Complete asset/license/trademark review.
- Confirm retention/deletion obligations for deployed telemetry and user data.
- Enable HTTPS at the ingress/proxy layer.
- Configure backups, rollback, monitoring, and incident response.
