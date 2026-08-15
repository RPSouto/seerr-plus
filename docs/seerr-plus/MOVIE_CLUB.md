# Movie Club

Movie Club is an integrated Seerr+ weekly activity for choosing one film from
the community's existing requests.

## Workflow

1. An administrator sets the voting deadline, using the one-week preset or a
   manual calendar date.
   The vote can start immediately or at an exact scheduled date and time. When
   scheduled, the one-week deadline is calculated from that start time.
2. The administrator can select between two and four candidates immediately,
   or assign responsible users and leave candidate selection empty.
3. An assigned user receives an email, opens the private draft and selects
   exactly four candidates. The session then becomes a public vote.
4. Candidates are restricted to films that have a Seerr request and are
   available in Plex, or available films suggested by users during the current
   week.
5. Each user can vote once and can change that vote until the voting deadline.
6. An administrator or assigned responsible user resolves the vote after its deadline.
7. The selected session can expose an optional WhatsApp discussion link.
8. The latest winning films remain visible in the Movie Club history.

Administrators can assign responsible users for each session. Those users can
choose and edit candidates and can resolve the result. Only administrators can
set or change the deadline and retain control of creating, deleting and closing
sessions. Drafts without candidates remain private to administrators and their
assigned users. Scheduled sessions are also private, editable and removable
until the start time. A persistent background task activates them within 15
seconds of the configured time and sends the voting announcement email. The
schedule survives container restarts. Candidate lists are ordered by
interested-user count, and movie metadata is requested in the current user's
locale.

Available movie pages expose a **Suggest for Movie Club** toggle. Suggestions
can be withdrawn and reset naturally with the Monday-based weekly key. The
candidate picker shows at most ten films: suggested films are ranked first by
weekly suggestion count, followed by the films with the most interested users.
Candidates already selected in an edited session remain visible inside that
top-ten limit.

Candidate preparation and active voting are anonymous. The API returns only
the number of interested users and does not expose their identities for any
candidate. Requester names are revealed only for the selected Film of the Week,
in its winner announcement and in Movie Club history. This keeps the vote
focused on the films instead of the users who requested them.

When the deadline passes, a unique leader becomes Film of the Week. In a tie,
all votes are cleared, the lowest-ranked candidate is removed (community
interest is used as a deterministic tie-break), and the deadline is extended by
24 hours. Seerr+ emails users when a vote opens, a winner is selected, or a
tie-break begins. Email delivery requires the global Seerr email agent to be
enabled, each recipient to have an email address, and the recipient's personal
**Movie Club** email preference to be enabled under Profile, Settings,
Notifications, Email. The preference is enabled for existing users when this
feature is installed. Winner announcements also identify every user who
requested or registered interest in the selected film.

Users can also enable Movie Club alerts in their personal Discord, Pushbullet,
and Pushover notification settings. Pushbullet and Pushover use each user's
personal credentials. Discord publishes one message to the globally configured
channel and mentions users who enabled the Movie Club type and registered a
valid Discord ID. The administrator must enable Movie Club in the global
Discord agent before the option becomes available to users. Discord and
Pushover actions link directly to the Movie Club page; Pushbullet messages
include the same absolute link in their body.
When Seerr's public application URL is configured, the email action button
links directly to the Movie Club page, and the same absolute link is included
in the email body for assignment and voting messages.

The Discover banner is intentionally hidden when there is neither an active
vote nor a selected Film of the Week.

The current release deliberately keeps WhatsApp outside the application: the
link opens the group discussion, but Seerr+ does not access WhatsApp accounts
or send messages on behalf of users.

The authenticated API is exposed under `/api/v1/seerrplus/movie-club`.
