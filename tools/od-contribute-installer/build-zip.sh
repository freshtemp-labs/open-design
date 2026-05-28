#!/usr/bin/env bash
# Build od-contribute-installer.zip from the in-repo skill at
# .claude/skills/od-contribute/. Run from the OD repo root or from this
# installer directory — both work.
#
#   bash tools/od-contribute-installer/build-zip.sh
#
# Output: tools/od-contribute-installer/od-contribute-installer.zip
#
# This script is what the GitHub Actions release workflow runs to produce
# the downloadable artifact attached to each od-contribute-installer-* tag.

set -euo pipefail

INSTALLER_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$INSTALLER_DIR/../.." && pwd)"
SKILL_DIR="$REPO_ROOT/.claude/skills/od-contribute"
PAYLOAD_DIR="$INSTALLER_DIR/skill-payload"
ZIP_PATH="$INSTALLER_DIR/od-contribute-installer.zip"

[[ -d "$SKILL_DIR" ]] || { printf 'Error: skill not found at %s\n' "$SKILL_DIR" >&2; exit 1; }
[[ -f "$SKILL_DIR/SKILL.md" ]] || { printf 'Error: SKILL.md missing\n' >&2; exit 1; }

rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR"

# Mirror the skill into skill-payload/, excluding noise.
(
  cd "$SKILL_DIR"
  find . -mindepth 1 \
    \( -name '.DS_Store' -o -name '*~' -o -path './.git*' \) -prune -o \
    -print
) | while IFS= read -r entry; do
  [[ "$entry" == "." ]] && continue
  src="$SKILL_DIR/${entry#./}"
  dst="$PAYLOAD_DIR/${entry#./}"
  if [[ -d "$src" ]]; then
    mkdir -p "$dst"
  else
    mkdir -p "$(dirname "$dst")"
    cp "$src" "$dst"
  fi
done

# Make sure shell scripts retain +x inside the zip (zip preserves Unix perms).
find "$PAYLOAD_DIR" -name '*.sh' -exec chmod +x {} +
chmod +x "$INSTALLER_DIR/install.sh" "$INSTALLER_DIR/install.command"

rm -f "$ZIP_PATH"
(
  cd "$INSTALLER_DIR"
  zip -qry "$ZIP_PATH" \
    install.command install.bat install.sh README.txt skill-payload
)

# Clean up the staging dir — we only need the zip.
rm -rf "$PAYLOAD_DIR"

SIZE=$(stat -f '%z' "$ZIP_PATH" 2>/dev/null || stat -c '%s' "$ZIP_PATH")
printf 'Built %s (%s bytes)\n' "$ZIP_PATH" "$SIZE"
