# Seerr+ Changelog

## seerr-plus-v1.8.195

- Add browser Web Push delivery for Seerr+ Movie Club notifications.
- Open `/movie-club` directly from Movie Club browser notifications.
- Show the Movie Club notification type in user Web Push notification settings.
- Keep notification text localized per user when possible, with Portuguese for PT users and English fallback.
- Support poster images in Movie Club web push payloads when a highlighted movie is available.

## seerr-plus-v1.8.190

- Fix Movie Club vote creation failing with `request/body must NOT have additional properties` by allowing the vote title in the API schema.
- Add explicit Movie Club draft saving so an administrator can save an incomplete vote setup without opening voting.
- Keep drafts visible to assigned responsible users so they can choose or edit the four films before voting opens.
- Allow responsible users to use manual movie search while editing an assigned draft/session.

## seerr-plus-v1.8.185

- Align the sidebar Now Streaming card width with the Seerr Stable card by matching the same effective side margins.
- Add right-side spacing to the icon-only “I’m Interested” button so the remove action no longer touches it.

## seerr-plus-v1.8.180

- Compact the sidebar Now Streaming section so it visually aligns with the Seerr Stable card width.
- Reduce the Now Streaming card padding and poster width to avoid crowding the sidebar.
- Fix the icon-only “I’m Interested” button to use the same 54x38px dimensions as the adjacent action buttons.

## seerr-plus-v1.8.175

- Improve the Now Streaming Plex/Tautulli covers for TV episodes.
- Prefer the series poster/cover when a stream is an episode instead of showing the episode thumbnail.

## seerr-plus-v1.8.170

- Compact the “I’m Interested” action into an icon-only button.
- Match its width, height, and spacing with the adjacent icon action buttons such as remove and settings.
- Keep the original label available as the button tooltip/accessibility label.

## seerr-plus-v1.8.165

- Remove the requester avatar from the public requester badge so the requester name has more room.
- Keep the badge aligned with the existing “Available” badge by using the same green background and fixed dimensions.

## seerr-plus-v1.8.160

- Match the public requester badge background color with the existing “Available” badge.
- Set the requester badge to the same fixed height and width as the availability badge while preserving the mobile-only second row layout.

## seerr-plus-v1.8.155

- Remove the requester icon from the public requester badge.
- Let the requester badge use the same vertical sizing as the standard availability badge while showing only the requester avatar/name.

## seerr-plus-v1.8.150

- Compact the public requester badge to match the height of the existing availability badges.
- Remove the “Requested by” label from the badge, leaving only the requester icon and user names.
- Force the requester badge onto its own row on mobile while keeping it inline on desktop.

## seerr-plus-v1.8.145

- Add a user privacy setting to opt in to sharing requests publicly.
- Add a “Requested by” badge on available movie and series detail pages.
- Show only users who opted in to public request sharing.
- Add a Seerr+ public requesters API endpoint and OpenAPI documentation.
- Add SQLite and PostgreSQL migrations for the new user setting.

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
