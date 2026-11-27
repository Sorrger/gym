<template>
  <div>
    <!-- body weight (logged on the Waga page) -->
    <button v-if="prefs.weightOn" class="card wcard press" @click="router.push('/tabs/progress/weight')">
      <div class="wc-l">
        <small>Waga · średnia 7 dni</small>
        <b class="num">{{ wNow == null ? 'Dodaj pomiar' : fmt(wNow) + ' ' + wu() }}</b>
        <span v-if="wTr != null" class="num" :class="weightTone(wTr)">{{ wTr > 0 ? '+' : '' }}{{ fmt(wTr, 2) }} {{ wu() }} / tydzień</span>
      </div>
      <svg v-if="wLine" class="wc-spark" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true"><path :d="wLine" /></svg>
      <ion-icon :icon="chevronForward" class="pc-chev" />
    </button>
    <!-- circumferences (Obwody page) -->
    <button class="card wcard mcard press" @click="router.push('/tabs/progress/measures')">
      <div class="wc-l">
        <small>Obwody</small>
        <template v-if="mTop.length">
          <span v-for="m in mTop" :key="m.id" class="mrow-t num"><b>{{ m.name }} {{ fmt(m.cm) }} cm</b><em v-if="m.d != null" :class="m.tone">{{ m.d > 0 ? '+' : m.d < 0 ? '−' : '±' }}{{ fmt(Math.abs(m.d)) }}</em></span>
        </template>
        <b v-else class="m-empty">Dodaj obwody</b>
      </div>
      <ion-icon :icon="chevronForward" class="pc-chev" />
    </button>
    <!-- per body part -->
    <h3 class="section-title">Partie ciała · serie na tydzień</h3>
    <div class="card muscles">
      <div class="mm-map">
        <BodyMap :main="mapMain" :help="mapHelp" labels :style="{ '--c': 'var(--accent)' }" />
      </div>
      <div class="mm-legend">
        <span><i class="lg main"></i>10+ serii</span>
        <span><i class="lg help"></i>4–10</span>
        <span><i class="lg none"></i>mniej</span>
      </div>
      <div class="mm-list">
        <div v-for="m in muscleRows" :key="m.id" class="mrow">
          <span class="m-name">{{ SHORT[m.id] || m.name }}</span>
          <div class="m-bar"><span :class="m.level" :style="{ width: m.pct + '%' }"></span><i class="zone"></i></div>
          <span class="m-val num">{{ fmtSets(m.v) }}</span>
        </div>
      </div>
    </div>
    <p class="section-foot">Średnio na tydzień. Mięsień główny = 1 seria, pomocniczy = ½. Zielone pole = 10–20 serii, zakres, który daje najwięcej.</p>

    <h3 class="section-title">Balans ciała</h3>
    <div class="card radar-card">
      <svg class="radar" viewBox="0 0 320 290" role="img" :aria-label="'Balans: ' + radar.axes.map(a => a.name + ' ' + fmtSets(a.v)).join(', ')">
        <path v-for="r in [0.25, 0.5, 0.75, 1]" :key="r" :d="radar.ring(r)" class="grid" />
        <line v-for="(a, i) in radar.axes" :key="'l' + i" :x1="CX" :y1="CY" :x2="a.ex" :y2="a.ey" class="spoke" />
        <path :d="radar.shape" class="shape" />
        <path :d="radar.planShape" class="grid ten" />
        <circle v-for="(a, i) in radar.axes" :key="'p' + i" :cx="a.px" :cy="a.py" r="5" class="pt" :class="a.level" />
        <g v-for="(a, i) in radar.axes" :key="'t' + i">
          <text :x="a.lx" :y="a.ly" :text-anchor="a.anchor" class="ax-name">{{ a.name }}</text>
          <text :x="a.lx" :y="a.ly + 15" :text-anchor="a.anchor" class="ax-val" :class="a.level">{{ fmtSets(a.v) }} serii</text>
        </g>
      </svg>
      <div class="verdict">
        <div class="v-score" :class="{ early: radar.early }"><b class="num">{{ radar.early ? '…' : radar.balance + '%' }}</b><small>wg planu</small></div>
        <p>{{ radar.text }}</p>
      </div>
    </div>
    <p class="section-foot">Przerywana linia = rozkład z Twojego planu (nogi mniej – celowo). 100% = trenujesz dokładnie wg planu.</p>
  </div>
</template>

<script setup>
// Postępy → Ciało: body weight card, sets per week per muscle, balance radar vs the plan
import { computed } from 'vue'
import { useIonRouter, IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import BodyMap from '../BodyMap.vue'
import { prefs, weightTone } from '../../prefs'
import { state } from '../../store'
import { muscleWeek, muscleSets, plansDone, planMuscleSets } from '../../stats'
import { MUSCLE_NAMES } from '../../muscles'
import { weightsU as weights, smooth, paceToday } from '../../weight'
import { wu } from '../../units'
import { usePlans } from './plans'
import { PARTS, byPart } from '../../measures'

const props = defineProps({ period: Number }) // days, or null = all time
const router = useIonRouter()
const plans = usePlans()
const nPlans = computed(() => plans.value.length)

const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',')
const fmtSets = v => String(Math.round(v * 2) / 2).replace('.', ',')
const wS = computed(() => smooth(weights.value).slice(-30))
const wNow = computed(() => (wS.value.length ? wS.value.at(-1).avg : null))
const wTr = computed(() => paceToday(weights.value)?.kg ?? null)
const wLine = computed(() => {
  const v = wS.value.map(p => p.avg); if (v.length < 2) return ''
  const lo = Math.min(...v), hi = Math.max(...v, lo + 0.5)
  return v.map((y, i) => (i ? 'L' : 'M') + (i / (v.length - 1) * 116 + 2).toFixed(1) + ' ' + (40 - (y - lo) / (hi - lo) * 36).toFixed(1)).join(' ')
})

// up to 3 tracked parts (waist first – the best fat marker), with the change since the first measurement
const mTop = computed(() => PARTS.filter(p => byPart.value[p.id]).slice(0, 3).map(p => {
  const d = byPart.value[p.id], ch = d.pts.length > 1 ? d.change : null
  const tone = ch == null || p.up == null || Math.abs(ch) < 0.25 ? '' : (p.up ? ch > 0 : ch < 0) ? 'ok' : 'bad'
  return { id: p.id, name: p.name, cm: d.last.cm, d: ch, tone }
}).sort((a, b) => Number(b.id === 'waist') - Number(a.id === 'waist')))
const all = computed(() => { void state.sessions; return muscleSets(props.period) })
const done = computed(() => { void state.sessions; return plansDone(props.period) })
const mw = computed(() => { void state.sessions; return muscleWeek(props.period) })
const SHORT = { lats: 'Najszersze', upperback: 'Górne plecy', quads: 'Czworogłowe', hamstrings: 'Dwugłowe ud', reardelts: 'Tył barków', obliques: 'Skośne brzucha' }
const ORDER = ['chest', 'shoulders', 'reardelts', 'triceps', 'biceps', 'lats', 'upperback', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques']
const SCALE = 24 // bar = 0..24 sets/week; the 10–20 zone is drawn behind
const muscleRows = computed(() => ORDER.concat(mw.value.adductors ? ['adductors'] : []).map(id => {
  const v = mw.value[id] || 0
  return { id, name: MUSCLE_NAMES[id], v, pct: Math.min(100, v / SCALE * 100), level: v >= 10 ? 'main' : v >= 4 ? 'help' : 'low' }
}))
const mapMain = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 10))
const mapHelp = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 4 && mw.value[k] < 10))

// radar: 6 body groups scaled to the most trained one (= outer ring); the dashed shape is the plan's own distribution,
// and the score compares actual/plan per group, so groups that are small on purpose (legs) are not flagged
const CX = 160, CY = 145, R = 100
/** @type {[string, string[]][]} */
const GROUPS = [
  ['Klatka', ['chest']], ['Plecy', ['lats', 'upperback']], ['Barki', ['shoulders', 'reardelts']],
  ['Ręce', ['biceps', 'triceps']], ['Nogi', ['quads', 'hamstrings', 'glutes']], ['Brzuch', ['abs']]
]
const planSets = planMuscleSets()
const path = P => P.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ') + ' Z'
const radar = computed(() => {
  const n = GROUPS.length
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] }
  const raw = GROUPS.map(([, ids]) => ids.reduce((a, id) => a + (all.value[id] || 0), 0) / ids.length)
  const max = Math.max(...raw)
  const ring = pct => path(GROUPS.map((_, i) => pt(i, R * pct)))
  const axes = GROUPS.map(([name], i) => {
    const v = raw[i], rel = max ? v / max : 0
    const [px, py] = pt(i, R * Math.max(rel, 0.04)), [ex, ey] = pt(i, R), [lx, ly] = pt(i, R + 22)
    const anchor = Math.abs(lx - CX) < 8 ? 'middle' : lx > CX ? 'start' : 'end'
    return { name, v, rel, px, py, ex, ey, lx, ly: ly < CY - 40 ? ly - 8 : ly > CY + 40 ? ly + 4 : ly - 4, anchor, fit: 0, level: 'ok' }
  })
  const shape = path(axes.map(a => [a.px, a.py]))
  const plan = GROUPS.map(([, ids]) => ids.reduce((a, id) => a + (planSets[id] || 0), 0) / ids.length)
  const pmax = Math.max(...plan) || 1
  const planShape = path(plan.map((v, i) => pt(i, R * Math.max(v / pmax, 0.04))))
  const ratio = raw.map((v, i) => (plan[i] ? v / plan[i] : 1)), rmax = Math.max(...ratio) || 1
  axes.forEach((a, i) => { a.fit = ratio[i] / rmax; a.level = a.fit >= 0.7 ? 'ok' : a.fit >= 0.4 ? 'mid' : 'low' })
  const balance = max > 0 ? Math.round(Math.min(...ratio) / rmax * 100) : 0
  const weak = axes.filter(a => a.fit < 0.7).sort((a, b) => a.fit - b.fit)
  const strong = axes.slice().sort((a, b) => b.v - a.v)[0]
  let text
  if (!max) text = 'Jeszcze brak treningów – wykres pojawi się po pierwszym.'
  else if (done.value < nPlans.value) text = `${props.period ? 'W tym okresie zrobiłeś' : 'Zrobiłeś'} ${done.value} z ${nPlans.value} treningów planu (${plans.value.map(p => p.name).join(', ')}). Wykres wyrówna się, gdy zrobisz każdy choć raz – dopiero wtedy widać prawdziwy balans.`
  else if (!weak.length) text = `Trenujesz zgodnie z planem. Najwięcej pracy: ${strong.name.toLowerCase()} – tak jak chcesz. Nogi mniej, bo tak jest zaplanowane.`
  else text = `Mniej niż zakłada plan: ${weak.map(a => a.name + ' ' + Math.round(a.fit * 100) + '%').join(', ')}. Pewnie pomijasz tam serie albo ćwiczenia.`
  return { axes, shape, planShape, ring, balance, text, early: done.value < nPlans.value }
})
</script>

<style scoped>
.wcard { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 0 16px 6px; padding: 14px 14px 14px 16px; border: 0; text-align: left; font: inherit; color: inherit; }
.wc-l { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.wc-l small { font-size: 13px; color: var(--app-muted); }
.wc-l b { font-size: 24px; font-weight: 700; letter-spacing: -.3px; }
.wc-l span { font-size: 13px; color: var(--app-muted); font-weight: 600; }
.wc-l span.dn { color: var(--app-ok); }
.wc-l span.upw { color: var(--app-bad); }
.wc-spark { width: 96px; height: 40px; flex: none; }
.wc-spark path { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.mcard .mrow-t { display: flex; gap: 8px; align-items: baseline; margin-top: 2px; }
.mcard .mrow-t b { font-size: 17px; font-weight: 700; color: var(--ion-text-color); }
.mcard .mrow-t em { font-style: normal; font-size: 13px; font-weight: 600; color: var(--app-muted); }
.mcard .mrow-t em.ok { color: var(--app-ok); } .mcard .mrow-t em.bad { color: var(--app-bad); }
.mcard .m-empty { font-size: 20px; }
.pc-chev { font-size: 18px; opacity: .8; }
.muscles { margin: 0 16px; padding: 16px; }
.mm-map { height: 170px; display: flex; justify-content: center; }
.mm-legend { display: flex; justify-content: center; gap: 14px; margin: 8px 0 12px; font-size: 12px; color: var(--app-muted); }
.mm-legend span { display: flex; align-items: center; gap: 5px; }
.lg { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.lg.main { background: var(--accent); }
.lg.help { background: color-mix(in srgb, var(--accent) 40%, transparent); }
.lg.none { background: color-mix(in srgb, var(--ion-text-color) 12%, transparent); }
.mm-list { display: flex; flex-direction: column; gap: 9px; }
.mrow { display: grid; grid-template-columns: 118px 1fr 34px; align-items: center; gap: 10px; font-size: 14px; }
.m-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-bar { position: relative; height: 10px; border-radius: 999px; background: var(--app-field); overflow: hidden; }
.m-bar .zone { position: absolute; left: calc(10 / 24 * 100%); width: calc(10 / 24 * 100%); top: 0; bottom: 0; background: color-mix(in srgb, var(--app-ok) 16%, transparent); }
.m-bar span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; z-index: 1; transition: width .5s cubic-bezier(.2,.8,.2,1); }
.m-bar span.main { background: var(--accent); }
.m-bar span.help { background: color-mix(in srgb, var(--accent) 55%, transparent); }
.m-bar span.low { background: var(--app-bad); }
.m-val { text-align: right; font-weight: 600; color: var(--app-muted); }
.radar-card { margin: 0 16px; padding: 12px 8px 16px; }
.radar { width: 100%; height: auto; display: block; overflow: visible; }
.radar .zone { fill: color-mix(in srgb, var(--app-ok) 12%, transparent); }
.radar .grid { fill: none; stroke: var(--app-line); stroke-width: 1; }
.radar .grid.ten { stroke: color-mix(in srgb, var(--accent) 45%, transparent); stroke-dasharray: 4 4; stroke-width: 1.4; }
.radar .spoke { stroke: var(--app-line); stroke-width: 1; }
.radar .shape { fill: color-mix(in srgb, var(--accent) 22%, transparent); stroke: var(--accent); stroke-width: 2.5; stroke-linejoin: round; }
.radar .pt { stroke: var(--app-card); stroke-width: 2; }
.radar .pt.ok, .radar .ax-val.ok { fill: var(--app-ok); }
.radar .pt.mid, .radar .ax-val.mid { fill: #ff9f0a; }
.radar .pt.low, .radar .ax-val.low { fill: var(--app-bad); }
.radar .ax-name { font-size: 13px; font-weight: 600; fill: var(--ion-text-color); }
.radar .ax-val { font-size: 12px; font-weight: 600; }
.verdict { display: flex; gap: 14px; align-items: center; margin: 4px 8px 0; padding-top: 12px; border-top: 1px solid var(--app-line); }
.v-score { display: flex; flex-direction: column; align-items: center; flex: none; min-width: 64px; }
.v-score b { font-size: 26px; font-weight: 700; letter-spacing: -.5px; color: var(--accent); }
.v-score.early b { color: var(--app-faint); }
.v-score small { font-size: 11px; color: var(--app-muted); }
.verdict p { margin: 0; font-size: 14px; line-height: 1.4; color: var(--app-muted); }
</style>
