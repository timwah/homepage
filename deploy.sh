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

# Stage a build dir so we can inject the version without mutating sources.
BUILD=$(mktemp -d)
trap 'rm -rf "$BUILD"' EXIT

VERSION=$(git rev-parse --short HEAD 2>/dev/null || date +%s)

cp index.html script.js favicon.svg jbm.woff2 jbm-italic.woff2 _headers robots.txt sw.js "$BUILD/"

# macOS BSD sed needs the '' arg after -i.
sed -i '' "s/__VERSION__/$VERSION/g" "$BUILD/sw.js"

echo "Deploying version: $VERSION"

wrangler pages deploy "$BUILD" \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH"
