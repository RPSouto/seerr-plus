# Seerr+ changelog

## seerr-plus-v1.6.0

- Add an explicit absolute Movie Club link to assignment, voting and result emails.
- Limit candidate selection to a weekly top 10, prioritizing user suggestions and then interested-user count.
- Add a Suggest for Movie Club toggle to available movie pages.
- Store suggestions per user and ISO week, with the ability to withdraw a suggestion.
- Allow suggested available movies to enter the weekly candidate list even when they were not previously requested.
- Fix SQLite `movie_club_curator.sessionId` NOT NULL failures by inserting explicit foreign-key values.
- Keep duplicate responsible-user inserts safe on both SQLite and PostgreSQL.

## seerr-plus-v1.5.0

- Allow administrators to schedule the exact date and time when Movie Club voting starts.
- Keep scheduled sessions private and editable until their start time.
- Start scheduled voting automatically through a persistent 15-second background check.
- Send voting announcement emails when the scheduled session actually becomes public.
- Calculate the one-week deadline preset from the scheduled start time.
- Allow scheduled sessions to be edited or deleted before they begin.
- Persist scheduling and notification state across container restarts on SQLite and PostgreSQL.

## seerr-plus-v1.4.3

- Show the administrator delete control inside the Movie Club editor.
- Allow a draft, active vote or selected session to be removed while it is being edited, so a new vote can be started immediately.

## seerr-plus-v1.4.2

- Fix SQLite unique-constraint failures when saving an unchanged Movie Club responsible user.
- Synchronize responsible users incrementally instead of deleting and reinserting every assignment.
- Ignore concurrent duplicate inserts safely on both SQLite and PostgreSQL.

## seerr-plus-v1.4.1

- Include all interested/requesting users in Film of the Week result emails.
- Improve the subject and body copy for assignment, voting, result and tie-break emails.
- Link the email action button directly to Movie Club when the public application URL is configured.
- Stop displaying an unusable relative `/movie-club` link in the email body.

## seerr-plus-v1.4.0

- Allow administrators to prepare a private Movie Club session with a deadline and assigned responsible users, without choosing candidates.
- Notify newly assigned responsible users by email.
- Let assigned users choose exactly four requested films and open the public vote.
- Keep draft sessions hidden from other users and from the Discover banner.
- Add a one-week deadline preset and a manual date/calendar option for administrators.
- Restrict deadline changes to administrators while responsible users manage film selection.
- Notify all users when a delegated draft becomes an active vote.

## seerr-plus-v1.3.1

- Keep Movie Club candidate cards aligned to equal row heights on desktop.
- Align voting controls at the bottom of each card while preserving the mobile layout.

## seerr-plus-v1.3.0

- Show the Discover Movie Club banner only while a vote is active or a Film of the Week is selected.
- Add a history of the 12 most recent winning films to the Movie Club page.
- Allow administrators to assign responsible users who can curate candidates and resolve a vote.
- Limit each weekly vote to between two and four candidate films.
- Resolve ties by clearing votes, removing the lowest-ranked candidate and extending voting for 24 hours.
- Send email announcements to Seerr users when voting opens, when a winner is selected, and when a tie-break starts.

## seerr-plus-v1.2.0

- Add localized Movie Club interface messages across all Seerr locale files, with native Portuguese translations and English fallback strings.
- Sort eligible and active candidates by interested-user count, highest first.
- Fetch localized TMDB metadata and show a larger synopsis area with an explicit unavailable state.
- Allow administrators to edit candidates, deadline and WhatsApp link, delete a vote, or close it and immediately prepare a new vote.
- Register edit, delete and close operations in the OpenAPI specification.

## seerr-plus-v1.1.2

- Register all Movie Club endpoints in the Seerr OpenAPI specification.
- Prevent the OpenAPI request validator from returning 404 before Movie Club requests reach Express.

## seerr-plus-v1.1.1

- Move Movie Club API routes under the established `/api/v1/seerrplus/movie-club` namespace.
- Update the Movie Club page and Discover highlight to use the corrected API path.

## seerr-plus-v1.1.0

- Add the integrated Movie Club: a sidebar destination and a Discover-page highlight.
- Administrators create a vote from movies that were requested by users and are now available in Plex.
- Add one vote per user, an administrator-selected film of the week and an optional WhatsApp discussion link.
- Add SQLite and PostgreSQL Movie Club migrations.

## seerr-plus-v1.0.5

- Translate the public repository README into English.
- Keep the README focused exclusively on Plus Edition additions compared with the original Seerr.

## seerr-plus-v1.0.4

- Keep the interested-user panel aligned with the start of a wrapped desktop action row instead of pushing it to the far right.
- Add desktop spacing below wrapped controls so they no longer touch the overview boundary.
- Preserve the existing mobile layout and apply the correction consistently to movies and series.

## seerr-plus-v1.0.3

- Replace the upstream-style landing README with a focused Plus Edition project page.
- Document only the functionality added or changed in relation to the original Seerr.
- Add the GitHub repository description, suggested topics and Plex Movie Club announcement text.
- Add an optional helper to configure the GitHub About description and repository topics.

## seerr-plus-v1.0.2

- Align the desktop action toolbar with the title instead of centering it below the poster.
- Keep primary action buttons on the left and the interested-user panel on the right when space permits.
- Preserve the existing responsive mobile layout.

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
