<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>Waga</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Profil</button>
        <h1 class="t-large">Waga</h1>
        <p class="sub">{{ list.length ? 'Ostatni pomiar ' + ago(last.date) : 'Zapisuj wagę rano, na czczo' }}</p>
      </header>
      <div class="page">

        <div class="card stats4 num">
          <div><small>Teraz</small><b>{{ last ? fmtKg(last.kg) : '–' }}<i v-if="last"> kg</i></b></div>
          <div><small>Śr. 7 dni</small><b>{{ avg7 == null ? '–' : fmtKg(avg7.toFixed(1)) }}</b></div>
          <div><small>Od startu</small><b :class="tone(total)">{{ list.length > 1 ? sign(total) : '–' }}</b></div>
          <div><small>Na tydzień</small><b :class="wk == null ? '' : tone(wk)">{{ wk == null ? '–' : sign(wk) }}</b></div>
        </div>

        <div class="goal">
          <span>Cel</span>
          <div class="seg3">
            <button v-for="g in GOALS" :key="g.v" class="press" :class="{ on: prefs.goal === g.v }" @click="setPref('goal', g.v)">{{ g.t }}</button>
          </div>
        </div>
        <div v-if="verdict" class="card verdict" :class="verdict.cls">
          <span class="v-ico"><Ico :name="verdict.ico" /></span>
          <div><b>{{ verdict.title }}</b><p>{{ verdict.text }}</p></div>
        </div>

        <ion-segment class="period" :value="String(range ?? 'all')" @ionChange="e => (range = e.detail.value === 'all' ? null : +e.detail.value)">
          <ion-segment-button value="30"><ion-label>30 dni</ion-label></ion-segment-button>
          <ion-segment-button value="90"><ion-label>90 dni</ion-label></ion-segment-button>
          <ion-segment-button value="all"><ion-label>Całość</ion-label></ion-segment-button>
        </ion-segment>

        <div class="card chart-card">
          <div class="card-title">Waga <span class="leg"><i class="dot"></i>pomiar <i class="ln"></i>średnia 7 dni</span></div>
          <div v-show="shown.length" class="chart-wrap"><canvas ref="cv"></canvas></div>
          <div v-if="!shown.length" class="empty">Brak pomiarów{{ list.length ? ' w tym okresie' : '' }}.<br>Dodaj pierwszy przyciskiem poniżej.</div>
        </div>

        <div class="btns">
          <button class="btn block primary-btn press" @click="add"><ion-icon :icon="add_" /> Dodaj dzisiejszą wagę</button>
          <button class="btn block plain press" @click="paste"><ion-icon :icon="clipboardOutline" /> Wklej stare pomiary</button>
        </div>

        <div class="card" v-if="list.length">
          <div class="card-title">Pomiary</div>
          <button class="row press" v-for="(r, k) in rows" :key="r.date" @click="edit(r)">
            <div class="r-left"><b class="num">{{ fmtDate(r.date) }}</b><span>{{ dayName(r.date) }}</span></div>
            <div class="r-right num">
              <small v-if="r.d" :class="{ ok: r.d < 0, bad: r.d > 0 }">{{ sign(r.d) }}</small>
              <b>{{ fmtKg(r.kg) }}</b><small>kg</small>
            </div>
          </button>
        </div>
        <p class="note">Waga skacze z dnia na dzień o 1–2 kg (woda, sól, jedzenie). Patrz na <b>średnią 7 dni</b> i tempo, nie na pojedynczy pomiar.
          <template v-if="cloud.token"> Pomiary idą też do kopii na GitHubie.</template></p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { LOC } from '../i18n'
import Ico from './Ico.vue'
import { prefs } from '../prefs'
import { setPref } from '../account'
import { useIonRouter } from '@ionic/vue'
import { chevronBack } from 'ionicons/icons'
import { useScrolled } from '../useScrolled'
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, onIonViewDidEnter } from '@ionic/vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, Filler, Tooltip } from 'chart.js'
import { add as add_, clipboardOutline, scale, trashOutline } from 'ionicons/icons'
import { iso, fmtKg, fmtDate, fmtShort, ago } from '../store'
import { cloud } from '../cloud'
import { weights, setWeight, delWeight, parseList, smooth, trend } from '../weight'
import { ask } from '../dialog'

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip)
const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/profile', 'back', 'replace'))
const { scrolled, onScroll } = useScrolled()
const dnum = s => Math.round(new Date(s + 'T12:00').getTime() / 864e5) // x axis = real days, so gaps show as gaps
const dstr = n => fmtShort(iso(new Date(n * 864e5)))

const list = computed(() => smooth(weights.value))
const last = computed(() => list.value[list.value.length - 1])
const avg7 = computed(() => last.value?.avg ?? null)
const total = computed(() => (list.value.length > 1 ? last.value.avg - list.value[0].kg : 0))
const wk = computed(() => trend(weights.value))
const range = ref(null)
const shown = computed(() => {
  if (!range.value) return list.value
  const from = iso(new Date(Date.now() - range.value * 864e5))
  return list.value.filter(p => p.date >= from)
})
const rows = computed(() => list.value.map((p, k) => ({ ...p, d: k ? +(p.kg - list.value[k - 1].kg).toFixed(1) : null })).reverse())

const sign = v => { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + fmtKg(Math.abs(r)) }
const dayName = s => new Date(s + 'T12:00').toLocaleDateString(LOC(), { weekday: 'long' })

// verdict for the chosen goal (Ustawienia / here): cut = slow cut keeping muscle (0,2–0,7 %/week),
// maintain = within ±0,25 %/week, bulk = lean gain (0,1–0,5 %/week)
const GOALS = [{ v: 'cut', t: 'Redukcja' }, { v: 'maintain', t: 'Utrzymanie' }, { v: 'bulk', t: 'Masa' }]
const tone = v => { const g = prefs.goal; if (g === 'maintain' || Math.abs(v) < 0.05) return ''; return (g === 'bulk' ? v > 0 : v < 0) ? 'ok' : 'bad' }
const verdict = computed(() => {
  if (wk.value == null) return list.value.length ? { ico: 'chart', cls: '', title: 'Zbieram dane', text: 'Tempo pokażę po 3 pomiarach z ostatnich 3 tygodni. Najlepiej waż się 3–4× w tygodniu.' } : null
  const pct = (wk.value / (avg7.value || 1)) * 100
  if (prefs.goal === 'maintain') {
    if (pct < -0.25) return { ico: 'bolt', cls: 'warn', title: 'Waga spada', text: 'Chcesz utrzymać wagę – dorzuć ok. 100–200 kcal dziennie.' }
    if (pct > 0.25) return { ico: 'up', cls: 'warn', title: 'Waga rośnie', text: 'Chcesz utrzymać wagę – ok. 100–200 kcal mniej albo więcej kroków.' }
    return { ico: 'check', cls: 'good', title: 'Waga stabilna', text: 'Trzymasz wagę. Siła na treningu dalej może rosnąć.' }
  }
  if (prefs.goal === 'bulk') {
    if (pct > 1) return { ico: 'warn', cls: 'warn', title: 'Za szybko w górę', text: 'Ponad 1 % wagi na tydzień – przybywa głównie tłuszczu. Zjedz trochę mniej.' }
    if (pct > 0.5) return { ico: 'bolt', cls: 'warn', title: 'Dość szybko', text: 'Szybciej niż trzeba. Mięśnie rosną wolno – ok. 100–200 kcal mniej da czystszą masę.' }
    if (pct >= 0.1) return { ico: 'check', cls: 'good', title: 'Idealne tempo', text: 'Powoli w górę – mięśnie rosną, tłuszczu przybywa niewiele. Pilnuj progresu na treningu.' }
    if (pct >= -0.1) return { ico: 'pause', cls: '', title: 'Waga stoi', text: 'Na masie dorzuć ok. 150–250 kcal dziennie.' }
    return { ico: 'warn', cls: 'warn', title: 'Waga spada', text: 'Na masie waga powinna powoli rosnąć – jedz więcej.' }
  }
  if (pct < -1) return { ico: 'warn', cls: 'warn', title: 'Za szybko w dół', text: 'Ponad 1 % wagi na tydzień – duże ryzyko utraty mięśni i siły. Dorzuć trochę jedzenia.' }
  if (pct < -0.7) return { ico: 'bolt', cls: 'warn', title: 'Dość szybko', text: 'Szybciej niż trzeba, żeby budować mięśnie. Pilnuj białka i siły – jeśli ciężary spadają, zjedz trochę więcej.' }
  if (pct <= -0.2) return { ico: 'check', cls: 'good', title: 'Idealne tempo', text: 'Powoli w dół – tłuszcz schodzi, a mięśnie dalej mogą rosnąć. Trzymaj kalorie, białko i progres na treningu.' }
  if (pct <= 0.15) return { ico: 'pause', cls: '', title: 'Waga stoi', text: 'Jeśli siła rośnie, to może być rekompozycja. Jeśli stoi dłużej niż 3 tygodnie – ok. 100–200 kcal mniej albo więcej kroków.' }
  return { ico: 'up', cls: 'warn', title: 'Waga rośnie', text: 'Średnia idzie w górę. Sprawdź, czy kalorie się zgadzają.' }
})

const parseKg = v => { const n = +String(v || '').replace(',', '.').replace(/[^\d.]/g, ''); return n >= 30 && n <= 300 ? Math.round(n * 10) / 10 : null }

async function add() {
  const today = iso(new Date())
  const cur = weights.value.find(p => p.date === today)
  const r = await ask({ icon: scale, title: 'Dzisiejsza waga', message: 'W kilogramach, np. 106,3', input: { mode: 'decimal', value: cur ? fmtKg(cur.kg) : '', placeholder: last.value ? fmtKg(last.value.kg) : '0,0' },
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role !== 'ok') return
  const kg = parseKg(r.value)
  if (kg == null) return ask({ icon: scale, title: 'Nie rozumiem liczby', message: 'Wpisz wagę w kg, np. 106,3', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
  setWeight(today, kg)
}
async function edit(p) {
  const r = await ask({ icon: scale, title: fmtDate(p.date), message: 'Popraw wagę albo usuń pomiar', input: { mode: 'decimal', value: fmtKg(p.kg) },
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, { text: 'Usuń pomiar', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role === 'del') return delWeight(p.date)
  if (r.role !== 'ok') return
  const kg = parseKg(r.value)
  if (kg != null) setWeight(p.date, kg)
}
async function paste() {
  const r = await ask({ icon: clipboardOutline, title: 'Wklej stare pomiary', message: 'Data i waga, np. „29.10 108,0”. Każdy pomiar w nowej linii albo po średniku. Ten sam dzień nadpisze stary pomiar.',
    input: { multi: true, placeholder: '29.10 108,0\n31.10 107,6' }, buttons: [{ text: 'Dodaj', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role !== 'ok') return
  const got = parseList(r.value)
  got.forEach(p => setWeight(p.date, p.kg))
  ask({ icon: scale, title: got.length ? `Dodano ${got.length} ${got.length === 1 ? 'pomiar' : got.length < 5 ? 'pomiary' : 'pomiarów'}` : 'Nic nie rozpoznałem',
    message: got.length ? '' : 'Wpisz np. „29.10 108,0” – dzień.miesiąc i waga.', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
}

const cv = ref(null)
let chart = null
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim()
function draw() {
  if (!cv.value || !shown.value.length) return
  const c = css('--accent') || '#7346f5', muted = css('--app-muted') || '#8a8a8e', line = css('--app-line') || 'rgba(0,0,0,.1)'
  const g = cv.value.getContext('2d').createLinearGradient(0, 0, 0, 240)
  g.addColorStop(0, c + '40'); g.addColorStop(1, c + '00')
  const pts = shown.value
  chart?.destroy()
  chart = new Chart(cv.value, {
    type: 'line',
    data: {
      datasets: [
        { label: 'Średnia 7 dni', data: pts.map(p => ({ x: dnum(p.date), y: +p.avg.toFixed(2) })), borderColor: c, backgroundColor: g, fill: true, tension: .35, borderWidth: 3, pointRadius: 0, pointHitRadius: 0 },
        { label: 'Pomiar', data: pts.map(p => ({ x: dnum(p.date), y: p.kg })), showLine: false, pointRadius: pts.map((p, k) => (k === pts.length - 1 ? 5.5 : 3.5)),
          pointBackgroundColor: muted, pointBorderWidth: 0, pointHoverRadius: 6 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 450 }, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: false }, tooltip: { displayColors: false, callbacks: { title: x => dstr(x[0].parsed.x), label: x => x.dataset.label + ': ' + fmtKg(x.parsed.y.toFixed(1)) + ' kg' } } },
      scales: {
        x: { type: 'linear', grid: { display: false }, ticks: { color: muted, maxTicksLimit: 5, maxRotation: 0, callback: v => (Number.isInteger(v) ? dstr(v) : '') }, min: dnum(pts[0].date) - (pts.length === 1 ? 3 : 0), max: dnum(pts[pts.length - 1].date) + (pts.length === 1 ? 3 : 0) },
        y: { grid: { color: line }, border: { display: false }, ticks: { color: muted, maxTicksLimit: 5, callback: v => fmtKg(v) }, grace: '15%' }
      }
    }
  })
}
watch(shown, () => nextTick(draw))
onMounted(() => nextTick(draw))
onIonViewDidEnter(() => nextTick(draw))
onBeforeUnmount(() => chart?.destroy())
</script>

<style scoped>
.stats4 { display: grid; grid-template-columns: repeat(4, 1fr); padding: 14px 4px; }
.stats4 > div { padding: 0 8px; min-width: 0; }
.stats4 > div + div { border-left: 0.5px solid var(--app-line); }
.stats4 small { display: block; font-size: 12px; color: var(--app-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stats4 b { display: block; font-size: 20px; font-weight: 700; letter-spacing: -.3px; margin-top: 2px; white-space: nowrap; }
.stats4 b i { font-style: normal; font-size: 13px; color: var(--app-muted); font-weight: 600; }
.ok { color: var(--app-ok); }
.bad { color: var(--app-bad); }
.verdict { display: flex; gap: 12px; align-items: flex-start; }
.verdict.good { background: color-mix(in srgb, var(--app-ok) 12%, var(--app-card)); }
.verdict.warn { background: color-mix(in srgb, #ff9f0a 14%, var(--app-card)); }
.v-ico { font-size: 24px; line-height: 1.2; }
.verdict b { font-size: 16px; }
.verdict p { margin: 2px 0 0; color: var(--app-muted); font-size: 14px; line-height: 1.35; }
.period { margin: 4px 16px 12px; width: auto; }
.period ion-segment-button { --indicator-color: var(--seg-on, var(--app-card)); --color: var(--ion-text-color); --color-checked: var(--ion-text-color); font-size: 13px; font-weight: 600; min-height: 32px; }
:global(.ion-palette-dark) .period { --seg-on: #636366; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 10px; letter-spacing: -.2px; display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.leg { font-size: 12px; font-weight: 500; color: var(--app-muted); display: flex; align-items: center; gap: 5px; }
.leg .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--app-muted); }
.leg .ln { width: 14px; height: 3px; border-radius: 2px; background: var(--accent); margin-left: 6px; }
.chart-wrap { position: relative; height: 220px; }
.empty { color: var(--app-muted); text-align: center; padding: 28px 8px; line-height: 1.4; }
.btns { display: flex; flex-direction: column; gap: 10px; margin: 0 16px 16px; }
.primary-btn { background: var(--accent); color: #fff; }
.btns ion-icon { font-size: 20px; }
.row { width: 100%; background: none; color: inherit; font: inherit; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 11px 0; border: 0; border-top: 0.5px solid var(--app-line); min-height: 0; }
.card-title + .row { border-top: 0; }
.row::before { display: none; }
.r-left { display: flex; flex-direction: column; min-width: 0; }
.r-left b { font-size: 15px; font-weight: 600; }
.r-left span { font-size: 13px; color: var(--app-muted); }
.r-right { display: flex; align-items: baseline; gap: 4px; flex: none; }
.r-right b { font-size: 20px; font-weight: 700; }
.r-right small { color: var(--app-muted); }
.r-right small.ok { color: var(--app-ok); margin-right: 8px; }
.r-right small.bad { color: var(--app-bad); margin-right: 8px; }
.note { margin: 4px 22px 0; color: var(--app-muted); font-size: 13px; line-height: 1.4; }
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; pointer-events: auto; }
.mini-bar { pointer-events: none; }
.mini-bar.on .mb-back { pointer-events: auto; }
.goal { display: flex; align-items: center; gap: 10px; margin: 0 16px 10px; }
.goal > span { font-size: 14px; color: var(--app-muted); flex: none; }
.seg3 { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px; padding: 2px; border-radius: 10px; background: var(--app-field); }
.seg3 button { border: 0; padding: 7px 4px; border-radius: 8px; font: inherit; font-size: 14px; font-weight: 600; color: var(--ion-text-color); background: transparent; }
.seg3 button.on { background: var(--app-card); color: var(--accent); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
</style>
