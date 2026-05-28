#!/usr/bin/env bash
# Lightweight Markdown validation for i18n / docs / blog contributions.
# Usage: validate-markdown.sh <file> [<file> ...]
# Checks per file:
#   - File is non-empty UTF-8.
#   - Code fences are balanced (count of ``` is even).
#   - Every relative link target exists on disk.
#   - Every relative image target exists on disk.
#   - External http(s) links return 2xx/3xx (best-effort, capped + 8s timeout).
# Exit 0 if all files pass, 1 otherwise.

set -uo pipefail
source "$(dirname "$0")/config.sh"

(($# >= 1)) || od::die "usage: validate-markdown.sh <file> [<file> ...]"

OVERALL=0
MAX_HTTP_PER_FILE=20

check_file() {
  local f="$1"
  local fail=0
  printf -- '--- %s ---\n' "$f"

  if [[ ! -f "$f" ]]; then
    printf 'FAIL  not a file: %s\n' "$f"
    return 1
  fi
  if [[ ! -s "$f" ]]; then
    printf 'FAIL  empty file: %s\n' "$f"
    return 1
  fi
  printf 'PASS  exists, non-empty\n'

  # Code fence balance.
  local fences
  fences="$(grep -cE '^```' "$f" || true)"
  if (( fences % 2 == 0 )); then
    printf 'PASS  code fences balanced (%d)\n' "$fences"
  else
    printf 'FAIL  unbalanced code fences (%d ``` lines)\n' "$fences"
    fail=1
  fi

  local dir
  dir="$(cd "$(dirname "$f")" && pwd -P)"

  # Relative links + images.
  local rel_bad=0
  while IFS= read -r ref; do
    [[ -z "$ref" ]] && continue
    case "$ref" in
      http*|mailto:*|\#*|/*) continue ;;  # absolute / external / anchor — skip
    esac
    # Strip URL fragment / query.
    local target="${ref%%#*}"
    target="${target%%\?*}"
    [[ -z "$target" ]] && continue
    if [[ ! -e "$dir/$target" ]]; then
      printf 'FAIL  broken relative reference: %s\n' "$ref"
      rel_bad=$((rel_bad+1))
      fail=1
    fi
  done < <(grep -oE '\!?\[[^]]*\]\([^)]+\)' "$f" \
           | sed -E 's/.*\(([^)]+)\).*/\1/' \
           | sort -u)

  (( rel_bad == 0 )) && printf 'PASS  all relative references resolve\n'

  # External link health (best-effort).
  local http_seen=0 http_bad=0
  while IFS= read -r url; do
    [[ -z "$url" ]] && continue
    (( http_seen >= MAX_HTTP_PER_FILE )) && break
    http_seen=$((http_seen+1))
    local code
    code="$(curl -sS -o /dev/null -m 8 -L -w '%{http_code}' --head "$url" 2>/dev/null || echo "000")"
    case "$code" in
      2*|3*|000) ;;  # OK or network-flaky (don't punish)
      *)
        printf 'FAIL  external link %s returned %s\n' "$url" "$code"
        http_bad=$((http_bad+1))
        fail=1
        ;;
    esac
  done < <(grep -oE 'https?://[^) ]+' "$f" | sort -u)

  (( http_bad == 0 && http_seen > 0 )) && printf 'PASS  %d external links return 2xx/3xx (or network-skipped)\n' "$http_seen"

  return "$fail"
}

for f in "$@"; do
  if ! check_file "$f"; then
    OVERALL=1
  fi
done

if [[ "$OVERALL" -eq 0 ]]; then
  printf 'RESULT=pass\n'
  exit 0
else
  printf 'RESULT=fail\n'
  exit 1
fi
