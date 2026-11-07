# Seerr+ v1.8.450 — Upstream v3.5.1 Merge

This package updates Seerr+ to `seerr-plus-v1.8.450` (based on upstream Seerr v3.5.1).

## Included changes

- Merges official upstream Seerr v3.5.1 (incorporating v3.5.0/v3.5.1 security patches, Node 22 base, Headless UI 2.x, and library sync improvements).
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
sudo docker build --no-cache -t local/seerr-plus:3.5.1 --build-arg COMMIT_TAG=seerr-plus-v1.8.450 .
cd ~/Docker/Seerr-Plus-Deploy
sudo docker compose up -d --force-recreate
```
