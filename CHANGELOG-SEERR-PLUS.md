# Seerr+ changelog

## seerr-plus-v1.0.1

- Prevent long movie and series names from being compressed into a narrow column by large action/interest controls.
- Keep the release year together and preserve normal word wrapping.
- Move actions to a dedicated row at medium desktop widths and constrain/wrap them on wide displays.

## seerr-plus-v1.0 — stable baseline

- Multiple interested users share one Seerr media request without duplicate Radarr/Sonarr acquisitions.
- Requested-by and participant lists in user and administration views.
- Users can withdraw their interest; empty requests expose an administrator warning.
- Availability emails fan out to all interested users and can be manually resent.
- Available content supports user removal requests with reasons, comments and administrator approval/rejection.
- Approved removals delete the title and files through Radarr/Sonarr.
- Removal controls and emails are limited to administrators or users interested in the matching standard/4K edition.
- Black Plus Edition identity, localized Seerr+ controls and upstream-compatible internal middleware.
- Plex collection synchronization event/adapter scaffold, disabled until an adapter is registered.
- SQLite and PostgreSQL migrations preserve existing Seerr users and requests.
