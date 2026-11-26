# Inch Up – data model (ready for the database)

Everything lives on the phone first (IndexedDB, offline-first). The cloud is a copy that phones sync with.
Today the cloud is the user's own secret GitHub Gist; next it is **Firebase (Firestore + Authentication)**.

## Rules that every record follows
- **Weights are always kg.** `prefs.units` ('kg' | 'lb') only changes what is shown and typed (`src/units.js`).
- **Version:** `v` on a record = shape version; no `v` = 1. Upgrades are one-way and tolerant (unknown fields are kept)
  and live in `src/schema.js` (`V`, `normSession`). Old app versions must keep working with newer records.
- **Merge:** newer wins by the record's own time (`updated` / `t`). Deletions are tombstones (`del: true` / `deleted` map),
  never a missing row – otherwise another phone brings the record back.
- **Ids:** workouts `newId()` = base36 start time + `-` + 5 random chars (old ones: time only, imports `imp-…`, off-app marks `off…`);
  exercises `xid` (catalogue `c-…`, own `u-…`, others `x-<slug>`); trainings `plan` key (`push`, `pull`, `legs`, `chestback`, `p<i>`).

## Records (today → Firestore)
| Data | Phone (IndexedDB key) | Today in the Gist | Firestore path | Time / delete |
| --- | --- | --- | --- | --- |
| Workout | `s:<id>` | gym-backup.json `sessions` | `users/{uid}/sessions/{id}` | `updated`; tombstone doc `{ del: true, updated }` |
| Deleted workouts | `deleted` (id → time) | gym-backup.json `deleted` | same docs as above (`del: true`) | time of delete |
| Plan + own exercises + ids + renames | `plan` | gym-plan.json | `users/{uid}/meta/plan` | `t` |
| Profile + preferences | `profile` | gym-profile.json | `users/{uid}` | `updated` |
| Body weight (per day) | `weights` | gym-weights.json | `users/{uid}/weights/{YYYY-MM-DD}` | `t`; `del: true` |
| Measurements (per day) | `measures` | gym-measures.json | `users/{uid}/measures/{YYYY-MM-DD}` | `t`; `del: true` |
| Strava link | – (Gist only) | strava-auth.json, strava.json | `users/{uid}/private/strava` (server only) | – |

Workout shape (v2): `{ id, v, date, day, plan, ex: { key: [{ w, r?, d, q?, t? }] }, xid: { key: id }, started, finished, updated,
cur?, deload?, noDeload?, offApp?, manual?, swap?, extra?, ss?, notes?, tipped?, hr?… }` (see `src/types.d.ts`).

## Why Firebase for the start (checked Nov 26 2026)
- Spark plan is free with no card: Firestore 1 GiB, 50k reads / 20k writes / 20k deletes a day, Auth with Google and
  Apple sign-in (up to 50k monthly users). Our upload rhythm (`cloud.js nextDelay`: ~2-5 writes per workout) fits
  thousands of active users.
- Free projects are not paused (Supabase Free pauses a project after a week without activity – bad for a small live app).
- The web config (apiKey, projectId…) is public by design; access is guarded by Security Rules → nothing secret in this repo.
- Downsides: Cloud Functions need the Blaze plan (card, still a free quota) – needed later for Strava for other users and
  for deleting accounts server-side; vendor lock-in is limited because all cloud calls go through `src/sync.js` + `cloud.js`.

## Security rules (draft, `firestore.rules` later)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
      match /{col}/{doc} {
        allow read, write: if request.auth != null && request.auth.uid == uid
          && col in ['sessions', 'weights', 'measures', 'meta'];
      }
      match /private/{doc} { allow read, write: if false; } // server only
    }
  }
}
```

## Sync plan
1. Sign-in (Google / Apple) → `uid`. Local data stays; the first sync uploads it (or merges with what the account has – never overwrite).
2. Pull: `where('srv', '>', lastPull)` per collection (`srv` = server timestamp written on every save → a wrong phone clock can't win).
3. Push: only records changed since the last push (the store already knows them: `saveNow` / `changes`).
4. Tombstones older than a year can be dropped by the server once every device synced after them.
5. Several accounts on one phone: one IndexedDB store per uid (`createStore('gym-' + uid, 'keyval')`) – only in `src/db.js`.
6. Delete account: delete `users/{uid}` with all sub-collections (Cloud Function) + the local wipe that exists today.
