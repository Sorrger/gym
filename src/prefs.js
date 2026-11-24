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
  goal: 'cut'       // body weight goal: 'cut' | 'maintain' | 'bulk'
}
export const prefs = reactive({ ...DEFAULT_PREFS })
export const setPrefsLocal = p => Object.assign(prefs, DEFAULT_PREFS, p || {})
export const prefsData = () => ({ ...prefs })
// colour class for a weight change per week: 'dn' = good for the goal (green), 'upw' = against it (red)
export const weightTone = v => { if (v == null || Math.abs(v) < 0.05 || prefs.goal === 'maintain') return ''; return (prefs.goal === 'bulk' ? v > 0 : v < 0) ? 'dn' : 'upw' }
