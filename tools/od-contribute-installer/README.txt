OD Contribute — Installer
=========================

This installs a single Claude Code / Codex CLI skill that walks any Open
Design user (including non-coders) through their first contribution to
github.com/nexu-io/open-design.

How to install
--------------

  macOS    Double-click  install.command
  Windows  Double-click  install.bat
  Linux    Open a terminal here and run  bash install.sh

The installer takes ~3 seconds. It only writes to your home directory; no
admin password required.

How to use after installing
---------------------------

  In Claude Code (inside Open Design or anywhere):
      Type  /od-contribute  in the chat.

  In Codex CLI:
      Type  @od-contribute  in the chat,
      or pick "Open Design — Contribute" from the /skills picker.

The skill will ask you a few short questions, validate whatever you're
shipping (a Skill, Design System, translation, doc fix, or bug report),
and open a real Pull Request (or Issue) on nexu-io/open-design — only
after you explicitly approve.

Where it gets installed
-----------------------

  ~/.claude/skills/od-contribute/        Claude Code skill files
  ~/.claude/commands/od-contribute.md    Claude Code slash command
  ~/.agents/skills/od-contribute/        Codex CLI skill files
  ~/.codex/skills/od-contribute/         (legacy Codex path, if present)

Re-running the installer is safe — existing files are overwritten.

Uninstall
---------

  rm -rf ~/.claude/skills/od-contribute
  rm    -f ~/.claude/commands/od-contribute.md
  rm -rf ~/.agents/skills/od-contribute
  rm -rf ~/.codex/skills/od-contribute

(Or on Windows, delete the same paths via Explorer.)

Need help?
----------

  Open Design Discord:  https://discord.gg/qhbcCH8Am4
