# Seerr+ v1.8.30

Current release identifier: `seerr-plus-v1.8.30`.

See [FEATURES.md](./FEATURES.md) for the complete feature set and
[PRIVATE_GIT.md](./PRIVATE_GIT.md) for the one-command private release flow.

This layer extends Seerr v3.4.1 while keeping the upstream request and
Radarr/Sonarr workflow authoritative.

## Request interests

`MediaRequest.requestedBy` remains the original owner. Seerr+ adds
`MediaRequestParticipant`, a unique `(requestId, userId)` association. The
migration seeds every existing request owner into the participant table.

When another user requests the same active movie, Seerr returns the existing
request after recording that user's interest. It does not create another
`MediaRequest` and therefore does not trigger another Radarr request. TV
requests follow the same rule for seasons already covered by active requests;
only genuinely new seasons continue through the normal Sonarr workflow.

Joining an existing acquisition does not consume quota. Creating a new movie
or adding new TV seasons keeps the upstream permission, quota, approval, and
override behavior.

## API

All routes require normal Seerr authentication.

- `GET /api/v1/seerrplus/requests/:id`
- `GET /api/v1/seerrplus/requests/:id/users`
- `POST /api/v1/seerrplus/requests/:id/users` with optional `{ "userId": 2 }`
- `DELETE /api/v1/seerrplus/requests/:id/users/:userId`
- `GET /api/v1/seerrplus/media/:mediaId/requesters`

A user can add or remove their own interest. Acting for another user requires
`MANAGE_REQUESTS` or `MANAGE_USERS`. The original requester cannot be removed;
the upstream request must be reassigned or deleted through the core workflow.

## Plex collection sync scaffold

The internal event `request.interest.added` is emitted for new interests. A
future Plex implementation registers a `PlexCollectionSyncAdapter` through
`registerPlexCollectionSyncAdapter()` and maps the Seerr media record to the
correct Plex library item/rating key.

Set `SEERR_PLUS_PLEX_COLLECTION_SYNC=true` only after registering an adapter.
Until then the feature is disabled by default and, if explicitly enabled,
logs a warning without changing Plex.

Suggested collection naming is `Requested • <display name>`. The adapter is
deliberately isolated so collection policy and Plex item resolution can evolve
without changing Seerr's acquisition path.

## Upgrade notes

The code is packaged as a patch against commit
`69f73a6f1486fdb51b8ddae9a94a8dfb629f461c` (tag `v3.4.1`). For a later Seerr
version, rebase the patch and regenerate both database migrations if the
upstream entity schema has changed.
