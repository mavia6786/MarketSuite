# Session 1 test evidence
- `S01_probe_BASELINE_original_code.json` — `tests/probe.js` run against the UNMODIFIED uploaded code (21 of 39 checks failed; includes a few probe-ordering artifacts noted in SESSION_REPORT.md).
- `S01_probe_AFTER_fixes.json` — same probe after the Session 1 fixes (36 pass, 0 fail, 3 known-deferred).
Both were produced on a FerretDB(SQLite) stand-in, NOT real MongoDB. See SESSION_REPORT.md → "Environment limitation".

## Session 2
`S02_probe_standin.json`, `S02_authz_standin.json` — run on the FerretDB stand-in (NOT real MongoDB). Re-run on real MongoDB: `npm run test:probe:real` and `REAL_MONGO=1 npm run test:authz`.
