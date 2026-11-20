# Gym – osobista aplikacja treningowa (PWA na iPhone)

Read this first in every session. It is the project's memory: who the user is, how the app works, how to ship.

## User
- Owner: GitHub `Sorrger`. Uses the app on an iPhone 16 as a home-screen web app. No Mac.
- Writes in Polish, often fast with typos. **Reply in Polish, short and simple, non-technical.** Give clear step-by-step instructions when they must do something on the phone.
- Prefers that you finish things completely (build, test, deploy) instead of handing work back.

## Live app / deploy
- URL: https://sorrger.github.io/gym/ (GitHub Pages, source = branch `main`, folder `/docs`).
- **Ship = `npm run deploy`** (scripts/deploy.mjs): builds into `docs/`, commits, pushes `main`. Pages updates in ~1 min.
  `docs/` is build output: never edit it by hand, always rebuild.
- In a cloud session (Claude app on the phone / claude.ai/code): `npm ci` first, then edit, `npm run build` to check, `npm run deploy` to publish.
  The live site only changes when `docs/` lands on `main`. If the session can only push to its own `claude/...` branch,
  open a PR and tell the user in one line to tap "Merge" in the GitHub app – after merging, the app updates in ~1 min.
- If Pages ever serves an old version after a push: `gh api -X POST repos/Sorrger/gym/pages/builds` re-triggers the build.
- The phone gets the new version on next open/return to the app: full-screen "Aktualizacja" with a progress ring (src/updater.js), then reload.

## Stack
Vite + Vue 3 + Ionic Vue 9 (mode `ios`), vue-router hash history, idb-keyval (IndexedDB), Chart.js, vite-plugin-pwa (injectManifest, `src/sw.js`).

## Files
- `src/plan.js` – the training plan (PLAN, COLORS, UNITS). Multi-part exercises (e.g. "Nauka podciągania" = Wiszenie (s) + Negatywy (reps)) via `groupsOf`/`entriesOf`; each part stored under key `"Name · Part"`. A plain exercise can set its unit as 4th element instead of parts (`[name, target, null, 'reps']`, e.g. captain's chair).
  Abs: Pull ends with captain's chair (reps) + Allahy; Nogi ends with Pallof press (user called it "hammer press": sideways to the cable, press out, hold 2 s, per side) + captain's chair + Allahy.
- **Progression (double progression)** – `src/coach.js` `suggest(group, session)`; rep range comes from the target (`rangeOf('3 × 6-8')`), per-exercise kg step in `INC` (default 2,5), `ASSISTED` (less kg = harder), `HARDER` texts for bodyweight/time parts – all in plan.js.
  All planned sets at the top of the range → +INC and start at the bottom; else same weight, +1 rep per set; two workouts in a row below the bottom → ~10 % lighter.
  Workout screen: dialog the first time an exercise is opened in a workout (nothing ticked) with "Ustaw: …" (fills unticked sets), plus a chip under "Ostatnio…" that reopens it.
  Ranges agreed with the user (researched; growth works ~6-30 reps near failure, so ranges were picked for comfort/progression): heavy compounds 6-8 (bench, Zercher, OHP, assisted pull-ups); rows, pulldowns, incline press, RDL, skull crushers (francuskie) 8-10; incline DB curl 8-12 (replaced spider curl); machines, shrugs, Pallof, cable triceps 10-12; laterals, flyes, butterfly 10-15; face pulls 12-15; calves 12-15.
- `src/muscles.js` – MUSCLES: exercise name → [main, helping] muscle ids; `dayMuscles(day)`. **Add an entry for every new exercise.**
  `src/views/BodyMap.vue` – offline SVG front+back figure, main muscles in plan colour (`--c`), helping ones faded. Shown next to the exercise title (Workout) and on the plan cards (Home).
- `src/store.js` – sessions in IndexedDB key `sessions` (`id -> { id, date, day, ex: { key: [{ w, r?, d }] }, started, finished, updated, cur }`).
  `w` = kg / seconds / reps depending on the part's unit, `r` = reps per set (only kg exercises, default `DEF_REPS` = 6).
  New workout pre-fills weight AND reps from the newest earlier session where that exercise had any value; set count from the last session where it was ticked.
  **Auto-save:** every change is written to IndexedDB immediately (sync watcher + microtask), plus on hide/pagehide – killing the app loses nothing, online or offline. Workout screen shows "Zapisano…".
  Finishing an empty workout discards it. Open workout idle >12 h: closed (kept) if anything was ticked or edited by hand, dropped only if never touched.
  `suggestedDay()` follows the weekly schedule `WEEKDAY_TO_DAY` (Mon Push, Tue Pull, Thu Legs, Fri Upper): today's plan ("Dziś"), else the next scheduled one ("Następny").
- `src/cloud.js` – automatic backup to a secret GitHub Gist file `gym-backup.json` a few seconds after any change; token pasted by the user in tab "Kopia" and stored only on the phone (IndexedDB key `cloud`). Connecting finds an existing gist and merges it (= restore on a new phone).
- `src/updater.js` + `src/sw.js` – offline cache + updates. New SW waits (no auto skipWaiting) and is activated only at app start/resume behind the update screen. Marker cache `gym-updater-v1` = one-time migration from the old SW. Do not reintroduce auto skipWaiting: swapping files under a running page broke navigation before.
- `src/views/` – Home (Start), Workout (one exercise at a time; per set: weight ± step and reps ±1, both with a wheel picker; hang parts (unit `s`) have a "Minutnik": dial to set seconds (knob 5–120 s) → 5-4-3-2-1 → counts down to 0 with beeps → saves the seconds and ticks the set, Stop early saves the seconds held; summary), Progress (+ ExerciseView chart), History (calendar), Settings ("Kopia": GitHub backup + JSON file export/import), Tabs.
- `src/dialog.js` + `src/views/AppDialog.vue` – custom confirm dialog (bottom card, icon, big stacked buttons, blur). Use `ask({ icon, color, title, message, input?, buttons:[{text, role, kind:'primary'|'danger'|'soft'|'plain'}] })` → `{ role, value }`. Do not use Ionic alertController.
- `src/nobounce.js` – blocks iOS touch-drag/rubber-band unless the touch is inside something that can really scroll (overlays and short screens don't move).
- **Strava** (heart rate from the Garmin watch; Garmin auto-uploads to Strava). `src/strava.js` (app) + `scripts/strava-sync.mjs` run by `.github/workflows/strava.yml` every 10 min (+ manual "Run workflow"); skips all Strava calls when no workout was touched in the last 36 h. Switches itself off after `END_DATE` (2026-12-31, user request) – to resume: change END_DATE and "Enable workflow" in Actions.
  Repo secrets: `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `GIST_TOKEN` (gist scope). All data goes through the backup gist: app writes `strava-auth.json` `{code}` after the Strava login
  (`?code=` on return; in Safari it shows "Kopiuj kod" → user pastes in Kopia → Strava → Wklej kod); the Action swaps it for a refresh token (kept in that file), pulls strength activities
  (avg/max HR, kcal, time, HR stream), matches them to workouts by start time (±90 min / overlap), writes the exercise list + worked muscles ("💪 Partie") into the Strava description (block starting `🏋️ Gym`) and renames default-named activities to "<Plan> · Gym 🏋️" (Strava API cannot write its native exercise log / muscle map – as of Nov 2026), saves `strava.json`.
  App shows `svText()` in History rows and on the summary screen. The app never sees the Strava secret. Test the script with a mocked fetch (no network to Strava from the sandbox).
- `src/theme.css` – design system: iOS look, violet accent `--accent`, plan colours only as identity, `.card`, `.stats`, `.ios-group`/`.row`, `.btn`, `.plan-ico`, large collapsing titles (ion-header collapse="condense").
- `public/icon-*.png` – app icon (white biceps on violet gradient). Name "Gym" in vite.config.js manifest + index.html.

## Rules (data safety)
- Never lose or overwrite workout data. If IndexedDB can't be read, `state.loadError` blocks all saves and uploads.
- A phone with no workouts must never overwrite a gist that has workouts (cloud.js restores instead).
- Keep everything working offline (gym has bad signal). No external runtime dependencies (fonts/CDNs).
- Keep UI text Polish.

## Testing
- Before deploying UI/logic changes: `npm run build`, then `npx vite preview` and click through: start workout, ±, picker, tick sets, finish/summary/save, history, progress, Kopia tab, tab bar navigation.
- Earlier sessions used Playwright (playwright-core + headless Edge, iPhone viewport, mocked api.github.com) – 34 checks incl. offline reload, backup upload/restore, update flow. Recreate similar checks when making bigger changes.

## Ideas the user floated (not done)
- Garmin Connect direct link (unofficial login) – user said no; Strava instead.
- HR chart per workout (data `hrs` already in strava.json).
- Pull-up part reps-only without weight; hang timer only for that exercise.
