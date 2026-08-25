# ArChess Privacy Notes

## Data kept

ArChess currently stores a guest identifier, gameplay/ranked statistics, progression state, cosmetic ownership and match/room state required to operate the game.

Telemetry stores an irreversible SHA-256 hash of the guest identifier rather than the raw identifier. Telemetry payloads are limited to gameplay/operational fields and should not contain free-form personal data.

## Retention

Production operators should retain telemetry only for the shortest period needed for product diagnostics and aggregate analysis. Match history and profile data should have a documented retention/deletion policy before public launch.

## User controls

The public release must provide authenticated profile access and a user-requested data deletion flow before collecting any account-level personal data.

## Security

Production must use a non-default secret, HTTPS, restricted analytics credentials and a production database with backups and access controls.
