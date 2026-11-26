// Coach on the Workout screen: today's suggestion (chip, pop-up or filled in quietly), live advice under a set,
import { fmtW, wu } from '../../units'
// the "Ostatnio…" line and the light-week explanation
import { computed, watch } from 'vue'
import { trendingUp, trendingDown, bulbOutline, trophyOutline } from 'ionicons/icons'
import { suggest, applySuggestion, live } from '../../coach'
import { prefs, deloadWords } from '../../prefs'
import { UNITS, fmtNum, rangeOf, isAssisted } from '../../plan'
import { state, lastFor, fmtShort, ago, cancelDeload } from '../../store'
import { ask } from '../../dialog'

/** @param {{ s: any, groups: any, idx: any, color: any, sets: (k: string) => any[], touch: () => void, note: any, summary: any, route: any }} ctx */
export function useTips(ctx) {
  const { s, groups, idx, color, sets, touch, note, summary, route } = ctx
  // progression hint: shown in a dialog the first time an exercise is opened in a workout (nothing ticked yet), and as a chip
  const sugs = computed(() => { void state.sessions; return s.value ? groups.value.map(g => ({ g, sug: suggest(g, s.value) })) : [] })
  const sugOf = g => { const x = sugs.value.find(y => y.g.key === g.key)?.sug; return x && x.kind !== 'first' ? x : null }
  const sugList = () => sugs.value.filter(x => x.sug && x.sug.kind !== 'first')
  const tipsShown = new Set()
  async function showTip(list) {
    if (!list.length) return
    const multi = list.length > 1
    const main = list.find(x => x.sug.kind === 'stage') || list.find(x => x.sug.kind === 'up') || list.find(x => x.sug.kind === 'down') || list[0]
    const can = list.some(x => x.sug.sets)
    const { role } = await ask({ icon: kindIcon(main.sug.kind), color: main.sug.kind === 'deload' ? '#0a84ff' : main.sug.kind === 'stage' ? '#ff9f0a' : color.value,
      title: multi ? (main.sug.kind === 'stage' || main.sug.kind === 'deload' ? main.sug.title : 'Podpowiedź na dziś') : main.sug.title,
      message: [...new Set(list.map(x => x.sug.note).filter(Boolean)), ...list.map(x => (multi ? x.g.label + ': ' : '') + x.sug.text)].join('\n\n'),
      buttons: can ? [{ text: multi ? 'Ustaw w seriach' : 'Ustaw: ' + main.sug.short, role: 'apply', kind: 'primary' }, { text: 'Zostaw jak jest', role: 'cancel' }]
        : [{ text: 'OK', role: 'cancel', kind: 'primary' }] })
    if (role === 'apply') { list.forEach(x => applySuggestion(sets(x.g.key), x.sug, x.g.unit)); touch() }
  }
  const lastDone = g => sets(g.key).reduce((k, x, i) => (x.d ? i : k), -1)
  const liveOf = g => (s.value && prefs.live ? live(g, s.value) : null)
  function applyLive(g) {
    const t = liveOf(g)
    if (!t) return
    sets(g.key).forEach(x => { if (!x.d) { x.w = t.w; x.r = t.r } })
    touch()
  }
  function kindIcon(k) { return k === 'up' ? trendingUp : k === 'down' || k === 'deload' ? trendingDown : k === 'stage' ? trophyOutline : bulbOutline }
  async function deloadInfo() {
    const { role } = await ask({ icon: trendingDown, color: '#0a84ff', title: 'Tydzień lżejszy (deload)',
      message: 'Co kilka tygodni apka sama robi lżejszy tydzień: te same ćwiczenia, ' + deloadWords() + ' i 3-4 powtórzenia w zapasie. Zmęczenie schodzi, stawy odpoczywają, a po nim wracasz do normalnych ciężarów – zwykle z nową siłą.',
      buttons: s.value.finished ? [{ text: 'OK', role: 'ok', kind: 'primary' }]
        : [{ text: 'OK', role: 'ok', kind: 'primary' }, { text: 'Dziś trenuj normalnie', role: 'normal', kind: 'soft' }] })
    if (role === 'normal') { cancelDeload(s.value); state.flash = 'Normalny trening – lżejszy tydzień za tydzień' }
  }
  function lastText(g) {
    const p = lastFor(g.key, s.value)
    const rg = rangeOf(g.target)
    if (!p && isAssisted(g)) return `Pierwszy raz. Dobierz wspomaganie (kg pomocy) na ${rg.lo}-${rg.hi} powtórzeń.`
    if (!p) return g.unit === 'kg' ? (rg ? `Pierwszy raz. Dobierz ciężar na ${rg.lo}-${rg.hi} powtórzeń.` : 'Pierwszy raz. Ustaw ciężar dla serii.') : 'Pierwszy raz. Ustaw wartość dla serii.'
    const done = p.ex[g.key].filter(x => x.d && x.w != null)
    const txt = g.unit === 'kg' && done.some(x => x.r)
      ? done.map(x => fmtW(x.w) + (x.r ? '×' + x.r : '')).join(' · ') + ' ' + wu()
      : done.map(x => fmtNum(x.w)).join(' · ') + ' ' + UNITS[g.unit].short
    return 'Ostatnio ' + fmtShort(p.date) + ' (' + ago(p.date) + '): ' + txt
  }
  watch(() => [s.value?.id, idx.value, summary.value], () => {
    const sess = s.value
    if (!sess || sess.finished || summary.value || !route.path.startsWith('/workout') || (prefs.coach !== 'auto' && prefs.coach !== 'set')) return
    const k = sess.id + ':' + idx.value
    // remembered in the workout itself, so leaving the app (or a reload) doesn't show it again
    const seen = (sess.tipped ||= [])
    const mark = key => { if (!seen.includes(key)) seen.push(key) }
    if (tipsShown.has(k) || seen.includes(idx.value)) return
    tipsShown.add(k); mark(idx.value)
    if (groups.value.some(g => (sess.ex[g.key] || []).some(x => x.d))) return
    // light week: the numbers are already set, so explain it once per workout (the chip stays on every exercise)
    if (sess.deload && sugList().every(x => x.sug.kind === 'deload')) { if (seen.includes('dl')) return; mark('dl') }
    const list = sugList()
    if (!list.length) return
    if (prefs.coach === 'set') { autoSet(list); return }
    setTimeout(() => { if (s.value?.id === sess.id && idx.value === +k.split(':')[1]) showTip(list) }, 450)
  }, { immediate: true })
  // quiet mode: put today's suggestion straight into the sets, a short note says what changed (the chip still explains why)
  function autoSet(list) {
    const can = list.filter(x => x.sug.sets)
    if (!can.length) { note.value = list[0].sug.title || ''; return } // light week / new stage: numbers are set already, just say so
    can.forEach(x => applySuggestion(sets(x.g.key), x.sug, x.g.unit)); touch()
    const main = can.find(x => x.sug.kind === 'up') || can.find(x => x.sug.kind === 'down') || can[0]
    note.value = can.length > 1 ? 'Ustawiono podpowiedź na dziś' : 'Ustawiono: ' + main.sug.short
  }
  return { sugOf, sugList, showTip, autoSet, kindIcon, lastDone, liveOf, applyLive, deloadInfo, lastText }
}
