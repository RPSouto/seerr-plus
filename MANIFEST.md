# Seerr+ v1.8.445 — Movie Fight Progression Guard

This package updates Seerr+ to `seerr-plus-v1.8.445`.

## Included change

- Fixes Movie Fight progression when completed fight pairs did not generate the next scheduled fight.
- Allows ready next-round fights to be created even while other fights are still scheduled or active.
- Prevents existing scheduled next-round fights from being recreated or having their dates overwritten repeatedly.
- Keeps the championship completion guard so a champion is only assigned after the real final fight is completed.

## Apply

Run:

```bash
chmod +x apply-update.sh
./apply-update.sh ~/Docker/Seerr-Plus
```

Then rebuild and recreate the container.
