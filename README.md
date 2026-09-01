# Seerr+

Seerr+ is a private Plex Movie Club edition of Seerr focused on community requests, shared interests, Movie Club voting, and lightweight Plex/Tautulli visibility.

This fork keeps the original Seerr request flow as intact as possible and adds Seerr+ features around it:

- Multiple users can show interest in the same media request without creating duplicate Radarr/Sonarr requests.
- Interested users can receive availability/removal/Movie Club notifications.
- Movie Club lets the community vote on requested movies already available in Plex.
- Movie Club supports scheduled voting, responsible users, vote themes, manual candidate search, winner history, and winner badges.
- Plex/Tautulli sidebar statistics show active streams, movie count, and series count without forcing library updates.
- Mobile users get a compact Plex streams/statistics overlay.
- Admins can manage interested users, removal requests, Movie Club votes, and reset a user's available request quota.
- Removal requests notify admins and interested users first; admins can then remove, reject, start a community vote, or close that vote at any time.
- Users can opt in to publicly showing that they requested available media.

<<<<<<< HEAD
Current Seerr+ release: `seerr-plus-v1.8.195`.

## What Plus adds

### Shared requests and interests

- Several users can register interest in the same movie or series.
- A series interest covers every active request for its requested seasons and
  is displayed as one deduplicated list on the series page.
- Seerr still creates only one acquisition request in Radarr or Sonarr.
- Media and administration pages show the original requester and all interested
  users.
- Long participant lists stay compact: Manage Movie uses an expandable,
  scrollable management panel, while movie pages show three users followed by
  an “and N more” control.
- Users can withdraw their own interest without affecting other participants.
- When the last interested user leaves, administrators receive a warning before
  the underlying request can be removed.
- Existing Seerr requests are migrated into the participant model without
  losing their original requester.

### Availability notifications

- Every interested user can receive the Media Available email when a title is
  detected in Plex or manually marked as available.
- Each user's existing Seerr email notification preference is respected.
- Administrators can resend an availability notification from the interface.
- Delivery logging helps administrators confirm whether the mail server
  accepted each notification.

### Removal workflow

- Interested users can request removal after a title becomes available.
- Removal reasons include **Free Space**, **No Longer Interested**, and a custom
  explanation.
- Administrators can approve, reject, comment on, or reopen a removal request.
- Administrators can request removal for any managed title and remove an entire
  title directly.
- Approval can remove the title and its files from the associated Radarr or
  Sonarr server.
- Buttons and email recipients use the same permission rules: administrators
  can manage all media, while regular users see removal controls only for media
  in which they participate.
- Standard and 4K editions are handled independently.

### Movie Club

- Users can suggest any movie already available in Plex for the current week.
- Suggestions can be withdrawn and reset with the new week, beginning on Monday
  in UTC.
- The candidate picker displays a weekly top 10, prioritizing community
  suggestions and then the number of interested users.
- An administrator can choose two to four candidates directly or assign one or
  more responsible users to choose exactly four films.
- Voting can start immediately or at a scheduled date and time.
- The voting deadline can use the one-week preset or a custom date and time.
- Scheduled votes remain private and editable until they open automatically.
- Each user has one vote and can change it while voting is open.
- Requester identities remain hidden during candidate preparation and voting;
  only anonymous interest counts are shown.
- Administrators can edit or delete a session in any state and start again when
  necessary.
- The result identifies the Film of the Week and the users who originally
  requested it.
- In a tie, votes are cleared, the lowest-ranked candidate is removed, and the
  vote is extended for another 24 hours.
- The Movie Club page includes recent winners and an optional WhatsApp group
  link for the discussion.
- Assignment, voting, result, and tie-break emails contain a direct link to the
  Movie Club page.
- Movie Club emails include poster artwork, release dates, synopses, vote
  counts, and direct links to each film page when the public application URL is
  configured.
- Movie Club email content is sent in Portuguese for users whose selected
  locale starts with `pt`; all other users receive English.
- Core Seerr email templates follow the same rule for common labels and Media
  Available copy, using PT Portugal for `pt*` locales and English as fallback.
- Each user can enable or disable Movie Club alerts in their personal Email,
  Discord, Pushbullet, and Pushover notification settings.
- The Discover banner appears only when a vote is active or a Film of the Week
  has been selected.

### Plex library statistics

- Every authenticated user can see active streams and the total number of
  movies and series in the sidebar.
- Values are read from the existing Tautulli integration and combine multiple
  Plex libraries of the same type.
- Statistics refresh automatically every minute and can also be refreshed
  manually without starting a Plex scan or a Seerr library job.
- The panel shows when the last successful update occurred and retains the last
  values if Tautulli is temporarily unavailable.

### Plus interface

- A black visual identity distinguishes Plus from upstream Seerr.
- The sidebar and application branding display **Plus**.
- New controls are responsive on desktop and mobile.
- New interface messages are available in all Seerr locale catalogs, with
  native Portuguese and English text and English fallback text elsewhere.

### Extension layer

- Seerr+ functionality is isolated in entities, migrations, routes,
  subscribers, internal helpers, and frontend components.
- A Plex collection synchronization adapter is scaffolded for future use and is
  disabled unless explicitly configured.
- SQLite and PostgreSQL migrations preserve existing Seerr users, requests,
  settings, and media data.

## How shared acquisition works

```text
One title in Seerr
        |
One request in Radarr or Sonarr
        |
Multiple interested Plex users
        |
Shared availability, voting, and removal decisions
```

Joining an existing request never creates a duplicate Radarr or Sonarr
acquisition.

## Docker deployment

Build the image from the Seerr+ source checkout:

```bash
cd ~/Docker/Seerr-Plus

sudo docker build --no-cache \
  --build-arg COMMIT_TAG=seerr-plus-v1.8.50 \
  -t local/seerr-plus:1.8.50 \
  -t local/seerr-plus:3.4.1 .

cd ~/Docker/Seerr-Plus-Deploy
sudo docker compose up -d --force-recreate
```

Keep the existing Seerr configuration volume mounted at `/app/config`. The
application runs the required SQLite or PostgreSQL migrations during startup.

For links in Movie Club emails, configure Seerr's public application URL, for
example:

```text
https://seerr.example.com
```

## Versioning

Seerr+ releases use the `seerr-plus-vMAJOR.MINOR.PATCH` format. The `PATCH`
number must be a multiple of 5 (for example `1.8.5`, `1.8.10`, or `1.9.0`).
Release branches and annotated Git tags use the same name. The release script
enforces this convention.

To publish the current checkout to the private Seerr+ remote:

```bash
bash scripts/seerr-plus-release.sh seerr-plus-v1.8.50
```

## Upstream and license

Seerr Plus is based on Seerr but is not an official product of the
Seerr team.

- Upstream project: [seerr-team/seerr](https://github.com/seerr-team/seerr)
- Seerr+ repository: [RPSouto/seerr-plus](https://github.com/RPSouto/seerr-plus)
- License: [MIT](./LICENSE)
=======
Current Seerr+ release: `seerr-plus-v1.8.310`.

