# Seerr+ Changelog

## seerr-plus-v1.8.115

- Close the mobile Plex streams/statistics overlay when a user taps a current-stream cover that opens the matching Seerr movie or series page.

## seerr-plus-v1.8.110

- Make current Plex stream covers in the sidebar/mobile stats panel clickable when the streamed item can be matched to a Seerr movie or series.
- Resolve stream links from Tautulli/Plex rating keys to internal Seerr `/movie/...` and `/tv/...` pages so users can open the synopsis/details directly.
- Remove Requests from the main web sidebar; Requests remains available from the user menu and mobile navigation.
- Document the current-stream `pageUrl` field in the Seerr+ OpenAPI route map.

## seerr-plus-v1.8.105

- Move Issues out of the main web sidebar to keep navigation cleaner.
- Add Issues to the user avatar dropdown with the same issue permissions.
- Add English and Portuguese labels for the new user dropdown Issues item.

## seerr-plus-v1.8.100

- Fix Tautulli stream poster images returning 404 by documenting `/api/v1/tautulli-stats/stream-image` in the OpenAPI route map.
- Document the `currentStreams` array returned by `/api/v1/tautulli-stats`.

## seerr-plus-v1.8.95

- Fix Portuguese singular/plural strings for interested-user counters.
- Automatically processes Movie Club results when a closed vote is read by the app.
- Starts scheduled Movie Club votes automatically when their start time is reached.
- Adds a Movie Club vote title/theme field.
- Adds manual movie search for administrators when creating or editing a Movie Club vote.
- Warns when a manually selected Movie Club candidate has already won before.
- Shows current Plex streams as poster covers above sidebar Plex statistics.
- Adds a mobile Plex streams/statistics overlay with an active stream count badge.
- Adds an administrator action to reset a user's available request quota without deleting request history.
- Adds a hidden Tautulli image proxy route so current stream posters do not expose the Tautulli API key.
