<p align="center">
  <img src="./public/logo_full.svg" alt="Seerr Plus Edition" width="420">
</p>

<p align="center">
  <strong>PLUS EDITION</strong><br>
  A collaborative experience for Plex media requests and management.
</p>

# Seerr Plus Edition

**Seerr Plus Edition** extends [Seerr](https://github.com/seerr-team/seerr) by turning individual media requests into a shared experience for members of a Plex library.

The project keeps the Seerr core as close as possible to the original release and implements its additional features in a dedicated internal layer. This allows multiple users to express interest in the same movie or series without creating duplicate acquisition requests in Radarr or Sonarr.

## What Plus Edition adds to Seerr

- **Multiple interested users per request:** different users can join the same media request while only one acquisition is sent to Radarr or Sonarr.
- **Request participant visibility:** displays the original requester and every interested user on media pages and in the administration interface.
- **Interest withdrawal:** each user can withdraw their own interest. When no interested users remain, an administrator is warned before the request is removed.
- **Shared availability notifications:** when media becomes available in Plex or is manually marked as available, an email can be sent to every interested user who has this notification enabled.
- **Availability notification resend:** administrators can resend the availability notification to interested users from the interface.
- **Removal requests:** after watching a title, an interested user can request its removal and provide a reason, such as freeing storage space or no longer being interested.
- **Removal management:** administrators can review, approve, or reject removal requests and can directly remove any managed title.
- **Radarr/Sonarr removal:** an approved removal can delete the title and its files through the associated service.
- **Consistent permissions:** removal controls and notifications are available to administrators for all managed media and to other users only for media in which they participate, with separate handling for standard and 4K editions.
- **Plex collection scaffolding:** provides an internal foundation for future Plex collection synchronization, disabled until an adapter is configured.
- **Localized, responsive interface:** the new controls follow Seerr's supported languages and work across desktop and mobile layouts.
- **Distinct identity:** a black theme and the visible **Plus Edition** name make this installation immediately distinguishable from the original Seerr.
- **Safe migration:** SQLite and PostgreSQL migrations preserve existing users, requests, and configuration.
- **Movie Club:** users can suggest available films each week; administrators and responsible users choose four candidates from a top 10 ranked by weekly suggestions and community interest, schedule the exact voting period, and automatically notify users with a direct voting link when it opens.

## Project philosophy

Plus Edition does not replace or duplicate Seerr's request workflow. It adds a social and administrative layer to the original request:

```text
1 title in Seerr
        ↓
1 request in Radarr/Sonarr
        ↓
multiple interested users
        ↓
shared notifications and decisions
```

## Base project and license

This version is based on **Seerr v3.4.1** and retains the license of the original project. Seerr Plus Edition is an independent fork and is not an official product of the Seerr team.

- Original project: [seerr-team/seerr](https://github.com/seerr-team/seerr)
- License: [MIT](./LICENSE)
