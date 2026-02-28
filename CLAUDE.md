## Configure agent for bead use.

@AGENTS.md

## Release Process

Releases are driven by git tags. The `release.yml` workflow fires on any `v*` tag,
builds the plugin, extracts the release notes for that version from `CHANGELOG.md`,
and publishes a GitHub release with `main.js`, `manifest.json`, and `styles.css`
as assets.

**Steps to cut a release:**

1. Update `CHANGELOG.md` — add a `## [x.y.z] - YYYY-MM-DD` section with the changes.
2. Merge all feature/fix branches to `main`.
3. Run `make release VERSION=x.y.z` on `main` — this bumps `manifest.json` and
   `package.json`, commits with `chore: bump version to x.y.z`, and creates the
   local tag `vx.y.z`. Because `main` is protected, the commit must go through a PR:
   ```
   git checkout -b chore/bump-version-x.y.z
   git push -u origin chore/bump-version-x.y.z
   gh pr create --title "chore: bump version to x.y.z" --body "Version bump for release x.y.z."
   ```
   (Delete the premature local tag first: `git tag -d vx.y.z`)
4. After the PR is merged, pull `main`, then tag and push:
   ```
   git checkout main && git pull
   git tag vx.y.z
   git push --tags
   ```
5. The workflow runs automatically. Verify the release at
   `https://github.com/ssoriche/obsidian-slack-emoji/releases`.
