#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../../../packages/backend"

npx convex deploy \
	--cmd-url-env-var-name PUBLIC_CONVEX_URL \
	--cmd 'cd ../../apps/web && npm run build'

# Preview deployments are empty — Convex does not clone production data.
# Pull meals / timetable / schedule from the school APIs. Notices live only
# in Convex, so those stay empty unless you import them.
if [ "${VERCEL_ENV:-}" != "production" ]; then
	npx convex run preview:hydrate '{}' \
		--preview-name "${VERCEL_GIT_COMMIT_REF:?VERCEL_GIT_COMMIT_REF is required for preview hydrate}"
fi
