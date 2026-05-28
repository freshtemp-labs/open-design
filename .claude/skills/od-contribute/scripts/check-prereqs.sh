#!/usr/bin/env bash
# Verify required tools + gh auth before the skill starts.
# Exit 0  = ready (prints GH_USER=... and READY=1 to stdout)
# Exit 2  = missing prereq, hint printed to stderr; skill should surface it verbatim.

set -uo pipefail

# shellcheck disable=SC1091
source "$(dirname "$0")/config.sh"

STATUS=0
MISSING=()
HINTS=()

check_bin() {
  local bin="$1" install_hint="$2"
  if command -v "$bin" >/dev/null 2>&1; then
    printf '  ✓ %s\n' "$bin" >&2
  else
    printf '  ✗ %s (not installed)\n' "$bin" >&2
    MISSING+=("$bin")
    HINTS+=("$install_hint")
    STATUS=2
  fi
}

printf '[od-contrib] checking prerequisites...\n' >&2

OS="$(uname -s)"
case "$OS" in
  Darwin) GH_HINT="brew install gh" ;;
  Linux)  GH_HINT="see https://github.com/cli/cli#installation (e.g. 'sudo apt install gh' or 'brew install gh')" ;;
  *)      GH_HINT="see https://github.com/cli/cli#installation" ;;
esac

check_bin gh   "$GH_HINT"
check_bin git  "install git for your OS"
check_bin jq   "$( [[ $OS == Darwin ]] && echo 'brew install jq' || echo 'sudo apt install jq  (or brew install jq)' )"

if ((${#MISSING[@]} > 0)); then
  printf '\n[od-contrib][error] missing required tools: %s\n' "${MISSING[*]}" >&2
  printf '\nInstall hints:\n' >&2
  for i in "${!MISSING[@]}"; do
    printf '  - %s: %s\n' "${MISSING[$i]}" "${HINTS[$i]}" >&2
  done
  exit 2
fi

if ! gh auth status >/dev/null 2>&1; then
  cat >&2 <<'EOF'

[od-contrib][error] gh is installed but not authenticated.

Run this in a terminal, then retry:

  gh auth login

Pick: GitHub.com → HTTPS → authenticate via browser.
You need at least `repo` scope to open pull requests, and `read:org` is harmless to add.
EOF
  exit 2
fi

GH_USER="$(gh api user --jq .login 2>/dev/null || echo '?')"
printf '  ✓ gh authed as %s\n' "$GH_USER" >&2
printf '  ✓ target locked to %s\n' "$OD_TARGET_REPO" >&2

printf 'GH_USER=%s\n' "$GH_USER"
printf 'READY=1\n'
