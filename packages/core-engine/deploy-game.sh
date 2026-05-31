#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONOREPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENV_FILE="$MONOREPO_ROOT/.env.game.local"

# Load .env.game.local from monorepo root
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "Error: $ENV_FILE not found."
  echo "Create it with VITE_GAME_SLUG, VITE_GAME_ID, and VITE_EDIT_MODE."
  exit 1
fi

# Validate required vars
if [ -z "$VITE_GAME_SLUG" ]; then
  echo "Error: VITE_GAME_SLUG is required in .env.game.local"
  exit 1
fi

if [ -z "$VITE_GAME_ID" ]; then
  echo "Error: VITE_GAME_ID is required in .env.game.local"
  exit 1
fi

# Check Netlify CLI
if ! command -v netlify &>/dev/null; then
  echo "Error: netlify CLI not found. Install it with: npm install -g netlify-cli"
  exit 1
fi

# Check ruleset zip
if [ ! -f "$SCRIPT_DIR/game-assets/ruleset.zip" ]; then
  echo "Error: game-assets/ruleset.zip not found. Export a ruleset and place it there."
  exit 1
fi

SITE_NAME="qb-${VITE_GAME_SLUG}"
DOMAIN="${VITE_GAME_SLUG}.questbound.com"

echo "Building ${DOMAIN}..."
cd "$SCRIPT_DIR"
npm run build:game

# Resolve site ID from name — more reliable than passing the name directly to --site
echo "Looking up Netlify site: ${SITE_NAME}..."
SITE_ID=$(netlify api listSites 2>/dev/null | node -e "
  let d = '';
  process.stdin.on('data', c => d += c);
  process.stdin.on('end', () => {
    try {
      const site = JSON.parse(d).find(s => s.name === '${SITE_NAME}');
      process.stdout.write(site ? site.id : '');
    } catch { process.stdout.write(''); }
  });
")

if [ -z "$SITE_ID" ]; then
  echo ""
  echo "Site '${SITE_NAME}' not found in your Netlify account."
  echo "Create it first: netlify sites:create --name=${SITE_NAME}"
  echo "Then configure the custom domain in the Netlify UI: ${DOMAIN}"
  exit 1
fi

echo "Deploying to ${SITE_NAME} (${SITE_ID})..."
netlify deploy --prod --dir="$SCRIPT_DIR/dist" --site="$SITE_ID"

echo ""
echo "Deployed to https://${SITE_NAME}.netlify.app"
echo ""
echo "To serve from https://${DOMAIN}, do this once in the Netlify UI:"
echo "  Site settings → Domain management → Add custom domain → ${DOMAIN}"
echo "  Then add a CNAME DNS record: ${VITE_GAME_SLUG} → ${SITE_NAME}.netlify.app"
