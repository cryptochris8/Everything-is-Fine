#!/usr/bin/env bash
# Build the playable .dist and (re)generate the dev manifest.
#   tools/check.sh            typecheck + build .dist
#   tools/check.sh --manifest also regenerate dist/file-manifest.json (needed when assets change)
#   tools/check.sh --serve    also start vite on :5207 in the background if it is not up
set -euo pipefail
cd "$(dirname "$0")/.."
export npm_config_manage_package_manager_versions=false

echo "--- typecheck"
./node_modules/.bin/tsc --noEmit -p tsconfig.json

echo "--- build .dist"
node scripts/build-dist.mjs

if [[ " $* " == *" --manifest "* ]]; then
  echo "--- manifest"
  ./node_modules/.bin/tsx ./scripts/genesys/dev/generate-manifest.ts | tail -3
fi

if [[ " $* " == *" --serve "* ]]; then
  if curl -s --noproxy '*' -m 3 -o /dev/null http://127.0.0.1:5207/; then
    echo "--- vite already up on :5207 (since $(cat .vite.started 2>/dev/null || echo 'unknown'))"
    # A vite left running for days can end up burning ~2 cores at idle with 1 GB
    # private memory (seen 09-07: 51 CPU-hours in 35 wall-hours). Those are two
    # cores the game and the probe do not get. (It was NOT what cost Chris his
    # fps that day -- that was Chrome sitting on the Intel iGPU -- but it is
    # still two cores.) If that date is not today, kill it and re-run: a fresh
    # one idles at 0.

  else
    echo "--- starting vite on :5207"
    date '+%Y-%m-%d %H:%M' > .vite.started
    (./node_modules/.bin/vite --host 127.0.0.1 --port 5207 --strictPort > .vite.log 2>&1 &)
    for i in $(seq 1 60); do
      sleep 2
      if curl -s --noproxy '*' -m 3 -o /dev/null http://127.0.0.1:5207/; then
        echo "    up after $((i*2)) s"
        break
      fi
    done
  fi
fi
echo "--- ok"
