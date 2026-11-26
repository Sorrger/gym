# Security and reliability

## Reporting a problem
Open an issue at https://github.com/Sorrger/gym/issues. For anything that exposes someone's data, don't post the
details publicly – write that you found a security issue and wait for a contact.

## What protects users
- **Data stays on the phone.** No own server, no analytics, no ads. Optional backup goes to the user's own secret Gist.
- **No secrets in this repo.** `scripts/check-secrets.mjs` runs before every deploy and in CI. Strava/GitHub secrets
  live only in GitHub Actions secrets; the GitHub token the user pastes stays on their phone.
- **Content-Security-Policy** in the built app (`vite.config.js`): scripts only from the app itself, network only to
  GitHub (backup). Every e2e test fails on a blocked resource. A new service (e.g. Firebase) must be added there.
- **Dependencies:** `npm audit` (high/critical fails) + CodeQL on every push and weekly; Dependabot opens weekly update PRs.
- **Data safety rules** (CLAUDE.md "Rules"): never overwrite workouts, tombstones for deletes, IndexedDB read errors
  block saving, an empty phone never overwrites a backup.

## The app never stays stuck
- `public/rescue.js` (plain script, independent of the app code): if the app is not on screen after 15 s (or its
  files fail to load), a rescue screen offers **Try again**, **Repair** (drops the cached app files, keeps all data)
  and **Save a copy of my data** (all of IndexedDB as an importable backup file).
- Errors inside Vue go to the local error log (Settings → "Błędy apki"); nothing is sent anywhere.
- Page-transition safety net (stuck invisible page) and the update screen never swap files under an open workout.

## Release workflow (every change)
1. Change the code; add tests for the change (logic `tests/logic`, click-through `tests/e2e`).
2. `npm run deploy` – stops before publishing if secrets / lint / types / logic tests fail.
3. CI on the push: lint, types, logic, build, all e2e suites (with the CSP guard), secrets, audit, CodeQL.
4. After GitHub Pages publishes: **Live app check** (`smoke.yml`) opens the real site like a new phone, online and
   offline; it also runs every morning. A failed run emails the repo owner.
5. Bigger releases: run `npm run e2e` locally before deploying.

## If a release breaks the app
1. On the phone: the rescue screen appears → "Zapisz kopię moich danych" first (keeps everything as a file).
2. Revert: `git revert <bad commit>` then `npm run deploy` (or re-deploy the last good commit). Phones get the fixed
   version on the next start; "Napraw apkę" on the rescue screen forces it.
3. Write a test that catches the bug before fixing it again.
