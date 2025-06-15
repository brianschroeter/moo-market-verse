#!/bin/bash

# Script to refresh YouTube channel avatars
# Usage: ./refresh-youtube-avatars.sh [--limit <number>] [--force-all true]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "Refreshing YouTube channel avatars..."

# Pass all arguments to the Node.js script
node scripts/refresh-youtube-avatars.cjs "$@"