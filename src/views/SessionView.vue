<template>
  <ion-page>
    <ion-header class="sh-header" :style="{ '--c': color }">
      <ion-toolbar>
        <div class="sh-bar">
          <button class="rb press" @click="goBack" aria-label="Wróć do historii"><ion-icon :icon="chevronBack" /></button>
          <div class="sh-title">
            <b>Podsumowanie</b>
            <span v-if="s" class="num">{{ fmtShortDay }}</span>
          </div>
          <div class="sh-right" v-if="s">
            <button class="rb tint press" @click="edit" aria-label="Edytuj trening"><ion-icon :icon="createOutline" /></button>
            <button class="rb danger press" @click="del" aria-label="Usuń trening"><ion-icon :icon="trashOutline" /></button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="s && plan" class="page pad-b" :style="{ '--c': color }">

        <div class="hero card">
          <span class="plan-ico big">{{ plan.abbr }}</span>
          <div class="hero-txt">
            <h1>{{ plan.name }}</h1>
            <p class="num">{{ dayName }}, {{ fmtDate(s.date) }}<template v-if="timeRange"> · {{ timeRange }}</template></p>
            <p v-if="!s.finished" class="live">w toku</p>
            <p v-if="s.deload" class="dl">Tydzień lżejszy (deload)</p>
          </div>
          <BodyMap class="hero-map" :main="muscles.main" :help="muscles.help" />
        </div>

        <div class="card grid num">
          <div><small>Czas</small><b>{{ minutes ? minutes + ' min' : '–' }}</b></div>
          <div><small>Serie</small><b>{{ c.n }}<i>/{{ c.t }}</i></b></div>
          <div><small>Objętość</small><b>{{ vol ? fmtTon(vol) : '–' }}</b></div>
          <div><small>Rekordy</small><b>{{ prN || '–' }}<i v-if="prN"> 🏆</i></b></div>
          <template v-if="sv">
            <div><small>Śr. tętno</small><b>{{ sv.hr ? Math.round(sv.hr) : '–' }}<i v-if="sv.hr"> bpm</i></b></div>
            <div><small>Max tętno</small><b>{{ sv.hrMax ? Math.round(sv.hrMax) : '–' }}<i v-if="sv.hrMax"> bpm</i></b></div>
            <div><small>Kalorie</small><b>{{ sv.kcal ? Math.round(sv.kcal) : '–' }}<i v-if="sv.kcal"> kcal</i></b></div>
            <div><small>Ćwiczenia</small><b>{{ exDone }}<i>/{{ exTotal }}</i></b></div>
          </template>
        </div>

        <div v-if="sv?.hrs?.length > 3" class="card">
          <div class="card-title">Tętno <span class="muted">ze Stravy</span></div>
          <div class="hr-wrap"><canvas ref="cv"></canvas></div>
        </div>
        <p v-else-if="!sv && strava.data" class="note">Brak danych ze Stravy dla tego treningu (jeszcze się nie zsynchronizował albo zegarek nie był włączony).</p>

        <h3 class="section-title">Ćwiczenia</h3>
        <div class="card exs">
          <div v-for="e in exList" :key="e.key" class="ex" :class="{ skip: !e.done.length }">
            <div class="ex-head">
              <b>{{ e.name }}<template v-if="e.label"> · {{ e.label }}</template></b>
              <span v-if="e.pr" class="pr">REKORD</span>
              <span v-else-if="e.diff" class="diff num" :class="e.diff.cls">{{ e.diff.text }}</span>
            </div>
            <div v-if="e.done.length" class="sets num">
              <span v-for="(x, i) in e.done" :key="i" class="set">{{ setText(x, e.unit) }}</span>
            </div>
            <div v-else class="sets skipped">pominięte</div>
          </div>
        </div>

      </div>
      <div v-else class="page"><div class="card empty">Nie ma takiego treningu.</div></div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonContent, IonIcon, onIonViewDidEnter, useIonRouter } from '@ionic/vue'
import { createOutline, trashOutline, chevronBack } from 'ionicons/icons'
import { ask } from '../dialog'
import { Chart, LineController, LineElement, PointElement, LinearScale, Filler, Tooltip } from 'chart.js'
import { state, counts, fmtDate, sorted, remove } from '../store'
import { PLAN, COLORS, UNITS, isAssisted, entriesOf, fmtNum } from '../plan'
import { musclesOf } from '../muscles'
import { volumeOf, fmtTon } from '../stats'
import { strava, stravaFor } from '../strava'
import BodyMap from './BodyMap.vue'

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip)

const route = useRoute(), router = useRouter()
const s = computed(() => state.sessions[route.params.id] || null)
const plan = computed(() => (s.value ? PLAN[s.value.day] : null))
const color = computed(() => (plan.value ? COLORS[plan.value.key] : 'var(--accent)'))
const sv = computed(() => (s.value ? stravaFor(s.value.id) : null))
const c = computed(() => (s.value ? counts(s.value) : { n: 0, t: 0 }))
const vol = computed(() => (s.value ? volumeOf(s.value) : 0))
const dayName = computed(() => (s.value ? new Date(s.value.date + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'long' }) : ''))
const hm = t => new Date(t).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
const timeRange = computed(() => {
  if (sv.value?.start) { const a = Date.parse(sv.value.start); return hm(a) + '–' + hm(a + (sv.value.elapsed || 0) * 1000) }
  return s.value?.started ? hm(s.value.started) + (s.value.finished && s.value.updated ? '–' + hm(s.value.updated) : '') : ''
})
const minutes = computed(() => {
  if (sv.value?.elapsed) return Math.round(sv.value.elapsed / 60)
  const m = s.value?.finished && s.value.updated && s.value.started ? Math.round((s.value.updated - s.value.started) / 60000) : 0
  return m > 0 && m < 300 ? m : 0
})

// exercises in plan order, plus anything stored that is no longer in the plan
const exList = computed(() => {
  if (!s.value) return []
  const groups = entriesOf(s.value.day, s.value)
  const known = new Set(groups.map(g => g.key))
  const extra = Object.keys(s.value.ex || {}).filter(k => !known.has(k) && (s.value.ex[k] || []).some(x => x.d))
    .map(k => ({ key: k, name: k, label: null, unit: s.value.ex[k].some(x => x.r != null) ? 'kg' : 'reps' }))
  const earlier = sorted().filter(o => o.id !== s.value.id && (o.date < s.value.date || (o.date === s.value.date && (o.started || 0) < (s.value.started || 0))))
  // plan exercises that were not part of this workout at all (plan changed later) are left out
  return [...groups.filter(g => g.key in (s.value.ex || {})), ...extra].map(g => {
    const done = (s.value.ex?.[g.key] || []).filter(x => x.d)
    const vals = done.filter(x => x.w != null).map(x => x.w)
    const as = isAssisted(g)
    const best = vals.length ? (as ? Math.min(...vals) : Math.max(...vals)) : null
    const prevAll = earlier.flatMap(o => (o.ex?.[g.key] || []).filter(x => x.d && x.w != null).map(x => x.w))
    const prevBest = prevAll.length ? (as ? Math.min(...prevAll) : Math.max(...prevAll)) : null
    const pr = best != null && prevBest != null && (as ? best < prevBest : best > prevBest)
    // compare with the last time this exercise was done
    const last = earlier.find(o => (o.ex?.[g.key] || []).some(x => x.d && x.w != null))
    let diff = null
    if (best != null && last) {
      const lv = last.ex[g.key].filter(x => x.d && x.w != null).map(x => x.w)
      const lb = as ? Math.min(...lv) : Math.max(...lv)
      const d = +(best - lb).toFixed(2), good = as ? d < 0 : d > 0
      diff = d === 0 ? { text: '= jak ostatnio', cls: '' } : { text: (d > 0 ? '+' : '−') + fmtNum(Math.abs(d)) + ' ' + UNITS[g.unit].short, cls: good ? 'up' : 'down' }
    }
    return { ...g, done, pr, diff }
  })
})
const exTotal = computed(() => new Set(exList.value.filter(e => e.ex != null).map(e => e.ex)).size)
const prN = computed(() => exList.value.filter(e => e.pr).length)
const exDone = computed(() => new Set(exList.value.filter(e => e.done.length && e.ex != null).map(e => e.ex)).size)
const muscles = computed(() => {
  const main = new Set(), help = new Set()
  exList.value.filter(e => e.done.length).forEach(e => { const m = musclesOf(e.name); m.main.forEach(x => main.add(x)); m.help.forEach(x => help.add(x)) })
  main.forEach(x => help.delete(x))
  return { main: [...main], help: [...help] }
})
const setText = (x, unit) => (x.w == null ? '✓' : unit === 'kg' ? fmtNum(x.w) + ' × ' + (x.r ?? '–') : fmtNum(x.w) + ' ' + UNITS[unit].short) +
  (x.q != null ? ' · zapas ' + (x.q >= 3 ? '3+' : x.q) : '')

function edit() { router.push('/workout/' + s.value.id) }
const ionRouter = useIonRouter()
function goBack() { if (ionRouter.canGoBack()) ionRouter.back(); else ionRouter.navigate('/tabs/history', 'back', 'replace') }
async function del() {
  const x = s.value; if (!x) return
  const { role } = await ask({ icon: trashOutline, title: 'Usunąć trening?', message: `${plan.value.name}, ${fmtDate(x.date)}. Tego nie da się cofnąć.`,
    buttons: [{ text: 'Usuń trening', role: 'destructive', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'destructive') return
  goBack()
  setTimeout(() => remove(x.id), 350) // after the page has left, so it never shows "Nie ma takiego treningu"
}
const fmtShortDay = computed(() => s.value ? new Date(s.value.date + 'T12:00').toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short' }) : '')

// heart-rate chart
const cv = ref(null)
let chart = null
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
function draw() {
  const pts = sv.value?.hrs
  if (!cv.value || !pts || pts.length < 4) return
  const red = '#ff375f', muted = css('--app-muted') || '#8a8a8e', line = css('--app-line') || 'rgba(0,0,0,.1)'
  const g = cv.value.getContext('2d').createLinearGradient(0, 0, 0, 200)
  g.addColorStop(0, red + '55'); g.addColorStop(1, red + '00')
  chart?.destroy()
  chart = new Chart(cv.value, {
    type: 'line',
    data: { datasets: [{ data: pts.map(([t, v]) => ({ x: t / 60, y: v })), borderColor: red, backgroundColor: g, fill: true, tension: .3, borderWidth: 2, pointRadius: 0, pointHitRadius: 8 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 400 }, interaction: { mode: 'nearest', axis: 'x', intersect: false },
      plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { title: x => Math.round(x[0].parsed.x) + ' min', label: x => x.parsed.y + ' bpm' } } },
      scales: {
        x: { type: 'linear', min: 0, max: pts[pts.length - 1][0] / 60, grid: { display: false }, ticks: { color: muted, maxTicksLimit: 6, callback: v => Math.round(v) + "'" } },
        y: { grid: { color: line }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5 }, grace: '5%' }
      }
    }
  })
}
watch(() => sv.value?.hrs, () => nextTick(draw))
onIonViewDidEnter(() => nextTick(draw))
onBeforeUnmount(() => chart?.destroy())
</script>

<style scoped>
.hero { display: flex; align-items: center; gap: 14px; background: color-mix(in srgb, var(--c) 14%, var(--app-card)); }
.plan-ico.big { --c: inherit; width: 52px; height: 52px; font-size: 18px; border-radius: 15px; flex: none; }
.hero-txt { flex: 1; min-width: 0; }
.hero h1 { margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -.4px; }
.hero p { margin: 2px 0 0; color: var(--app-muted); font-size: 14px; }
.hero .live { color: var(--c); font-weight: 600; }
.hero .dl { color: #0a84ff; font-weight: 600; }
.hero-map { width: 74px; flex: none; }
.grid { display: grid; grid-template-columns: repeat(4, 1fr); row-gap: 14px; padding: 14px 4px; }
.grid > div { padding: 0 8px; min-width: 0; }
.grid > div:not(:nth-child(4n + 1)) { border-left: 0.5px solid var(--app-line); }
.grid small { display: block; font-size: 12px; color: var(--app-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.grid b { display: block; font-size: 19px; font-weight: 700; letter-spacing: -.3px; margin-top: 2px; white-space: nowrap; }
.grid b i { font-style: normal; font-size: 12px; color: var(--app-muted); font-weight: 600; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 8px; display: flex; justify-content: space-between; }
.muted { color: var(--app-muted); font-weight: 500; font-size: 13px; }
.hr-wrap { position: relative; height: 180px; }
.note { margin: 0 22px 12px; color: var(--app-muted); font-size: 13px; line-height: 1.4; }
.section-title { margin: 18px 22px 8px; }
.exs { padding-top: 4px; padding-bottom: 4px; }
.ex { padding: 11px 0; }
.ex + .ex { border-top: 0.5px solid var(--app-line); }
.ex-head { display: flex; align-items: baseline; gap: 8px; justify-content: space-between; }
.ex-head b { font-size: 15px; font-weight: 600; line-height: 1.3; }
.ex.skip b { color: var(--app-muted); }
.pr { flex: none; font-size: 11px; font-weight: 800; letter-spacing: .4px; color: #fff; background: #ff9f0a; border-radius: 6px; padding: 2px 6px; }
.diff { flex: none; font-size: 13px; font-weight: 600; color: var(--app-muted); }
.diff.up { color: var(--app-ok); }
.diff.down { color: var(--app-bad); }
.sets { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 7px; }
.set { font-size: 14px; font-weight: 600; background: color-mix(in srgb, var(--c) 13%, transparent); color: var(--ion-text-color); border-radius: 8px; padding: 4px 9px; }
.skipped { color: var(--app-faint, var(--app-muted)); font-size: 14px; }
.edit-btn { margin: 4px 16px 24px; width: calc(100% - 32px); background: var(--accent); color: #fff; }
.edit-btn ion-icon { font-size: 20px; }
.del-btn { margin: -12px 16px 28px; width: calc(100% - 32px); background: color-mix(in srgb, var(--app-bad) 12%, var(--app-card)); color: var(--app-bad); }
.del-btn ion-icon { font-size: 20px; }
.sh-header ion-toolbar { --background: var(--app-bg, var(--ion-background-color)); --border-width: 0 !important; --min-height: 56px; }
.sh-header::after { display: none; }
.sh-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 6px 14px; }
.sh-title { text-align: center; display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.sh-title b { font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
.sh-title span { font-size: 12.5px; color: var(--app-muted); font-weight: 500; margin-top: 1px; }
.sh-right { display: flex; justify-content: flex-end; gap: 10px; }
.rb { width: 38px; height: 38px; border-radius: 50%; border: 0; display: grid; place-items: center; padding: 0;
  background: var(--app-card); color: var(--ion-text-color); box-shadow: 0 1px 3px rgba(0,0,0,.08); font-size: 20px; }
.rb ion-icon { font-size: 21px; }
.rb.tint { background: color-mix(in srgb, var(--c) 18%, var(--app-card)); color: var(--c); }
.rb.danger { background: color-mix(in srgb, var(--app-bad) 14%, var(--app-card)); color: var(--app-bad); }
.empty { color: var(--app-muted); text-align: center; padding: 28px; }
.pad-b { padding-bottom: 28px; }
</style>
