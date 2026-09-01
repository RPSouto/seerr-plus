# Seerr+ Changelog

## seerr-plus-v1.8.310

- Fix Movie Club scheduled vote saves by inserting candidates with explicit SQL column names.
- Prevent SQLite from receiving candidate rows without `sessionId` when scheduling or editing Movie Club votes.
- Treat only draft, scheduled, and voting sessions as the current editable Movie Club session.
- Keep selected winners in history only, so creating or closing a new vote cannot alter a historical winner.
- Reload created/updated sessions by their own id instead of looking up any current session.
- Fix SQLite curator assignment by calling the database type helper correctly.

## seerr-plus-v1.8.305

- Restore Movie Club history visibility by using a simpler SQLite-safe winner ordering query.
- Keep the Movie Club badge on every film that has won at least once.

## seerr-plus-v1.8.300

- Fix Movie Club winner history ordering by storing when a winner is selected.
- Sort recent Movie Club winners by winner selection time instead of vote creation time.
- Backfill existing Movie Club winners with their creation date as a safe fallback.
- Include the Movie Club winner selection date in the API response.

## seerr-plus-v1.8.295

- Fix Movie Club candidate creation in SQLite by inserting candidates with explicit session/media relation ids.
- Prevent `SQLITE_CONSTRAINT: NOT NULL constraint failed: movie_club_candidate.sessionId` when creating or editing Movie Club votes.

## seerr-plus-v1.8.290

- Add predefined Movie Club themes so administrators and responsible users can generate four random voting candidates from eligible Plex movies.
- Add a new Movie Club random candidate endpoint with manager/curator access checks.
- Prioritize weekly suggestions and interested-user counts while still randomizing themed selections.
- Add English and Portuguese UI strings for the Movie Club theme picker.
- Document the new random Movie Club candidate API route.

## seerr-plus-v1.8.285

- Harden Seerr+ routes by validating request, media, session, issue, candidate, and user ids before querying the database.
- Optimize the Votes endpoint by filtering non-admin removal vote visibility in SQL instead of loading recent sessions and filtering everything in memory.
- Harden the Tautulli stream image proxy so it only accepts internal Plex metadata image paths and cannot be used with arbitrary external URLs.
- Add timeout and response-size limits to Tautulli image fetches to avoid slow or oversized proxy responses.
- Optimize Movie Club manual search by limiting search input/results and checking previous winners in one batch query instead of per result.
- Limit Movie Club free-text fields and selected user/candidate arrays to safer bounds.

## seerr-plus-v1.8.280

- Hide the Movie Club card from the Votes page when the Movie Club voting period has already ended or the session has already moved to winner/history state.

## seerr-plus-v1.8.275

- Add a dedicated Removal Votes notification type so users can enable or disable removal-vote alerts independently.
- Route removal-vote notifications through Web Push, Pushbullet, Pushover, Discord, and email using the correct Seerr+ notification type.
- Add English and Portuguese labels for the new Removal Votes notification setting.

## seerr-plus-v1.8.270

- Remove the extra “You voted keep/remove” text from removal vote cards because the selected vote button already acts as the state indicator.

## seerr-plus-v1.8.265

- Remove the redundant “Removal Votes” helper label from active removal vote cards to keep the mobile layout cleaner.

## seerr-plus-v1.8.260

- Fix the Votes page poster rendering build error by passing the required `CachedImage` image type.

## seerr-plus-v1.8.255

- Further compact the mobile Votes page by turning the Remove/Keep counters into the vote actions.
- Make the poster and title open the media detail page, removing the separate `Open title` button.
- Remove the `Open request` action from vote cards to keep the Votes page focused on voting.
- Add poster artwork to removal vote cards.
- Add accessible labels for the new counter-based vote buttons in English and Portuguese.

## seerr-plus-v1.8.250

- Redesign the Votes page with a mobile-first layout for daily phone usage.
- Make removal vote cards more compact with clearer title wrapping, status labels, opened date, and vote summary counters.
- Turn removal vote actions into full-width touch-friendly buttons on mobile while preserving compact desktop layout.
- Collapse previous/closed removal votes into a discreet history section so active votes stay prominent.
- Shorten English and Portuguese copy for better mobile readability.

## seerr-plus-v1.8.245

- Restrict removal request decision controls in the Issue Details UI to administrators only.
- Keep the backend protection unchanged: approve/reject removal request endpoints continue to require administrator permission.
- Prevent users with request/issue management permissions from seeing `Approve and Remove`, `Reject Removal`, `Start Voting`, or `Close Voting` controls for Seerr+ removal requests unless they are administrators.

## seerr-plus-v1.8.240

- Improve the Votes page layout by separating active removal votes from previous/closed removal votes.
- Add a dedicated historical section for closed removal votes so the active voting area stays focused.
- Resolve fallback `Movie #TMDB_ID` / `Series #TMDB_ID` titles on the Votes page by loading the real media title when needed.
- Add created/opened date information to removal vote cards.
- Update English and Portuguese strings for the refined Votes page.

## seerr-plus-v1.8.235

- Fix the `/api/v1/seerrplus/votes` TypeScript build by explicitly narrowing mapped removal vote sessions before returning them.

## seerr-plus-v1.8.230

- Add a new Votes hub where users can follow Movie Club and removal votes in one place.
- Add Votes to the web and mobile navigation.
- Show active removal votes directly from the movie/series removal menu for invited users.
- Store and display friendly media titles for removal votes instead of `Movie #TMDB_ID` fallbacks.
- Send removal vote notifications to the Votes hub so users land where they can vote.
- Add a migration for removal vote display titles and update English/PT-PT strings.

## seerr-plus-v1.8.225

- Add audience selection when an administrator starts a removal vote from a removal request.
- Let the admin choose between all interested users, selected users, or all users before starting the vote.
- Add a manual user picker to the removal request voting modal.
- Keep the voting API unchanged by sending `audience` and `userIds` to the existing start-vote endpoint.
- Add English and Portuguese translations for the new removal vote audience selector.

## seerr-plus-v1.8.220

- Change the removal flow so users/requesters submit a removal request first instead of immediately starting a vote.
- Keep removal request notifications sent to administrators and interested users through the existing issue notification flow.
- Add administrator controls on removal request details to start a removal vote or close an active removal vote.
- Keep administrator actions available at any time: approve/remove, reject, start voting, or close voting.
- Preserve direct admin-created removal votes from the movie/series page for cases where the admin wants to consult users without waiting for a requester.
- Add API endpoints for starting a vote from an existing removal request and closing an active removal vote.

## seerr-plus-v1.8.215

- Fix the server build for removal vote notifications.
- Stop reading title/poster/overview directly from the internal `Media` entity, which only stores media identifiers and status.
- Keep removal vote notifications linked to the correct movie/series page using the TMDB ID.

## seerr-plus-v1.8.210

- Let administrators choose the audience when opening a removal vote.
- Support removal votes sent to interested users, selected users, or all users.
- Add persisted removal vote participants so only the chosen audience can vote.
- Add admin user selection UI inside the removal modal.
- Update the removal vote API schema to accept `audience` and `userIds`.

## seerr-plus-v1.8.205

- Add Seerr+ removal voting sessions for available movies/series.
- Allow a requester/interested user to open a removal vote instead of only creating a direct admin removal issue.
- Notify interested users when a removal vote starts, linking them back to the title page.
- Let interested users vote to agree with removal or keep the content.
- Keep admins in control: removal votes collect opinions, while final removal still goes through admin approval/direct removal.
- Add SQLite/Postgres migrations for removal vote sessions and votes.

## seerr-plus-v1.8.200

- Redesign the Movie Club page so recent winners are the first highlighted section.
- Add a large spotlight card for the latest Movie Club winner, including poster, synopsis, and vote count.
- Add a compact grid for previous Movie Club winners below the main winner highlight.
- Move the active vote / vote preparation area below the winners section so an ongoing vote appears after the Movie Club history context.

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
