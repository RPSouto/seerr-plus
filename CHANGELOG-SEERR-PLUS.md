# Seerr+ Changelog

## seerr-plus-v1.8.140

- Apply the compact Plex/Tautulli statistics layout to the mobile overlay by removing the extra “Plex Library” modal title.
- Reduce the mobile statistics overlay top spacing while keeping the close button visible.

## seerr-plus-v1.8.135

- Compact the Plex/Tautulli sidebar statistics card by removing the “Plex Library” header.
- Move the refresh action into the “Now streaming” row to reduce vertical spacing near the Movie Club menu item.

## seerr-plus-v1.8.130

- Rename the Movie Club manual search section from “Search a movie manually” to “Add a Movie manually”.
- Update the Portuguese label to “Adicionar filme manualmente”.

## seerr-plus-v1.8.125

- Fix TypeScript build errors in the Movie Club session create/update handlers by explicitly typing de-duplicated media and curator id arrays.

## seerr-plus-v1.8.120

- Fix Movie Club manual movie search by documenting the search route in the OpenAPI route map.
- Allow manually selected Movie Club candidates to be any movie already available in Plex, not only movies from the requested/suggested top 10 list.
- Add visible loading and empty-result feedback for the manual Movie Club movie search.
- Add English and Portuguese strings for the manual Movie Club search feedback.

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
