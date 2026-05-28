#!/usr/bin/env bash
# macOS double-click installer. The .command extension makes Finder run this
# file in Terminal when the user double-clicks it. Implementation just defers
# to install.sh in the same directory.

set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec /usr/bin/env bash "$HERE/install.sh" "$@"
