// Editing sets on the Workout screen: ± steps, sets, set types, value picker, hang timer, warm-up and plates per side
import { ref } from 'vue'
import { prefs, SET_TYPES } from '../../prefs'
import { UNITS, DEF_REPS, fmtNum, WARMUP, warmupSets, platesPerSide, canon, barOf, PLATES } from '../../plan'
import { lastFor } from '../../store'
import { toU, fromU, wu, isLb, barU, plateSetU } from '../../units'
import { unlockAudio } from './beep'

/** @param {{ s: any, sets: (k: string) => any[], touch: () => void, toggle: (g: any, si: number) => void }} ctx */
export function useSetEdit(ctx) {
  const { s, sets, touch, toggle } = ctx
  // set types (Ustawienia → Trening → Rodzaje serii): tap the set number to cycle
  const TYPE_NAMES = { w: 'rozgrzewkowa', d: 'drop set', f: 'do upadku' }
  const typeName = t => TYPE_NAMES[t] || 'robocza'
  function cycleType(g, si) {
    const x = sets(g.key)[si], i = SET_TYPES.indexOf(x.t)
    const nt = SET_TYPES[(i + 1) % SET_TYPES.length]
    if (nt) x.t = /** @type {'w' | 'd' | 'f'} */ (nt); else delete x.t
    touch()
  }
  function step(g, si, dirn) {
    const a = sets(g.key), x = a[si], u = UNITS[g.unit]
    const base = x.w ?? [...a].slice(0, si).reverse().find(y => y.w != null)?.w ?? 0
    // kg exercises step in the shown unit (2,5 kg or 5 lb) and are stored back in kg
    const kg = g.unit === 'kg', shown = kg ? toU(base) : base
    const v = Math.max(0, Math.min(u.max, Math.round((shown + dirn * u.step) * 4) / 4))
    x.w = kg ? fromU(v) : v; touch()
  }
  function addSet(g) {
    const a = sets(g.key), last = a[a.length - 1]
    a.push(g.unit === 'kg' ? { w: last?.w ?? null, r: last?.r ?? DEF_REPS, d: false } : { w: last?.w ?? null, d: false }); touch()
  }
  function stepReps(g, si, d) { const x = sets(g.key)[si]; x.r = Math.max(1, Math.min(50, (x.r ?? DEF_REPS) + d)); touch() }
  function popSet(g) { sets(g.key).pop(); touch() }

  // value picker (ValuePicker.vue): which set and field, and the value it opens with
  const pickerOpen = ref(false), pickSet = ref(0), pickG = ref(null), pickField = ref('w'), pickInit = ref(0)
  function openPicker(g, si, field = 'w') {
    const a = sets(g.key)
    let v = field === 'r' ? a[si].r ?? DEF_REPS : a[si].w
    if (v == null) v = [...a].slice(0, si).reverse().find(x => x.w != null)?.w ?? lastFor(g.key, s.value)?.ex[g.key]?.[0]?.w ?? (g.unit === 'reps' ? 3 : 20)
    pickG.value = g; pickSet.value = si; pickField.value = field; pickInit.value = v
    pickerOpen.value = true
  }
  function warm(g) {
    if (!prefs.warmup) return null
    if (WARMUP[g.name] == null && WARMUP[canon(g.name)] == null) return null
    const bar = barU(barOf(g.name))
    if (bar == null || g.label) return null
    const arr = sets(g.key)
    if (arr.some(x => x.d)) return null // hidden once the first working set is done
    const W = toU(arr.find(x => x.w != null)?.w) // everything on the card in the shown unit
    const set = plateSet()
    const list = warmupSets(W, bar, set, isLb() ? 5 : 2.5)
    return list.length ? { W, sets: list, plates: platesPerSide(W, bar, set) } : null
  }
  // ---------- plates on the bar (per side) ----------
  const plateSet = () => plateSetU(PLATES)
  function platesTxt(g, si) {
    if (!prefs.plates || g.unit !== 'kg' || g.label) return ''
    const bar = barU(barOf(g.name)), a = sets(g.key), w = toU(a[si]?.w)
    if (bar == null || !(w > bar) || (si > 0 && a[si - 1].w === a[si].w)) return ''
    const pl = platesPerSide(w, bar, plateSet())
    const rest = Math.round((w - bar - 2 * pl.reduce((x, y) => x + y, 0)) * 100) / 100
    return 'Na stronę: ' + pl.map(fmtNum).join(' + ') + (rest > 0.05 ? ' (+' + fmtNum(rest) + ' ' + wu() + ')' : '') + ' · gryf ' + bar
  }
  // hang timer (HangTimer.vue): opens on the next set not done; the held seconds are saved and the set ticked
  const timer = ref(null) // { g, si, secs }
  const nextSet = g => { const a = sets(g.key); const i = a.findIndex(x => !x.d); return i < 0 ? a.length - 1 : i }
  function defaultSecs(g, si) {
    const w = sets(g.key)[si]?.w
    if (w) return Math.min(120, Math.max(5, w))
    const r = String(g.target).match(/(\d+)-(\d+)\s*s/), m = String(g.target).match(/(\d+)\s*s/)
    return r ? +r[2] : m ? +m[1] : 30
  }
  function openTimer(g) {
    unlockAudio() // sound must be unlocked by this tap (iOS)
    const si = nextSet(g)
    timer.value = { g, si, secs: defaultSecs(g, si) }
  }
  function hangSaved(secs) {
    const { g, si } = timer.value, x = sets(g.key)[si]
    x.w = Math.min(UNITS.s.max, secs); touch()
    if (!x.d) toggle(g, si)
  }
  return { typeName, cycleType, step, addSet, stepReps, popSet, pickerOpen, pickSet, pickG, pickField, pickInit, openPicker, warm, platesTxt, timer, nextSet, openTimer, hangSaved }
}
