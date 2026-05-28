# Hosting the installer zip

The `od-contribute-installer.zip` is what the public-facing OD website button downloads. It bundles `install.command` / `install.bat` / `install.sh`, the README, and a copy of `.claude/skills/od-contribute/` as `skill-payload/`.

## Build locally

```bash
bash tools/od-contribute-installer/build-zip.sh
# => tools/od-contribute-installer/od-contribute-installer.zip
```

## Distribution path

We don't commit the zip itself (binary, churns on every skill change). Instead, attach a freshly built zip to a GitHub Release whenever the skill changes meaningfully:

```bash
# 1. Build a fresh zip
bash tools/od-contribute-installer/build-zip.sh

# 2. Tag a release
TAG="od-contribute-installer-v$(date +%Y.%m.%d)"
git tag "$TAG"
git push origin "$TAG"

# 3. Create the GitHub Release and attach the zip
gh release create "$TAG" tools/od-contribute-installer/od-contribute-installer.zip \
  --title "OD Contribute installer $TAG" \
  --notes "Skill installer bundle. Double-click install.command (macOS) / install.bat (Windows) / run install.sh (Linux) after extracting."
```

The latest release zip is always reachable at:

```
https://github.com/nexu-io/open-design/releases/latest/download/od-contribute-installer.zip
```

That's the URL the marketing site button should `href` to.

## Future: GitHub Actions

A workflow at `.github/workflows/od-contribute-installer.yml` (not in this PR) can automate the build+attach step on every `od-contribute-installer-*` tag push. For now, the manual flow above is enough — releases will be infrequent.
