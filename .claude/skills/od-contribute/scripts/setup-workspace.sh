#!/usr/bin/env bash
# Clone (or reuse) nexu-io/open-design in an isolated workdir + create a feature branch.
# Usage: setup-workspace.sh <type> <slug>
#   <type>  one of: skill | design-system | i18n | docs
#   <slug>  short kebab-case identifier (e.g. "translate-readme-es", "fix-typo-quickstart")
#
# Env: TARGET_FORK optional (else pushes go to upstream — create-pr.sh warns first).
#
# Stdout (machine-readable):
#   WORKDIR=<abs path>
#   BRANCH=<branch name>

set -euo pipefail
source "$(dirname "$0")/config.sh"

TYPE="${1:?type required (skill|design-system|i18n|docs)}"
SLUG="${2:?slug required}"

case "$TYPE" in
  skill|design-system|i18n|docs) ;;
  *) od::die "unknown type: $TYPE (expected skill|design-system|i18n|docs)" ;;
esac

od::require gh
od::require git

DATE_TAG="$(date +%Y%m%d)"
SESSION_DIR="${TYPE}-${SLUG}-${DATE_TAG}"
WORKDIR="$(od::workdir_for "$SESSION_DIR")"
BRANCH="od-contrib/${TYPE}/${SLUG}-${DATE_TAG}"

mkdir -p "$OD_WORK_ROOT"
od::assert_in_workroot "$WORKDIR"

CLONE_URL="https://github.com/${TARGET_REPO}.git"

if [[ -d "$WORKDIR/.git" ]]; then
  od::log "reusing existing workdir: $WORKDIR"
  git -C "$WORKDIR" fetch origin --prune
else
  od::log "cloning $CLONE_URL → $WORKDIR (depth 50)"
  git clone --depth 50 "$CLONE_URL" "$WORKDIR"
fi

git -C "$WORKDIR" checkout "$OD_BASE_BRANCH"
git -C "$WORKDIR" pull --ff-only origin "$OD_BASE_BRANCH"

# Configure fork remote if provided.
if [[ -n "${TARGET_FORK}" ]]; then
  if git -C "$WORKDIR" remote | grep -q '^fork$'; then
    git -C "$WORKDIR" remote set-url fork "https://github.com/${TARGET_FORK}.git"
  else
    git -C "$WORKDIR" remote add fork "https://github.com/${TARGET_FORK}.git"
  fi
fi

# Create or reset branch off latest base.
if git -C "$WORKDIR" show-ref --verify --quiet "refs/heads/$BRANCH"; then
  od::log "branch $BRANCH already exists — switching"
  git -C "$WORKDIR" checkout "$BRANCH"
else
  git -C "$WORKDIR" checkout -b "$BRANCH" "$OD_BASE_BRANCH"
fi

mkdir -p "$WORKDIR/.od-contrib"
printf '%s\n' "$TYPE" > "$WORKDIR/.od-contrib/type.txt"
printf '%s\n' "$SLUG" > "$WORKDIR/.od-contrib/slug.txt"

od::log "workspace ready"
printf 'WORKDIR=%s\n' "$WORKDIR"
printf 'BRANCH=%s\n' "$BRANCH"
