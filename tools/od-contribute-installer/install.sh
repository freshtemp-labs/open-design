#!/usr/bin/env bash
# OD Contribute installer — drops the od-contribute skill into every supported
# agent's home directory it finds. Safe to re-run; existing files are overwritten.
#
# Targets covered today:
#   ~/.claude/skills/od-contribute/        Claude Code (native skill format)
#   ~/.claude/commands/od-contribute.md    Claude Code slash command
#   ~/.agents/skills/od-contribute/        Codex CLI (canonical path)
#   ~/.codex/skills/od-contribute/         Codex CLI (legacy path, kept for safety)
#
# After install, in OD's chat with Claude Code: type /od-contribute
# In OD's chat with Codex: invoke @od-contribute or pick from /skills

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PAYLOAD_DIR="$SCRIPT_DIR/skill-payload"

if [[ ! -d "$PAYLOAD_DIR" ]]; then
  printf '\033[31mError:\033[0m installer is missing its skill-payload/ directory.\n' >&2
  printf 'You probably extracted the zip incompletely. Re-download the installer.\n' >&2
  exit 1
fi
if [[ ! -f "$PAYLOAD_DIR/SKILL.md" ]]; then
  printf '\033[31mError:\033[0m skill-payload/SKILL.md missing — installer is corrupted.\n' >&2
  exit 1
fi

cyan()  { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
gray()  { printf '\033[90m%s\033[0m\n' "$*"; }
warn()  { printf '\033[33m%s\033[0m\n' "$*"; }

cyan "Installing OD Contribute skill..."
echo

INSTALLED_TARGETS=()

install_skill_to() {
  local target_dir="$1" label="$2"
  mkdir -p "$target_dir"
  # rsync if available — preserves perms; cp -R as fallback.
  if command -v rsync >/dev/null 2>&1; then
    rsync -a --delete "$PAYLOAD_DIR/" "$target_dir/"
  else
    rm -rf "$target_dir"
    mkdir -p "$target_dir"
    cp -R "$PAYLOAD_DIR/." "$target_dir/"
  fi
  # Ensure scripts are executable (zip can lose +x on some platforms).
  if [[ -d "$target_dir/scripts" ]]; then
    chmod +x "$target_dir/scripts/"*.sh 2>/dev/null || true
  fi
  green "  ✓ $label"
  gray "      $target_dir"
  INSTALLED_TARGETS+=("$label")
}

install_command_file() {
  local target_path="$1" label="$2"
  mkdir -p "$(dirname "$target_path")"
  cat > "$target_path" <<'EOF'
---
description: Open a first-contribution PR (or bug issue) on nexu-io/open-design — works for non-coders too.
argument-hint: "[skill | design-system | i18n | docs | bug — optional]"
---

You are entering the **od-contribute** flow.

User input (may be empty): `$ARGUMENTS`

## What to do right now

1. Load the `od-contribute` skill via the Skill tool. The skill owns the full execution playbook — do not reimplement it inline.

2. Pass the user input forward:
   - If `$ARGUMENTS` matches `skill`, `design-system`, `i18n`, `docs`, or `bug` (or a recognizable equivalent in any language), pre-select that branch and skip the type-picking question.
   - Otherwise, the skill will ask the user via `AskUserQuestion`.

3. Honor the interactive contract:
   - Run the prerequisite check first. If it fails, surface the install/auth hint verbatim and stop.
   - Show the preview and require explicit confirmation before pushing or opening any PR/issue.
   - Print the PR or issue URL on its own line at the end.

Begin by invoking the skill now.
EOF
  green "  ✓ $label"
  gray "      $target_path"
}

# --- Claude Code (always install — it's the natively supported runtime) -----
install_skill_to "$HOME/.claude/skills/od-contribute" "Claude Code skill"
install_command_file "$HOME/.claude/commands/od-contribute.md" "Claude Code slash command (/od-contribute)"

# --- Codex CLI (canonical path) ---------------------------------------------
install_skill_to "$HOME/.agents/skills/od-contribute" "Codex CLI skill (canonical ~/.agents/skills/)"

# --- Codex CLI (legacy path) — only install if the user actually has Codex --
if [[ -d "$HOME/.codex" ]]; then
  install_skill_to "$HOME/.codex/skills/od-contribute" "Codex CLI skill (legacy ~/.codex/skills/, for older Codex versions)"
fi

echo
green "Done."
echo
cyan "How to use it:"
cat <<EOF

  In Claude Code (inside Open Design or anywhere):
    Type  /od-contribute  in the chat.

  In Codex CLI:
    Type  @od-contribute  in the chat,
    or pick "Open Design — Contribute" from the /skills picker.

  In other agents:
    Point them at  ~/.claude/skills/od-contribute/SKILL.md  and follow it.

The skill runs on your machine; no data leaves your computer until *you*
approve a final push to GitHub. It walks you through one of:

  * shipping a Skill or Design System you made with Open Design
  * translating a doc to a new language
  * fixing a typo or writing a use-case blog
  * reporting a clean bug

Need help? Open Design Discord:  https://discord.gg/qhbcCH8Am4
EOF
