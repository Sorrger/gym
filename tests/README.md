# Tests

| Command | What it checks |
| --- | --- |
| `npm run lint` | ESLint (JS + Vue) – unused code, mistakes |
| `npm test` | Logic tests in plain node (`tests/logic/t.mjs` + `t2.mjs`): coach / progression, light week, pull-up stages, which training today, own plans, settings, stats, records, weight log, backup merge, auto-close, English texts |
| `npm run e2e` | Click-through tests in a real browser (iPhone size) against the built app – run `npm run build` first |
| `npm run e2e -- nav add` | only these e2e scripts |
| `npm run check` | everything above, in order |

CI (`.github/workflows/test.yml`) runs lint + logic + build, and in a second job all e2e scripts with Playwright's Chromium.

## e2e scripts (`tests/e2e`)

`run.mjs` starts `vite preview` on port 4173 and runs each script. A script fails when it crashes, prints a line starting with
`FAIL`, or reports page errors (`errs [ … ]`). Browser: Playwright's own Chromium, or set `CHROME=/path/to/chrome`.
`lib.mjs` starts the browser; every new phone skips the first-start screen unless created with `{ fresh: true }`.
`seed.mjs` puts realistic workouts into the phone. Date-dependent scripts pin the clock.

- `e2e_on` – workout flow: tip dialog → Ustaw → tick → Zapas → summary → save → history
- `full` – empty workout, picker, two plans at once, done-without-app mark, edit from history, hang timer, GitHub backup upload, restore on a 2nd phone, file export + import on a 3rd, offline reload
- `nav` – every tab, sub-page back buttons, deep links, reloads, old paths
- `add` – add a finished workout (with / without sets)
- `swap` – swap a busy machine
- `edit2`, `plans`, `edge` – plan editor, own trainings, edge cases
- `dl2` – light week (deload)
- `prefs`, `prog2`, `rec`, `rest` – settings, progression rules, records, rest timer + set types
- `ban2` – Start banner, first-start interview
- `weight-quick` – weight from the Start tile
- `theme` – light / dark
- `en` – English
- `crawl` (not in the default list) – collects every visible text in English mode; Polish leftovers go to `src/i18n-en.js`
