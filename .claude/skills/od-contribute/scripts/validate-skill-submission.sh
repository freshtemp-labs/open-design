#!/usr/bin/env bash
# Validate a user-supplied OD skill folder before staging it for PR.
# Usage: validate-skill-submission.sh <skill-folder>
# Checks (each prints PASS/FAIL line on stdout):
#   - SKILL.md exists
#   - SKILL.md has frontmatter with `name` and `description`
#   - `name` matches folder name (warn-only, since OD may rename on merge)
#   - all relative paths in SKILL.md resolve to files inside the folder
#   - no path escapes the skill folder (../ in references)
# Exit 0 = all PASS or only warnings. Exit 1 = at least one FAIL.

set -uo pipefail
source "$(dirname "$0")/config.sh"

SKILL_DIR="${1:?skill folder path required}"
[[ -d "$SKILL_DIR" ]] || od::die "not a directory: $SKILL_DIR"

ABS_SKILL_DIR="$(cd "$SKILL_DIR" && pwd -P)"
FAIL=0

pass() { printf 'PASS  %s\n' "$1"; }
warn() { printf 'WARN  %s\n' "$1"; }
fail() { printf 'FAIL  %s\n' "$1"; FAIL=1; }

SKILL_MD="$ABS_SKILL_DIR/SKILL.md"
if [[ ! -f "$SKILL_MD" ]]; then
  fail "SKILL.md missing — every OD skill folder must contain SKILL.md at its root"
  printf 'RESULT=%s\n' "fail"
  exit 1
fi
pass "SKILL.md exists"

# Frontmatter parse: extract YAML between the first two '---' lines.
FRONT=$(awk '
  BEGIN { in_fm=0; fence=0 }
  /^---[[:space:]]*$/ {
    fence++
    if (fence==1) { in_fm=1; next }
    if (fence==2) { exit }
  }
  in_fm { print }
' "$SKILL_MD")

if [[ -z "$FRONT" ]]; then
  fail "SKILL.md has no YAML frontmatter (--- ... --- block at the top)"
else
  pass "SKILL.md frontmatter present"

  name_line="$(printf '%s' "$FRONT" | grep -E '^name:' | head -1 || true)"
  desc_line="$(printf '%s' "$FRONT" | grep -E '^description:' | head -1 || true)"
  [[ -n "$name_line" ]] && pass "frontmatter has 'name'" || fail "frontmatter missing 'name:'"
  [[ -n "$desc_line" ]] && pass "frontmatter has 'description'" || fail "frontmatter missing 'description:'"

  # Sanity: name should look like a slug.
  fm_name="$(printf '%s' "$name_line" | sed -E 's/^name:[[:space:]]*//; s/^["'\''"]//; s/["'\''"]$//')"
  folder_name="$(basename "$ABS_SKILL_DIR")"
  if [[ -n "$fm_name" && "$fm_name" != "$folder_name" ]]; then
    warn "frontmatter name '$fm_name' differs from folder name '$folder_name' (maintainer may rename — OK)"
  fi
fi

# Relative path scan: every '(./...)' or '(../...)' or '(<plain-path>)' link must resolve.
# We deliberately ignore http(s):// links — those are link-checked elsewhere.
BAD_REFS=0
ESCAPE=0
while IFS= read -r ref; do
  # Drop leading '(' if any from awk.
  ref="${ref#(}"
  ref="${ref%)}"
  # Skip protocol URLs and anchors-only.
  case "$ref" in
    http*|mailto:*|\#*) continue ;;
  esac
  resolved="$ABS_SKILL_DIR/$ref"
  resolved_abs="$(cd "$(dirname "$resolved")" 2>/dev/null && pwd -P)/$(basename "$resolved")" || true
  case "$resolved_abs" in
    "$ABS_SKILL_DIR"/*) ;;
    *) ESCAPE=1; fail "path escapes skill folder: $ref" ;;
  esac
  if [[ ! -e "$resolved" ]]; then
    BAD_REFS=$((BAD_REFS+1))
    fail "referenced file does not exist: $ref"
  fi
done < <(grep -oE '\(\.{1,2}/[^)]+\)' "$SKILL_MD" 2>/dev/null | sed 's/^(//; s/)$//' | sort -u)

if [[ "$BAD_REFS" -eq 0 && "$ESCAPE" -eq 0 ]]; then
  pass "all relative references resolve inside the skill folder"
fi

if [[ "$FAIL" -eq 0 ]]; then
  printf 'RESULT=%s\n' "pass"
  exit 0
else
  printf 'RESULT=%s\n' "fail"
  exit 1
fi
