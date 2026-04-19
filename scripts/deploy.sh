#!/usr/bin/env sh
set -e

# Bump patch version (root + workspaces), publish npm packages, push (pre-push hook runs but skips duplicate bump).

REPO_ROOT=$(git rev-parse --show-toplevel)
cd "$REPO_ROOT"

npm version patch --no-git-tag-version
node scripts/sync-workspace-versions.mjs
npm install --package-lock-only --ignore-scripts
git add package.json package-lock.json
for pkg in packages/*/package.json; do
  [ -f "$pkg" ] && git add "$pkg"
done

if git diff --cached --quiet; then
  echo "deploy: no staged version changes (unexpected)."
else
  VERSION=$(node -e "console.log(require('./package.json').version)")
  git commit -m "chore: bump version to ${VERSION}"
fi

npm run publish:packages

QUEST_BOUND_SKIP_PRE_PUSH_VERSION_BUMP=1 git push
