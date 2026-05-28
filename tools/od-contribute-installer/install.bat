@echo off
REM OD Contribute installer for Windows. Drops the skill into Claude Code and
REM Codex CLI per-user directories. Safe to re-run.

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"
set "PAYLOAD=%SCRIPT_DIR%skill-payload"

if not exist "%PAYLOAD%\SKILL.md" (
  echo Error: skill-payload\SKILL.md is missing. Re-download the installer zip.
  pause
  exit /b 1
)

echo Installing OD Contribute skill...
echo.

REM ----- Claude Code (native) ------------------------------------------------
set "CLAUDE_DIR=%USERPROFILE%\.claude\skills\od-contribute"
if not exist "%USERPROFILE%\.claude\skills" mkdir "%USERPROFILE%\.claude\skills"
if exist "%CLAUDE_DIR%" rmdir /s /q "%CLAUDE_DIR%"
xcopy "%PAYLOAD%" "%CLAUDE_DIR%" /e /i /q >nul
echo   [OK] Claude Code skill            ^(%CLAUDE_DIR%^)

set "CLAUDE_CMD_DIR=%USERPROFILE%\.claude\commands"
if not exist "%CLAUDE_CMD_DIR%" mkdir "%CLAUDE_CMD_DIR%"
> "%CLAUDE_CMD_DIR%\od-contribute.md" (
  echo ---
  echo description: Open a first-contribution PR ^(or bug issue^) on nexu-io/open-design — works for non-coders too.
  echo argument-hint: "[skill ^| design-system ^| i18n ^| docs ^| bug — optional]"
  echo ---
  echo.
  echo You are entering the **od-contribute** flow.
  echo.
  echo User input ^(may be empty^): `$ARGUMENTS`
  echo.
  echo Load the `od-contribute` skill via the Skill tool. The skill owns the full execution playbook — do not reimplement it inline. Pass `$ARGUMENTS` forward; if it matches a known branch ^(skill / design-system / i18n / docs / bug^), pre-select it. Always run prerequisite check first, always require explicit confirmation before pushing or opening any PR/issue, always print the final URL on its own line.
)
echo   [OK] Claude Code slash command   ^(/od-contribute^)

REM ----- Codex CLI (canonical) -----------------------------------------------
set "AGENTS_DIR=%USERPROFILE%\.agents\skills\od-contribute"
if not exist "%USERPROFILE%\.agents\skills" mkdir "%USERPROFILE%\.agents\skills"
if exist "%AGENTS_DIR%" rmdir /s /q "%AGENTS_DIR%"
xcopy "%PAYLOAD%" "%AGENTS_DIR%" /e /i /q >nul
echo   [OK] Codex CLI skill              ^(%AGENTS_DIR%^)

REM ----- Codex CLI (legacy path) — only if ~/.codex exists -------------------
if exist "%USERPROFILE%\.codex" (
  set "CODEX_DIR=%USERPROFILE%\.codex\skills\od-contribute"
  if not exist "%USERPROFILE%\.codex\skills" mkdir "%USERPROFILE%\.codex\skills"
  if exist "!CODEX_DIR!" rmdir /s /q "!CODEX_DIR!"
  xcopy "%PAYLOAD%" "!CODEX_DIR!" /e /i /q >nul
  echo   [OK] Codex CLI legacy path        ^(!CODEX_DIR!^)
)

echo.
echo Done.
echo.
echo How to use it:
echo.
echo   In Claude Code:  type  /od-contribute  in the chat.
echo   In Codex CLI:    type  @od-contribute  or pick from /skills.
echo.
echo Need help? Open Design Discord: https://discord.gg/qhbcCH8Am4
echo.
pause
