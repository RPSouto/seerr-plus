# Private GitHub publishing

Repository: `git@github.com:RPSouto/seerr-plus.git`

Configure identity once on Ubuntu:

```bash
cd ~/Docker/Seerr-Plus
git config user.name "Rafael Souto"
git config user.email "YOUR_GITHUB_EMAIL"
```

Confirm that SSH authentication works:

```bash
ssh -T git@github.com
```

Publish release 1.8.5:

```bash
cd ~/Docker/Seerr-Plus
bash scripts/seerr-plus-release.sh seerr-plus-v1.8.5
```

For the next release, only change the version/branch argument:

```bash
bash scripts/seerr-plus-release.sh seerr-plus-v1.8.10
```

The patch number must always be a multiple of 5, such as `1.8.5`, `1.8.10`,
or `1.9.0`. The script validates this convention, creates or switches to that branch, updates
`SEERR_PLUS_VERSION`, commits all non-ignored changes, creates an annotated tag
with the same version and pushes both branch and tag to the `private` remote.
It never force-pushes or moves an existing tag.

Installer backup files (`*.pre-*`) and the earlier diagnostic files
`seer-tree`/`tree-see` are ignored and will not be committed.

To validate locally without pushing:

```bash
SEERR_PLUS_NO_PUSH=true \
  bash scripts/seerr-plus-release.sh seerr-plus-v1.8.5
```
