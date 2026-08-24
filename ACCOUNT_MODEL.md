# ArChess Identity / Account Model

## Current model

ArChess uses a persistent guest identity backed by the `User` record. The browser stores the guest identifier locally and the server persists ranked/progression/match data against it.

## Production authentication adapter

The application should keep the current User model as the domain profile and attach an external authenticated principal through a provider-specific `auth_subject` field. No provider is hard-coded into the game domain.

## Required production guarantees

- Authentication/session rotation is handled by the identity provider.
- Authorization never trusts a browser-supplied user ID alone.
- Account deletion must remove or anonymize personal profile data and clear room/queue state.
- Telemetry uses irreversible actor hashes and must follow the deployed retention policy.

Until an authentication provider is selected, the guest flow remains the supported development/alpha identity mechanism.
