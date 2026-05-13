#!/usr/bin/env bash
# Deploy timrobles.xyz to Cloudflare Pages.
# Requires wrangler (npm install -g wrangler) and `wrangler login`
# to be done once. Edit PROJECT_NAME if your Pages project isn't named
# "timrobles-home".

set -euo pipefail

PROJECT_NAME="timrobles-home"
BRANCH="main"

cd "$(dirname "$0")"

if ! command -v wrangler >/dev/null 2>&1; then
  echo "wrangler is not installed."
  echo "  npm install -g wrangler"
  echo "  wrangler login"
  exit 1
fi

wrangler pages deploy . \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH"
