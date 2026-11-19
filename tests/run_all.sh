#!/usr/bin/env bash
# Runs every test. `node tests/*.test.js` only runs the first file (node treats the rest as arguments), so loop.
set -e
cd "$(dirname "$0")/.."
for t in tests/*.test.js; do node "$t" | tail -1; done
python3 tests/migration_e2e.py | tail -1
python3 tests/smoke.py | tail -3
