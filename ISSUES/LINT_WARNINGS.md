# Lint Warnings Triage

Summary of remaining ESLint warnings and proposed actions.

## Current status
- ESLint run: 0 errors, **90 warnings** (after applying top safe fixes).
- Most frequent rule: `no-unused-vars` (many instances across `public/js/` and `server/routes/`).

## Top files with warnings (examples)
- `public/js/finisher-integration.js` — multiple unused variables like `neutralWords`, `writingHistory`, etc.
- `public/js/beat-maker.js` — several unused functions/vars: `broadcastPatternUpdate`, `broadcastTrackUpdate`, `format`, `sampleRate`, `bitDepth`.
- `public/js/mixmaster1-pro.js` — a few unused vars (`gain`, `freq`).
- `server/routes/*.js` — many handlers define variables they don't currently use (e.g., `password` placeholders, analytics helpers).

## Proposed next steps (priority order)
1. Fix small unused variable cases by either:
   - Using the variable (where appropriate), or
   - Prefixing with `_` and/or removing unused parameters, or
   - Removing outdated `eslint-disable` directives.
   (These are low-risk, small commits.)

2. Audit larger unused functions (e.g., broadcast helpers) and either wire them up or remove them. These need a small functional review before removal.

3. Add lint rule exceptions where valid (e.g., make `_` ignored by `no-unused-vars` if project convention prefers it). Adjust `.eslintrc` carefully.

4. Add a CI job to run `npm run lint` on PRs and fail on errors (but allow warnings to not block builds initially).

## Quick wins I can implement now
- Replace a few unused parameters in `public/js/*` by removing the parameter or prefixing with `_` where appropriate.
- Remove obsolete `eslint-disable` directives that no longer apply.

## If you want, I can
- Create a PR with the next 10 small fixes (I suggest focusing on the `public/js` folder first), and
- Open GitHub issues for the remaining grouped by file/area.

---

**Proposed PR branch:** `fix/lint-top10` (contains fixes already).
**Documentation branch:** `chore/lint-issues` (this file)

Next step: confirm if you want me to continue applying the next set of 10 safe fixes and then open issues for the rest. If yes, I will proceed and create a PR draft message you can use on GitHub. 
