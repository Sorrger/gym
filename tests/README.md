# Tests

- `npm test` – logic tests (coach / progression, deload, pull-up stages, suggestions, own plans, prefs, stats). Pure node, no browser.
- `tests/e2e/*.mjs` – Playwright click-through scripts against `npx vite preview --port 4173` on an iPhone viewport
  (need `playwright-core` + a Chrome/Edge path, see the top of each file; they print results and `errs`). `seed.mjs` seeds realistic workouts.
  Fresh-phone scripts set `localStorage.onboarded = '1'` (else the first-start screen opens). Date-dependent ones pin the clock.
  Main ones: `e2e_on` (workout flow), `full` (backup/restore/offline), `nav` (all tabs + back buttons), `prefs`/`prog2` (settings), `rec` (records, colour, settings pages), `en` (English), `crawl` (collects all visible texts in English mode – untranslated ones go to src/i18n-en.js).
