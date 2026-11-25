<template>
  <div>
    <!-- hero: strength since start + trend line, then the period numbers -->
    <div class="hero">
      <div class="tb-head"><span class="tb-ico"><ion-icon :icon="trendingUp" /></span><span class="tb-title">Siła od startu</span></div>
      <div class="h-top">
        <div>
          <b class="num">{{ signed(avgGain) }}</b>
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
  </div>
</template>

<script setup>
// Postępy → Przegląd: strength since start + trend, workouts per week, newest records
import { computed } from 'vue'
import { useIonRouter, IonIcon } from '@ionic/vue'
import { trendingUp } from 'ionicons/icons'
import Ico from '../Ico.vue'
import { LOC } from '../../i18n'
import { PLAN, COLORS, fmtVal } from '../../plan'
import { state } from '../../store'
import { overview, recentPRs, weekly, strengthTrend, fmtTon } from '../../stats'
import { usePlans, signed } from './plans'

const props = defineProps({ period: Number }) // days, or null = all time
const router = useIonRouter()
const plans = usePlans()
const nPlans = computed(() => plans.value.length)
const avgGain = computed(() => { const g = plans.value.map(p => p.s.gain).filter(x => x != null); return g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : null })
const ov = computed(() => { void state.sessions; return overview(props.period) })
const prs = computed(() => { void state.sessions; return recentPRs(5, props.period) })
const prDate = d => new Date(d + 'T12:00:00').toLocaleDateString(LOC(), { day: 'numeric', month: 'short' })
const wk = computed(() => { void state.sessions; return weekly(8) })
const wkMax = computed(() => Math.max(nPlans.value, ...wk.value.map(w => w.n)))
// average of the finished weeks since the first one with a workout
const wkAvg = computed(() => {
  const a0 = wk.value.slice(0, -1), f = a0.findIndex(x => x.n > 0), past = f < 0 ? [] : a0.slice(f)
  return past.length ? String(Math.round(past.reduce((a, w) => a + w.n, 0) / past.length * 10) / 10).replace('.', ',') : '–'
})
const trend = computed(() => {
  void state.sessions
  const v = strengthTrend(16)
  if (v.length < 2) return {}
  const lo = Math.min(...v), hi = Math.max(...v, lo + 1)
  const P = v.map((y, i) => [i / (v.length - 1) * 136 + 2, 54 - (y - lo) / (hi - lo) * 48])
  const line = P.map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1)).join(' ')
  return { line, area: line + ' L138 60 L2 60 Z', x: P[P.length - 1][0], y: P[P.length - 1][1] }
})
</script>

<style scoped>
.hero { margin: 0 16px; padding: 16px 16px 14px; border-radius: var(--r-lg); color: var(--ion-text-color); background: color-mix(in srgb, var(--accent) 14%, var(--app-card)); }
:global(.ion-palette-dark) .hero { background: color-mix(in srgb, var(--accent) 22%, var(--app-card)); }
.h-top { display: flex; align-items: flex-end; gap: 12px; margin-top: 8px; }
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
</style>
