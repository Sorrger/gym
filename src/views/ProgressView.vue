<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }" aria-hidden="true"><span>Postępy</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head">
        <h1 class="t-large">Postępy</h1>
        <p class="sub">{{ periodLabel }}</p>
      </header>
      <div class="page">
        <!-- three parts instead of one long scroll -->
        <nav class="ptabs" role="tablist">
          <button v-for="t in TABS" :key="t.v" role="tab" class="press" :class="{ on: tab === t.v }" @click="ui.ptab = t.v">{{ t.t }}</button>
        </nav>
        <ion-segment v-if="tab !== 'plans'" class="period" :value="String(ui.period ?? 'all')" @ionChange="e => (ui.period = e.detail.value === 'all' ? null : +e.detail.value)">
          <ion-segment-button value="28"><ion-label>4 tygodnie</ion-label></ion-segment-button>
          <ion-segment-button value="91"><ion-label>3 miesiące</ion-label></ion-segment-button>
          <ion-segment-button value="all"><ion-label>Całość</ion-label></ion-segment-button>
        </ion-segment>

        <template v-if="tab === 'all'">
        <!-- hero: strength since start + trend line, then the period numbers -->
        <div class="hero">
          <div class="h-top">
            <div>
              <small>Siła od startu</small>
              <b class="num">{{ avgGain == null ? '–' : (avgGain > 0 ? '+' : avgGain < 0 ? '−' : '±') + Math.abs(avgGain) + '%' }}</b>
              <span class="h-sub">{{ avgGain == null ? 'pojawi się po 2 treningach' : 'średnio ze wszystkich ćwiczeń' }}</span>
            </div>
            <svg v-if="trend.line" class="h-spark" viewBox="0 0 140 60" preserveAspectRatio="none" aria-hidden="true">
              <path :d="trend.area" class="a" /><path :d="trend.line" class="l" /><circle :cx="trend.x" :cy="trend.y" r="3.5" class="d" />
            </svg>
          </div>
          <div class="h-stats num">
            <div><b>{{ ov.workouts }}</b><small>treningi</small></div>
            <div><b>{{ ov.sets }}</b><small>serie</small></div>
            <div><b>{{ ov.prs }}</b><small>rekordy <Ico name="trophy" /></small></div>
            <div><b>{{ fmtTon(ov.vol) }}</b><small>objętość</small></div>
          </div>
        </div>

        <!-- consistency: workouts per week -->
        <h3 class="section-title">Regularność</h3>
        <div class="card weeks">
          <div class="w-head">
            <div><b class="num">{{ wk[wk.length - 1].n }}</b><span> z {{ nPlans }} w tym tygodniu</span></div>
            <span class="w-avg num">śr. {{ wkAvg }} / tydz.</span>
          </div>
          <div class="w-bars" aria-hidden="true">
            <div v-for="w in wk" :key="w.from" class="w-col" :class="{ now: w.now, full: w.n >= nPlans }">
              <span class="w-n num">{{ w.n || '' }}</span>
              <i :style="{ height: Math.max(4, w.n / wkMax * 100) + '%' }"></i>
              <small class="num">{{ w.label }}</small>
            </div>
          </div>
        </div>

        <!-- newest records -->
        <template v-if="prs.length">
          <h3 class="section-title">Ostatnie rekordy</h3>
          <div class="ios-group prs">
            <button v-for="r in prs" :key="r.key + r.date" class="row press" @click="router.push('/exercise/' + r.day + '/' + r.i)">
              <span class="pr-ico" :style="{ '--c': COLORS[PLAN[r.day].key] }"><Ico name="trophy" /></span>
              <div class="grow">
                <b>{{ r.label || r.name }}</b>
                <span>{{ r.label ? r.name + ' · ' : '' }}{{ prDate(r.date) }}</span>
              </div>
              <div class="pr-val num">
                <b>{{ fmtVal(r.w, r.unit) }}<template v-if="r.unit === 'kg' && r.r"> × {{ r.r }}</template></b>
                <small v-if="r.prev != null">{{ r.as ? 'pomoc ' : 'było ' }}{{ fmtVal(r.prev, r.unit) }}</small>
              </div>
            </button>
          </div>
        </template>

        </template>

        <template v-if="tab === 'plans'">
        <!-- per plan -->
        <div class="plans">
          <button v-for="p in plans" :key="p.key" class="pcard press" :style="{ '--c': COLORS[p.key] }" @click="router.push('/progress/' + p.i)">
            <div class="pc-top">
              <span class="pc-name">{{ p.name }}</span>
              <ion-icon :icon="chevronForward" class="pc-chev" />
            </div>
            <span class="pc-last">{{ p.s.last ? ago(p.s.last.date) : 'jeszcze nie było' }}</span>
            <div class="pc-bars" aria-hidden="true">
              <span v-for="(h, j) in p.s.sbars" :key="j" :style="{ height: h + '%' }" :class="{ last: j === p.s.sbars.length - 1 }"></span>
              <span v-if="!p.s.sbars.length" class="ghost" style="height: 30%"></span>
            </div>
            <div class="pc-foot num">
              <b>{{ p.s.gain == null ? '–' : (p.s.gain > 0 ? '+' : p.s.gain < 0 ? '−' : '±') + Math.abs(p.s.gain) + '%' }}</b>
              <small>siły</small>
              <em v-if="p.s.tracked">↑ {{ p.s.up }}/{{ p.s.tracked }}</em>
            </div>
          </button>
        </div>
        <p class="section-foot">Słupki = siła z ostatnich treningów. ↑ = ile ćwiczeń poprawiłeś ostatnim razem.</p>

        </template>

        <template v-if="tab === 'body'">
        <!-- body weight (log in Profil → Waga) -->
        <button class="card wcard press" @click="router.push('/weight')">
          <div class="wc-l">
            <small>Waga · średnia 7 dni</small>
            <b class="num">{{ wNow == null ? 'Dodaj pomiar' : fmt(wNow) + ' kg' }}</b>
            <span v-if="wTr != null" class="num" :class="weightTone(wTr)">{{ wTr > 0 ? '+' : '' }}{{ fmt(wTr, 2) }} kg / tydzień</span>
          </div>
          <svg v-if="wLine" class="wc-spark" viewBox="0 0 120 44" preserveAspectRatio="none" aria-hidden="true"><path :d="wLine" /></svg>
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
        </template>

      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { weightTone } from '../prefs'
import Ico from './Ico.vue'
import { useScrolled } from '../useScrolled'
import { computed } from 'vue'
import { IonPage, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, useIonRouter } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { PLAN, COLORS, fmtVal } from '../plan'
import { state, ui, ago } from '../store'
import { overview, planSummary, muscleWeek, muscleSets, plansDone, planMuscleSets, recentPRs, weekly, strengthTrend, fmtTon } from '../stats'
import { MUSCLE_NAMES } from '../muscles'
import BodyMap from './BodyMap.vue'
import { weights, smooth, trend as wTrendOf } from '../weight'

const TABS = [{ v: 'all', t: 'Przegląd' }, { v: 'plans', t: 'Treningi' }, { v: 'body', t: 'Ciało' }]
const tab = computed(() => ui.ptab || 'all')
const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',')
const wS = computed(() => smooth(weights.value).slice(-30))
const wNow = computed(() => (wS.value.length ? wS.value.at(-1).avg : null))
const wTr = computed(() => wTrendOf(weights.value))
const wLine = computed(() => {
  const v = wS.value.map(p => p.avg); if (v.length < 2) return ''
  const lo = Math.min(...v), hi = Math.max(...v, lo + 0.5)
  return v.map((y, i) => (i ? 'L' : 'M') + (i / (v.length - 1) * 116 + 2).toFixed(1) + ' ' + (40 - (y - lo) / (hi - lo) * 36).toFixed(1)).join(' ')
})

const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const period = computed(() => ui.period) // days or null = all time
const periodLabel = computed(() => (period.value === 28 ? 'Ostatnie 4 tygodnie' : period.value === 91 ? 'Ostatnie 3 miesiące' : 'Od początku'))
const ov = computed(() => { void state.sessions; return overview(period.value) })
const plans = computed(() => { void state.sessions; return PLAN.map((p, i) => ({ ...p, i, s: planSummary(i) })).filter(p => !p.hidden) })
const nPlans = computed(() => plans.value.length)
const avgGain = computed(() => { const g = plans.value.map(p => p.s.gain).filter(x => x != null); return g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : null })
const all = computed(() => { void state.sessions; return muscleSets(period.value) })
const done = computed(() => { void state.sessions; return plansDone(period.value) })
const mw = computed(() => { void state.sessions; return muscleWeek(period.value) })

const prs = computed(() => { void state.sessions; return recentPRs(5, period.value) })
const MONTHS = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru']
const prDate = d => +d.slice(8) + ' ' + MONTHS[+d.slice(5, 7) - 1]
const wk = computed(() => { void state.sessions; return weekly(8) })
const wkMax = computed(() => Math.max(nPlans.value, ...wk.value.map(w => w.n)))
const wkAvg = computed(() => { const a0 = wk.value.slice(0, -1), f = a0.findIndex(x => x.n > 0); const past = f < 0 ? [] : a0.slice(f); return past.length ? String(Math.round(past.reduce((a, w) => a + w.n, 0) / past.length * 10) / 10).replace('.', ',') : '–' })
const trend = computed(() => {
  void state.sessions
  const v = strengthTrend(16)
  if (v.length < 2) return {}
  const lo = Math.min(...v), hi = Math.max(...v, lo + 1)
  const P = v.map((y, i) => [i / (v.length - 1) * 136 + 2, 54 - (y - lo) / (hi - lo) * 48])
  const line = P.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ')
  return { line, area: line + ' L138 60 L2 60 Z', x: P[P.length - 1][0], y: P[P.length - 1][1] }
})
const SHORT = { lats: 'Najszersze', upperback: 'Górne plecy', quads: 'Czworogłowe', hamstrings: 'Dwugłowe ud', reardelts: 'Tył barków', obliques: 'Skośne brzucha' }
const ORDER = ['chest', 'shoulders', 'reardelts', 'triceps', 'biceps', 'lats', 'upperback', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques']
const SCALE = 24 // bar = 0..24 sets/week; the 10–20 zone is drawn behind
const muscleRows = computed(() => ORDER.map(id => {
  const v = mw.value[id] || 0
  return { id, name: MUSCLE_NAMES[id], v, pct: Math.min(100, v / SCALE * 100), level: v >= 10 ? 'main' : v >= 4 ? 'help' : 'low' }
}))
const mapMain = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 10))
const mapHelp = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 4 && mw.value[k] < 10))
// radar: 6 body groups, all workouts so far, scaled to the most trained group (= outer ring)
const CX = 160, CY = 145, R = 100
const GROUPS = [
  ['Klatka', ['chest']], ['Plecy', ['lats', 'upperback']], ['Barki', ['shoulders', 'reardelts']],
  ['Ręce', ['biceps', 'triceps']], ['Nogi', ['quads', 'hamstrings', 'glutes']], ['Brzuch', ['abs']]
]
const planSets = planMuscleSets()
const radar = computed(() => {
  const n = GROUPS.length
  const pt = (i, r) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] }
  const raw = GROUPS.map(([, ids]) => ids.reduce((a, id) => a + (all.value[id] || 0), 0) / ids.length)
  const max = Math.max(...raw)
  const ring = pct => GROUPS.map((_, i) => pt(i, R * pct)).map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ') + ' Z'
  const axes = GROUPS.map(([name], i) => {
    const v = raw[i], rel = max ? v / max : 0
    const [px, py] = pt(i, R * Math.max(rel, 0.04)), [ex, ey] = pt(i, R), [lx, ly] = pt(i, R + 22)
    const anchor = Math.abs(lx - CX) < 8 ? 'middle' : lx > CX ? 'start' : 'end'
    return { name, v, rel, px, py, ex, ey, lx, ly: ly < CY - 40 ? ly - 8 : ly > CY + 40 ? ly + 4 : ly - 4, anchor,
      level: rel >= 0.7 ? 'ok' : rel >= 0.4 ? 'mid' : 'low' }
  })
  const shape = axes.map((a, i) => (i ? 'L' : 'M') + a.px.toFixed(1) + ' ' + a.py.toFixed(1)).join(' ') + ' Z'
  // compare with what the plan itself asks for (legs/abs are smaller on purpose – not a weakness)
  const plan = GROUPS.map(([, ids]) => ids.reduce((a, id) => a + (planSets[id] || 0), 0) / ids.length)
  const pmax = Math.max(...plan) || 1
  const planShape = plan.map((v, i) => pt(i, R * Math.max(v / pmax, 0.04))).map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ') + ' Z'
  const ratio = raw.map((v, i) => (plan[i] ? v / plan[i] : 1)), rmax = Math.max(...ratio) || 1
  axes.forEach((a, i) => { a.fit = ratio[i] / rmax; a.level = a.fit >= 0.7 ? 'ok' : a.fit >= 0.4 ? 'mid' : 'low' })
  const balance = max > 0 ? Math.round(Math.min(...ratio) / rmax * 100) : 0
  const weak = axes.filter(a => a.fit < 0.7).sort((a, b) => a.fit - b.fit)
  const strong = axes.slice().sort((a, b) => b.v - a.v)[0]
  let text
  if (!max) text = 'Jeszcze brak treningów – wykres pojawi się po pierwszym.'
  else if (done.value < nPlans.value) text = `${period.value ? 'W tym okresie zrobiłeś' : 'Zrobiłeś'} ${done.value} z ${nPlans.value} treningów planu (${plans.value.map(p => p.name).join(', ')}). Wykres wyrówna się, gdy zrobisz każdy choć raz – dopiero wtedy widać prawdziwy balans.`
  else if (!weak.length) text = `Trenujesz zgodnie z planem. Najwięcej pracy: ${strong.name.toLowerCase()} – tak jak chcesz. Nogi mniej, bo tak jest zaplanowane.`
  else text = `Mniej niż zakłada plan: ${weak.map(a => a.name + ' ' + Math.round(a.fit * 100) + '%').join(', ')}. Pewnie pomijasz tam serie albo ćwiczenia.`
  return { axes, shape, planShape, ring, balance, text, early: done.value < nPlans.value }
})
const fmtSets = v => String(Math.round(v * 2) / 2).replace('.', ',')
</script>

<style scoped>
.ptabs { display: flex; gap: 2px; margin: 2px 16px 10px; padding: 2px; border-radius: 9px; background: var(--app-field); }
.ptabs button { flex: 1; border: 0; padding: 7px 4px; border-radius: 7px; font: inherit; font-size: 14px; font-weight: 600; color: var(--ion-text-color); background: transparent; transition: background .2s; }
:global(.ion-palette-dark) .ptabs button.on { background: #636366; }
.ptabs button.on { background: var(--app-card); box-shadow: 0 2px 6px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.04); }
.wcard { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 0 16px 6px; padding: 14px 14px 14px 16px; border: 0; text-align: left; font: inherit; color: inherit; }
.wc-l { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.wc-l small { font-size: 13px; color: var(--app-muted); }
.wc-l b { font-size: 24px; font-weight: 700; letter-spacing: -.3px; }
.wc-l span { font-size: 13px; color: var(--app-muted); font-weight: 600; }
.wc-l span.dn { color: var(--app-ok); }
.wc-l span.upw { color: var(--app-bad); }
.wc-spark { width: 96px; height: 40px; flex: none; }
.wc-spark path { fill: none; stroke: var(--accent); stroke-width: 2.5; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.period { margin: 4px 16px 14px; width: auto; --background: var(--app-field); }
.period ion-segment-button { --indicator-color: var(--seg-on, var(--app-card)); --color: var(--ion-text-color); --color-checked: var(--ion-text-color); font-size: 13px; font-weight: 600; min-height: 32px; }
:global(.ion-palette-dark) .period { --seg-on: #636366; }
.hero { margin: 0 16px; padding: 16px 16px 14px; border-radius: var(--r-lg); color: var(--ion-text-color); background: var(--app-card); }
.h-top { display: flex; align-items: flex-end; gap: 12px; }
.h-top > div { flex: none; display: flex; flex-direction: column; }
.h-top small { font-size: 13px; color: var(--app-muted); }
.h-top b { font-size: 44px; font-weight: 800; letter-spacing: -1px; line-height: 1.05; color: var(--accent); font-family: var(--num-font); }
.h-sub { font-size: 12px; color: var(--app-muted); }
.h-spark { flex: 1; height: 62px; min-width: 0; }
.h-spark .l { fill: none; stroke: var(--accent); stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.h-spark .a { fill: color-mix(in srgb, var(--accent) 12%, transparent); }
.h-spark .d { fill: var(--accent); }
.h-stats { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 14px; padding-top: 12px; border-top: 0.5px solid var(--app-line); }
.h-stats div { display: flex; flex-direction: column; align-items: center; }
.h-stats b { font-size: 19px; font-weight: 700; letter-spacing: -.2px; white-space: nowrap; font-family: var(--num-font); }
.h-stats small { font-size: 11.5px; color: var(--app-muted); }
.weeks { margin: 0 16px; padding: 14px 14px 10px; }
.w-head { display: flex; justify-content: space-between; align-items: baseline; }
.w-head b { font-size: 22px; font-weight: 700; color: var(--accent); }
.w-head span { font-size: 14px; color: var(--app-muted); }
.w-avg { font-size: 13px; }
.w-bars { position: relative; display: flex; gap: 6px; height: 120px; margin-top: 10px; }
.w-col { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 3px; }
.w-col i { width: 100%; max-width: 26px; border-radius: 6px 6px 3px 3px; background: color-mix(in srgb, var(--accent) 30%, transparent); max-height: calc(100% - 36px); }
.w-col.full i { background: color-mix(in srgb, var(--accent) 65%, transparent); }
.w-col.now i { background: var(--accent); }
.w-n { font-size: 11px; font-weight: 700; color: var(--app-muted); height: 14px; }
.w-col small { font-size: 10.5px; color: var(--app-muted); height: 14px; }
.w-col.now small { color: var(--accent); font-weight: 700; }
.prs .pr-ico { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 19px; flex: none; background: linear-gradient(135deg, #ffe58a, #ffc93c); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c) 35%, transparent); }
.prs .grow b { display: block; font-size: 15px; font-weight: 600; }
.prs .grow span { display: block; font-size: 12.5px; color: var(--app-muted); }
.pr-val { text-align: right; display: flex; flex-direction: column; align-items: flex-end; }
.pr-val b { font-size: 16px; font-weight: 800; white-space: nowrap; color: #d99a00; }
:global(.ion-palette-dark) .pr-val b { color: #ffc93c; }
.pr-val small { font-size: 11.5px; color: var(--app-muted); white-space: nowrap; }
.stats4 { margin: 0 16px; display: grid; grid-template-columns: repeat(4, 1fr); padding: 14px 6px; }
.stats4 div { display: flex; flex-direction: column; align-items: center; gap: 2px; border-left: 1px solid var(--app-line); }
.stats4 div:first-child { border-left: 0; }
.stats4 small { font-size: 12px; color: var(--app-muted); }
.stats4 b { font-size: 20px; font-weight: 700; letter-spacing: -.4px; white-space: nowrap; }
.stats4 b span { font-size: 14px; }

.plans { margin: 0 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pcard { text-align: left; border: 0; border-radius: var(--r-lg); padding: 14px; color: #fff; font: inherit; display: flex; flex-direction: column; min-height: 168px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 80%, #fff) 0%, var(--c) 55%, color-mix(in srgb, var(--c) 82%, #000) 100%);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c) 28%, transparent); }
.pc-top { display: flex; justify-content: space-between; align-items: center; }
.pc-name { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }
.pc-chev { font-size: 18px; opacity: .8; }
.pc-last { font-size: 12px; opacity: .85; }
.pc-bars { display: flex; align-items: flex-end; gap: 4px; height: 48px; margin-top: auto; padding-top: 10px; }
.pc-bars span { flex: 1; max-width: 16px; border-radius: 4px 4px 2px 2px; background: rgba(255,255,255,.35); }
.pc-bars span.last { background: #fff; }
.pc-bars span.ghost { background: rgba(255,255,255,.18); max-width: none; }
.pc-foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.pc-foot b { font-size: 17px; font-weight: 700; }
.pc-foot small { font-size: 13px; opacity: .85; margin-left: -2px; }
.pc-foot em { margin-left: auto; white-space: nowrap; font-style: normal; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; background: rgba(255,255,255,.25); }

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
