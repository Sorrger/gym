// Weight units. Everything is STORED in kg; only what is shown and typed follows prefs.units ('kg' | 'lb').
// prefs.js hands its reactive object in (bindPrefs) – no import here, so plan.js (and the Strava script that
// imports it in a bare node without node_modules) doesn't pull in vue
let prefs = { units: 'kg', barKg: 20, barLb: 45, plateSet: null, plateSetLb: null }
export const bindPrefs = p => { prefs = p }

export const LB = 2.20462262
export const isLb = () => prefs.units === 'lb'
export const wu = () => (isLb() ? 'lb' : 'kg')
// kg → shown number, shown number → kg (kept precise, so 135 lb stays 135 lb)
export const toU = kg => (kg == null ? kg : isLb() ? kg * LB : kg)
export const fromU = v => (v == null ? v : isLb() ? Math.round((v / LB) * 1e5) / 1e5 : v)
const num = v => String(+(+v).toFixed(2)).replace('.', ',')
// lb shown to 0,1 (a kg history converted to lb would otherwise read 176,37)
export const fmtW = kg => (kg == null ? '–' : num(isLb() ? Math.round(kg * LB * 10) / 10 : kg))
export const fmtWU = kg => fmtW(kg) + ' ' + wu()
// ± step on the screen (2,5 kg / 5 lb) and the biggest weight
export const uStep = () => (isLb() ? 5 : 2.5)
export const uMax = () => (isLb() ? 660 : 300)
// a kg step from the plan (2,5 / 1,25 / 5 kg) → the nearest lb step a gym has (5 / 2,5 / 10 lb), in kg
export function stepU(kg) {
  if (!isLb()) return kg
  const lb = Math.max(2.5, Math.round((kg * LB) / 2.5) * 2.5)
  return lb / LB
}
// plates and bars in the chosen unit
export const ALL_PLATES_LB = [45, 35, 25, 15, 10, 5, 2.5, 1.25]
export const BARS_LB = [45, 35, 25]
// bar of an exercise in shown units: barOf() gives 20 (standard bar), 10 (EZ) or null
export function barU(kgBar) {
  if (kgBar == null) return null
  if (!isLb()) return kgBar === 20 ? prefs.barKg : kgBar
  return kgBar === 10 ? 25 : prefs.barLb || 45
}
export const plateSetU = def => (isLb() ? (prefs.plateSetLb?.length ? prefs.plateSetLb : ALL_PLATES_LB.slice(0, 6)) : prefs.plateSet?.length ? prefs.plateSet : def)
// volume (kg × reps): tonnes in kg, thousands in lb
export function fmtVol(kg) {
  if (isLb()) { const v = kg * LB; return v >= 10000 ? Math.round(v / 1000).toLocaleString('pl-PL') + 'k lb' : Math.round(v).toLocaleString('pl-PL') + ' lb' }
  return kg >= 10000 ? (Math.round(kg / 100) / 10).toFixed(1).replace('.', ',') + ' t' : Math.round(kg).toLocaleString('pl-PL') + ' kg'
}
