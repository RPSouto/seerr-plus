<div align="center">

# Seerr+ 🎬
### Enhanced Community Edition for Plex & Overseerr/Seerr

[![Latest Release](https://img.shields.io/badge/Seerr+-v1.8.455-blue.svg?style=flat-square)](https://github.com/RPSouto/seerr-plus/releases)
[![Upstream Base](https://img.shields.io/badge/Upstream%20Base-Seerr%20v3.5.2-success.svg?style=flat-square)](https://github.com/seerr-team/seerr/releases/tag/v3.5.2)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg?style=flat-square)](https://nodejs.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](#deployment)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

**Seerr+** is an official fork of [Seerr](https://github.com/seerr-team/seerr) designed for community engagement, shared request interests, interactive Movie Club voting, collaborative content lifecycle management, and lightweight Plex/Tautulli monitoring.

[Key Features](#-key-features) • [Fork Architecture](#-fork-architecture) • [Deployment](#-deployment) • [Updating](#-updating--upstream-sync) • [License](#-license)

</div>

---

## 🌟 Key Features

### 🎬 Movie Club (Film of the Week)
- **Community Voting:** Vote weekly on requested movies that are already downloaded and available in Plex.
- **Automated Progression:** Automated scheduler to open voting, resolve winners, or trigger 24-hour tie-break rounds.
- **Curators & Themes:** Admins can designate responsible users (curators) to select candidate films and choose themes (Community, Action, Horror, Comedy, Hidden Gems, etc.).
- **Discover Slider:** Winners are highlighted across the application with winner badges and an optional custom Discover slider on the home page.
- **Social Discussion:** Deep-link integration with WhatsApp discussion groups so users can jump straight into conversation.

### 👥 Shared Request Interests
- **No Duplicate Grabs:** Multiple users can show interest in the same movie or series request without triggering redundant downloads in Radarr or Sonarr.
- **Shared Notifications:** Everyone marked as interested receives notifications when media becomes available or when status updates occur.
- **Public Requesters:** Users can optionally showcase that they requested or backed a title on the media details page.

### 🗳️ Content Removal Requests & Community Votes
- **Community-driven Lifecycle:** Users and admins can request removal of available content (e.g., to free disk space or when interest has lapsed).
- **Consensus Voting:** Admins can launch an automatic community vote among interested users before deciding whether to purge media.
- **Automated Deletion:** Approving a removal deletes the file from disk via Radarr/Sonarr and updates Seerr media records automatically.

### 📊 Real-time Plex & Tautulli Stream Visibility
- **Live Streams in Sidebar:** View active Plex stream counts, movie totals, and series statistics directly in the sidebar without triggering heavy library scans.
- **Secure Stream Art Proxy:** Proxies current stream thumbnails through Seerr without exposing your Tautulli API key to client browsers.
- **Mobile Stream Overlay:** Responsive, compact overlay for mobile users to check Plex activity on the go.

---

## 🏗️ Fork Architecture

Seerr+ tracks official upstream releases from [`seerr-team/seerr`](https://github.com/seerr-team/seerr):

- **Zero Breaking Conflicts:** All Seerr+ features are cleanly encapsulated in dedicated endpoints (`/api/v1/seerrplus/*`), entities, and UI components while keeping upstream request pipelines intact.
- **Up-to-Date Core:** Fully incorporates upstream bug fixes, security patches (CVE-2026-113470), Node 22 base, Headless UI 2.x components, and modern library synchronization.

---

## 🚀 Deployment

### Docker Build (Local Image)

Clone this repository and build the local Docker container:

```bash
git clone https://github.com/RPSouto/seerr-plus.git
cd seerr-plus

sudo docker build --no-cache \
  -t local/seerr-plus:3.5.2 \
  -t local/seerr-plus:latest \
  --build-arg COMMIT_TAG=seerr-plus-v1.8.455 \
  .
```

### Docker Compose Example

```yaml
services:
  seerr-plus:
    image: local/seerr-plus:latest
    container_name: seerr-plus
    environment:
      - LOG_LEVEL=debug
      - TZ=Europe/Lisbon
      - PORT=5055
    ports:
      - 5055:5055
    volumes:
      - /path/to/appdata/config:/app/config
    restart: unless-stopped
```

Deploy or recreate the container:

```bash
docker compose up -d --force-recreate
```

---

## 🔄 Updating & Upstream Sync

### Option 1: Fast Deploy Script

A deployment script is included in `scripts/fast-deploy.sh` to automate building, testing, and restarting your compose stack:

```bash
bash scripts/fast-deploy.sh
```

### Option 2: Pull & Rebuild

```bash
cd ~/Docker/Seerr-Plus
git pull origin main

sudo docker build --no-cache \
  -t local/seerr-plus:3.5.2 \
  -t local/seerr-plus:latest \
  --build-arg COMMIT_TAG=seerr-plus-v1.8.455 \
  .

cd ~/Docker/Seerr-Plus-Deploy
sudo docker compose up -d --force-recreate
```

---

## 🛡️ License

Seerr+ is released under the [MIT License](LICENSE), matching the original Seerr project.
