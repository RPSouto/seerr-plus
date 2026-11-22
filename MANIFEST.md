# Seerr+ v1.8.460 — Dedicated Settings, Automation & GHCR CI/CD

This release elevates Seerr+ (`seerr-plus-v1.8.460`, based on upstream Seerr v3.5.2) with native administration, expanded automation, and modern fork CI/CD.

## Included changes

- **Dedicated Seerr+ Settings UI**: Manage all Seerr+ features under `Settings -> Seerr+`.
- **Movie Club Radarr Automation**: Automatically request winning films in Radarr with custom tags (`movie-club`) when voting concludes.
- **Pure Black (OLED) Theme**: True `#000000` dark theme for OLED displays and energy efficiency.
- **GitHub Actions (GHCR)**: Automated multi-arch Docker image build and publishing to `ghcr.io/rpsouto/seerr-plus`.
- **Upstream Sync Workflow**: Automated weekly tracking of upstream releases from `seerr-team/seerr`.
- **Modernized Deploy Pipeline**: Native fork deployment without overlays (`fast-deploy.sh`).

## Deploy on Dell Server

```bash
cd ~/Docker/Seerr-Plus
git pull origin main
./scripts/fast-deploy.sh --skip-tests
```
