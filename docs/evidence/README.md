# Session 2 evidence (real MongoDB)
All files here were produced in Session 2 against a **local standalone MongoDB 8.3.7** (not Atlas, not a replica set). Secrets were passed as shell variables; none were written to files.

- `session2_npm_run_check.txt` — full `npm run check` after the changes.
- `session2_test_public_real_mongo.txt` — `test:public`, 85 passed (with `MONGO_URI` and a second server at `PUBLIC_RATE_MAX=5`).
- `session2_probe_real_mongo_REAL_MONGO1.txt`, `session2_authz_real_mongo_REAL_MONGO1.txt` — existing suites after the changes.
- `session2_baseline_*_before_changes.txt` — same suites before any change (the authz baseline is the run with `AUTH_RATE_MAX=1000`; with the default limit 3-6 checks fail with 429).
- `session2_browser_checks.txt` — summary of the headless-Chromium checks of the Store and the portal (transcribed from console output; the scripts are not shipped). `store_*.png` are Store screenshots from that run.

Session 1 evidence (FerretDB stand-in) is in `management/docs/evidence/`.

## Session 3 (same environment: local standalone MongoDB 8.3.7)
- `session3_baseline_npm_run_check_before_changes.txt`, `session3_npm_run_check.txt` — `npm run check` before and after.
- `session3_test_public_real_mongo.txt` — `test:public`, 89 passed (with `MONGO_URI` and a second server at `PUBLIC_RATE_MAX=5`).
- `session3_probe_real_mongo_REAL_MONGO1.txt`, `session3_authz_real_mongo_REAL_MONGO1.txt` — existing suites after the changes (37/0/2 and 42/42).
- `session3_browser_store_desktop.txt`, `session3_browser_store_mobile.txt` — raw output of the headless-Chromium script (27 PASS each) against the real backend; the script is not shipped. These runs used a backend started with `PUBLIC_RATE_MAX=100000` (so repeated runs would not hit the 120/min limit) and extra seeded data: 30 more published products, two products with photos served from a local http server, discounts.
- `store_s3_*.png` — screenshots from that run.
