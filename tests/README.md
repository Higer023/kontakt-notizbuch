# Automated test and quality gates
<!-- CI smoke test: automatic quality checks -->
The repository uses GitHub Actions to run a required-style quality gate on pull requests targeting `main`, on pushes to branches, on a weekly schedule, and on manual dispatch. The workflow **does not merge or deploy changes**. You review and approve the pull request after checks finish.

## What runs

- Static project checks and JavaScript syntax/security invariants.
- Worker/API behavioral tests, including authentication, authorization, user isolation, passkey ownership, encrypted record handling, recovery/push protections, and scheduled cleanup regressions.
- Browser WebCrypto/AES-GCM regression tests.
- CSV formula-injection tests (each case reported independently).
- SQLite schema regression tests against an in-memory database.
- Repository integrity checks for required assets, JSON manifest validity, mobile viewport, service worker, API routing, foreign-key schema, and accidental secret patterns.
- Dependency vulnerability audit at high severity or above.
- Node.js 20 and 22 test matrix.
- A hard minimum of **30 independently reported passing test cases per Node matrix run**. If a suite fails, the count is below 30, or schema tests do not run, the job fails.
- Full per-suite logs uploaded as a GitHub Actions artifact even when tests fail.

## Run locally

From the repository root:

```bash
npm install --prefix tests --no-audit --no-fund
node tests/static.test.mjs
node tests/behavior.test.mjs
node tests/crypto.test.mjs
node tests/csv.test.mjs
python tests/schema.test.py
node tests/repository-integrity.test.mjs
npm audit --prefix tests --audit-level=high
```

The CI report counter is designed to reject a green result when fewer than 30 individual checks were actually reported. It does not count the combined legacy integration runner as a passing suite; that runner has separate known compatibility issues and must be fixed before it can safely become a required CI step.

## Important limitations

Green CI means the checked automated tests passed; it does **not** prove the application is mathematically bug-free or replace real-browser/device testing. Cloudflare D1 deployment/migrations, live passkey/recovery flows, mail delivery, push delivery, production secrets, and Android/iOS browser behavior still require dedicated staging or manual smoke tests. No test workflow should use production data or secrets.

## Review policy

- Do not merge automatically.
- Require all quality-gate checks to pass before approving/merging a pull request.
- Review the change summary and any test artifacts; investigate flaky or skipped tests instead of suppressing them.
- Consider pinning third-party GitHub Actions to verified full commit SHAs as an additional supply-chain hardening step.
