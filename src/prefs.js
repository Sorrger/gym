// Per-account training preferences (Profil → Ustawienia → Trening / Waga). Defaults = how the app always worked.
// Stored with the account (account.js: IndexedDB `profile.prefs`, synced in gym-profile.json, newer `updated` wins).
import { reactive } from 'vue'
export const DEFAULT_PREFS = {
  coach: 'auto',    // weight/rep suggestions: 'auto' (pop up when an exercise opens + chip) | 'chip' (only the chip) | 'off'
  live: true,       // advice under a set that was clearly too heavy / too light
  rir: true,        // "Zapas" chips (reps in reserve) after ticking a set
  warmup: true,     // warm-up note for barbell lifts
  autoNext: true,   // jump to the next exercise when one is done
  deload: true,     // automatic lighter week
  deloadEvery: 6,   // … every n weeks of training
  goal: 'cut',      // body weight goal: 'cut' | 'maintain' | 'bulk'
  // progression rules (Ustawienia → Progresja)
  rirUp: 3,         // every set with at least this many reps in reserve → too light, add weight now (also the top "Zapas" chip, "3+")
  repsGain: 1,      // reps to add per set next time (0 left → +0, plenty left → +1 more)
  stepKg: 2.5,      // weight step for exercises without their own step
  failN: 2,         // workouts in a row below the range before going lighter
  dropPct: 10,      // … by this much
  deloadPct: 10,    // light week: this much lighter
  deloadHalf: true, // light week: half the sets
  restTimer: false, // rest timer starts by itself after a ticked set (off for the owner – user asked)
  restSec: 120,     // … this long
  weightOn: true,   // body weight tracking (tile on Start, Waga page links); off = hidden everywhere
  goalKg: null,     // target body weight (Waga page), optional
  setTypes: false   // mark sets as warm-up / drop set / to failure (tap the set number); warm-ups don't count
}
export const prefs = reactive({ ...DEFAULT_PREFS })
export const setPrefsLocal = p => Object.assign(prefs, DEFAULT_PREFS, p || {})
export const prefsData = () => ({ ...prefs })
// colour class for a weight change per week: 'dn' = good for the goal (green), 'upw' = against it (red)
export const weightTone = v => { if (v == null || Math.abs(v) < 0.05 || prefs.goal === 'maintain') return ''; return (prefs.goal === 'bulk' ? v > 0 : v < 0) ? 'dn' : 'upw' }
// "Zapas" chips: 0 … top, the last one means "top or more"
export const rirTop = () => Math.max(3, prefs.rirUp)
export const rirLabel = q => (q >= rirTop() ? rirTop() + '+' : String(q))
// how the light week works, in words (cards, dialogs, coach)
export const deloadWords = () => [prefs.deloadHalf ? 'połowa serii' : 'te same serie', `ok. ${prefs.deloadPct}% lżej`].join(', ')
// set types (x.t): undefined = working set, 'w' warm-up (not counted anywhere), 'd' drop set, 'f' to failure
export const SET_TYPES = [undefined, 'w', 'd', 'f']
export const SET_TYPE_LABEL = { w: 'R', d: 'D', f: 'U' }
export const isWork = x => x.t !== 'w'
