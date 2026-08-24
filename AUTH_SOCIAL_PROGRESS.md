# ArChess Authentication, Profiles & Social — Implementation Batch

## Main Task
Replace the guest-only social experience with persistent accounts, rich profiles and direct friend challenges while preserving server-authoritative gameplay.

## Subtasks
- [x] Email/password signup.
- [x] Email/username login.
- [x] Logout and authenticated session cookie.
- [x] Password hashing with Werkzeug.
- [x] Session CSRF token for account/social mutations.
- [x] Google OAuth integration boundary using Authlib and Google OpenID metadata.
- [x] Username uniqueness and validation.
- [x] Default avatar presets.
- [x] Custom HTTPS avatar URL support.
- [x] Profile bio.
- [x] Public/private profile payloads.
- [x] Ranked stats, XP, level and tier presentation data.
- [x] Match-history persistence projection.
- [x] MMR performance graph data.
- [x] Achievements payload foundation.
- [x] Cosmetic ownership/equipped state exposure.
- [x] Friend search.
- [x] Friend requests/accept/decline/block/remove.
- [x] Direct friend challenge creation.
- [x] Challenge accept/decline/cancel.
- [x] Casual/ranked direct-challenge modes.
- [x] Automatic internal match-session creation on challenge acceptance.
- [x] Ranked result → profile match-history projection.
- [x] Auth/profile/social regression tests.
- [x] Dedicated login/profile UI.

## External / release gates
- [ ] Configure Google Cloud OAuth client ID/secret/redirect URI.
- [ ] Production email verification/password-reset provider.
- [ ] Real avatar file-upload storage/CDN.
- [ ] Authenticated-session security review in production.
- [ ] Account deletion/anonymization workflow.

## Verification gate
Python/API tests → browser auth flow → Google OAuth configuration test → social/challenge flow → full CI.

Implemented does not equal verified until the branch CI passes.
