#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND="$ROOT/backend"
[ -d "$BACKEND" ] || BACKEND="$ROOT/src/b1"
cd "$BACKEND"
rm -rf storage && mkdir -p storage/uploads storage/artifacts
(PORT=4000 node src/server.js >/tmp/sovereign-verify.log 2>&1 & echo $! >/tmp/sovereign-verify.pid)
trap 'kill $(cat /tmp/sovereign-verify.pid) 2>/dev/null || true; rm -rf storage' EXIT
sleep 1
curl -fsS http://127.0.0.1:4000/health >/tmp/verify-health.json
printf 'Inspection report: measured shell thickness 8.1 mm. SOP minimum required 8.5 mm.\n' >/tmp/verify-inspection.txt
curl -fsS -H 'x-demo-user: engineer@demo.local' -F projectId=prj_p101 -F files=@/tmp/verify-inspection.txt http://127.0.0.1:4000/api/files/upload >/tmp/verify-upload.json
curl -fsS -H 'x-demo-user: engineer@demo.local' -X POST http://127.0.0.1:4000/api/knowledge/reindex >/tmp/verify-index.json
curl -fsS -G -H 'x-demo-user: engineer@demo.local' --data-urlencode 'q=minimum shell thickness' http://127.0.0.1:4000/api/knowledge/search >/tmp/verify-search.json
echo '{"code":"print(2+2)","language":"python"}' | curl -fsS -H 'x-demo-user: engineer@demo.local' -H 'content-type: application/json' -d @- http://127.0.0.1:4000/api/sandbox/run >/tmp/verify-sandbox.json
curl -fsS -H 'x-demo-user: engineer@demo.local' -H 'content-type: application/json' -d '{}' http://127.0.0.1:4000/api/benchmarks/run >/tmp/verify-benchmark.json
npm run smoke
printf 'FULL_VERIFY_OK\n'
