# Seerr+ v1.0 features

## Shared request interests

One upstream `MediaRequest` remains authoritative. Additional users are stored
as participants, so joining an existing request does not create another
Radarr/Sonarr acquisition or consume quota.

The original requester and interested users are visible in media, request and
administration views. Users can withdraw only their own interest. An empty
participant list is surfaced to administrators before deleting the underlying
request.

## Availability notifications

When Plex/Seerr marks a completed request available, the notification is sent
once to every interested user whose Media Available preference is enabled.
Administrators can explicitly resend availability emails for older content.

## Removal workflow

Administrators can start removal workflows for every managed edition.
Non-administrators can request removal only for an available standard or 4K
edition in which they participate. The API enforces the same rule as the UI.

Removal requests support Free Space, No Interest and Other reasons. Only an
administrator can approve or reject them. Approval removes the content and
files through the configured Radarr/Sonarr server.

Creation, comments, resolution and reopening notifications are delivered only
to administrators and users interested in the matching edition, subject to
their Issue notification preferences.

## Plus identity and localization

The interface uses the black Plus identity to distinguish it from
upstream Seerr. New controls have locale keys in every Seerr catalog, with
complete Portuguese and English strings and English fallback strings in the
remaining catalogs.

## Read-only Plex library statistics

Every authenticated user can see active streams and the combined movie and
series totals in the sidebar. Seerr+ reads these values from the configured
Tautulli API, refreshes them automatically every minute, and provides a manual
statistics refresh button. These calls never scan or update the Plex library.

The panel displays the relative time of the last successful read. Server-side
caching limits Tautulli load, and the last values remain visible if a temporary
API failure occurs.

## Plex collection sync extension point

The internal `request.interest.added` event and
`PlexCollectionSyncAdapter` keep future Plex collection logic isolated from
the acquisition path. The scaffold performs no Plex mutations unless an
adapter is registered and `SEERR_PLUS_PLEX_COLLECTION_SYNC=true` is set.

## Upstream compatibility

Seerr v3.4.1 remains the base. Seerr+ is contained in entities, migrations,
routes, subscribers, middleware helpers and frontend components that can be
rebased independently when upgrading upstream.
