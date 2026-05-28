#!/usr/bin/env bash
# Create a bug-report issue on nexu-io/open-design from a rendered body file.
# Usage: create-issue.sh --title "<issue title>" --body-file <rendered .md>
#                       [--dedupe-keywords "<keywords>"]
#
# If --dedupe-keywords is supplied, runs `gh search issues` first and prints
# matches to stderr. The agent surfaces them to the user before deciding to
# proceed (this script does NOT block — the agent is responsible for the prompt).
#
# Emits the issue URL on its own line (stdout).

set -euo pipefail
source "$(dirname "$0")/config.sh"

TITLE=""
BODY_FILE=""
DEDUPE_KEYWORDS=""

while (($#)); do
  case "$1" in
    --title)            TITLE="$2"; shift 2 ;;
    --body-file)        BODY_FILE="$2"; shift 2 ;;
    --dedupe-keywords)  DEDUPE_KEYWORDS="$2"; shift 2 ;;
    *) od::die "unknown flag: $1" ;;
  esac
done

[[ -n "$TITLE"     ]] || od::die "--title required"
[[ -f "$BODY_FILE" ]] || od::die "--body-file does not exist: $BODY_FILE"

od::require gh

if [[ -n "$DEDUPE_KEYWORDS" ]]; then
  od::log "checking for duplicates: $DEDUPE_KEYWORDS"
  gh search issues "$DEDUPE_KEYWORDS" \
    --repo "$TARGET_REPO" \
    --state open \
    --limit 5 \
    --json number,title,url \
    | jq -r '.[] | "  #\(.number)  \(.title)\n           \(.url)"' >&2 || true
fi

URL="$(gh issue create \
  --repo "$TARGET_REPO" \
  --title "$TITLE" \
  --body-file "$BODY_FILE" \
  --label bug)" || od::die "gh issue create failed"

printf '\n'
printf '%s\n' "$URL"
