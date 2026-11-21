<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button :default-href="'/progress/' + day" :text="plan?.name" /></ion-buttons>
        <ion-title>{{ plan?.name }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content v-if="plan" :fullscreen="true">
      <div class="hero" :style="{ '--c': color }">
        <span class="badge">{{ plan?.name }} · ćwiczenie {{ (entry?.ex ?? 0) + 1 }}</span>
        <h1>{{ entry?.name }}<template v-if="entry?.label"> · {{ entry.label }}</template></h1>
        <p class="target">{{ target }}</p>
      </div>

      <div class="stats wrap2">
        <div><span>Rekord</span><b class="num">{{ pts.length ? fmtNum(best) : '–' }}<small v-if="pts.length"> {{ UNITS[unit].short }}</small></b></div>
        <div><span>Ostatnio</span><b class="num">{{ pts.length ? fmtNum(last) : '–' }}<small v-if="pts.length"> {{ UNITS[unit].short }}</small></b></div>
        <div><span>Od startu</span><b class="num" :class="{ up: diff > 0, down: diff < 0 }">{{ pts.length > 1 ? (diff > 0 ? '+' : diff < 0 ? '−' : '') + fmtNum(Math.abs(diff)) : '–' }}<small v-if="pts.length > 1"> {{ UNITS[unit].short }}</small></b></div>
        <div><span>Treningów</span><b class="num">{{ pts.length }}</b></div>
      </div>

      <div class="card chart-card">
        <div class="card-title">{{ UNITS[unit].best }}</div>
        <div v-show="pts.length" class="chart-wrap"><canvas ref="cv"></canvas></div>
        <div v-if="!pts.length" class="empty">Jeszcze nie ma zapisów dla tego ćwiczenia.<br>Pojawią się po pierwszym treningu {{ plan?.name }}.</div>
      </div>

      <div class="card" v-if="rows.length">
        <div class="card-title">Wszystkie treningi</div>
        <div class="row" v-for="r in rows" :key="r.id">
          <div class="r-left">
            <b class="num">{{ fmtDate(r.date) }}</b>
            <span class="num">{{ r.sets }}</span>
          </div>
          <div class="r-right num">
            <span v-if="r.pr" class="pr-tag">REKORD</span>
            <b>{{ fmtNum(r.w) }}</b><small>{{ UNITS[unit].short }}<template v-if="r.r"> × {{ r.r }}</template></small>
          </div>
        </div>
      </div>
      <div style="height: 24px"></div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonBackButton, onIonViewDidEnter } from '@ionic/vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip } from 'chart.js'
import { PLAN, COLORS, UNITS, entriesOf, fmtNum, isAssisted } from '../plan'
import { state, sorted, fmtKg, fmtDate, fmtShort } from '../store'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Filler, Tooltip)

const route = useRoute()
// Ionic keeps this page alive under the next one: keep the last valid params, so it never renders with another route's params
const day = ref(+route.params.day)
const i = ref(+route.params.i)
watch(() => [route.params.day, route.params.i], ([d, k]) => { if (d != null && k != null && PLAN[+d]) { day.value = +d; i.value = +k } })
const plan = computed(() => PLAN[day.value])
const entry = computed(() => (plan.value ? entriesOf(day.value, 'all')[i.value] : null))
const name = computed(() => entry.value?.key)
const target = computed(() => entry.value?.target)
const unit = computed(() => entry.value?.unit || 'kg')
const color = computed(() => COLORS[plan.value?.key] || '#2f4bd8')
const as = computed(() => !!entry.value && isAssisted(entry.value)) // assisted: less help = better

// oldest -> newest, one point per workout: heaviest ticked set
const pts = computed(() => {
  void state.sessions
  const out = []
  sorted().slice().reverse().forEach(s => {
    const done = (s.ex?.[name.value] || []).filter(x => x.d && x.w != null)
    if (!done.length) return
    out.push({ id: s.id, date: s.date, w: as.value ? Math.min(...done.map(x => x.w)) : Math.max(...done.map(x => x.w)), sets: done.map(x => fmtNum(x.w) + (x.r ? ' × ' + x.r : '')).join(' · ') })
  })
  let max = null
  out.forEach((p, k) => { p.pr = k > 0 && (as.value ? p.w < max : p.w > max); max = max == null ? p.w : as.value ? Math.min(max, p.w) : Math.max(max, p.w) })
  return out
})
const rows = computed(() => pts.value.slice().reverse())
const best = computed(() => (as.value ? Math.min : Math.max)(...pts.value.map(p => p.w)))
const last = computed(() => pts.value[pts.value.length - 1]?.w)
const diff = computed(() => (pts.value.length ? last.value - pts.value[0].w : 0))

const cv = ref(null)
let chart = null
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
function draw() {
  if (!cv.value || !pts.value.length) return
  const c = color.value, muted = css('--app-muted') || '#8a8a8e', line = css('--app-line') || 'rgba(0,0,0,.1)'
  const g = cv.value.getContext('2d').createLinearGradient(0, 0, 0, 260)
  g.addColorStop(0, c + '55'); g.addColorStop(1, c + '00')
  chart?.destroy()
  chart = new Chart(cv.value, {
    type: 'line',
    data: {
      labels: pts.value.map(p => fmtShort(p.date)),
      datasets: [{ data: pts.value.map(p => p.w), borderColor: c, backgroundColor: g, fill: true, tension: .3, borderWidth: 3,
        pointRadius: pts.value.map((p, k) => (k === pts.value.length - 1 ? 6 : p.pr ? 4.5 : 3)),
        pointBackgroundColor: pts.value.map(p => (p.pr ? '#ffc61a' : c)), pointBorderWidth: 0 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 450 },
      plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { label: x => fmtNum(x.parsed.y) + ' ' + UNITS[unit.value].short } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: muted, maxTicksLimit: 6, maxRotation: 0 } },
        y: { grid: { color: line }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5, callback: v => fmtNum(v) }, grace: '10%' }
      }
    }
  })
}
watch(pts, () => nextTick(draw))
onMounted(() => nextTick(draw))
onIonViewDidEnter(() => nextTick(draw))
onBeforeUnmount(() => chart?.destroy())
</script>

<style scoped>
.hero { margin: 12px 16px 12px; padding: 18px; border-radius: var(--r-lg); color: #fff;
  box-shadow: 0 10px 26px color-mix(in srgb, var(--c) 28%, transparent);
  background: linear-gradient(145deg, color-mix(in srgb, var(--c) 78%, #fff), var(--c) 55%, color-mix(in srgb, var(--c) 80%, #000)); }
.badge { font-size: 13px; font-weight: 600; opacity: .85; }
.hero h1 { margin: 4px 0 2px; font-size: 26px; font-weight: 700; line-height: 1.15; letter-spacing: -.3px; text-wrap: balance; }
.target { margin: 0; opacity: .9; font-weight: 500; font-size: 17px; }
.stats b.up { color: var(--app-ok); }
.stats b.down { color: var(--app-bad); }
.card { padding-bottom: 8px; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; letter-spacing: -.2px; }
.chart-wrap { position: relative; height: 230px; }
.empty { color: var(--app-muted); text-align: center; padding: 28px 8px; line-height: 1.4; }
.row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 11px 0; border-top: 0.5px solid var(--app-line); min-height: 0; }
.card-title + .row { border-top: 0; }
.row::before { display: none; }
.r-left { display: flex; flex-direction: column; min-width: 0; }
.r-left b { font-size: 15px; font-weight: 600; }
.r-left span { font-size: 13px; color: var(--app-muted); }
.r-right { display: flex; align-items: center; gap: 4px; flex: none; }
.r-right b { font-size: 20px; font-weight: 700; }
.r-right small { color: var(--app-muted); }
.r-right .pr-tag { margin-right: 4px; }
</style>
