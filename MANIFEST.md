# Seerr+ v1.8.455 — Upstream v3.5.2 Merge

This package updates Seerr+ to `seerr-plus-v1.8.455` (based on upstream Seerr v3.5.2).

## Included changes

- Merges official upstream Seerr v3.5.2 (Node 22.23.5, SQLite3 v6, Next.js 16.4.2, credential logging prevention, Jellyfin filter fixes, and scanner improvements).
- Fully preserves all Seerr+ features: Movie Club (Film of the Week, voting, responsible curators, automated progression scheduler), Removal Requests & Voting, Interested Users, and Tautulli Plex Library & Stream Statistics.
- Cleans build scripts and Docker deployment workflow.

## Apply

Run:

```bash
chmod +x apply-update.sh
./apply-update.sh ~/Docker/Seerr-Plus
```

Then rebuild and recreate the container:

```bash
cd ~/Docker/Seerr-Plus
sudo docker build --no-cache -t local/seerr-plus:3.5.2 --build-arg COMMIT_TAG=seerr-plus-v1.8.455 .
cd ~/Docker/Seerr-Plus-Deploy
sudo docker compose up -d --force-recreate
```
