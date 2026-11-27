<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>Waga</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Wróć</button>
        <h1 class="t-large">Waga</h1>
        <p class="sub">{{ list.length ? 'Ostatni pomiar ' + ago(last.date) : 'Zapisuj wagę rano, na czczo' }}</p>
      </header>
      <div class="page">

        <div class="card stats4 num">
          <div><small>Teraz</small><b>{{ last ? fmtKg(last.kg) : '–' }}<i v-if="last"> {{ wu() }}</i></b></div>
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

        <!-- pace in detail + where it leads (estimates) -->
        <div v-if="P" class="card est">
          <div class="card-title">Tempo i prognoza</div>
          <div class="e-row"><span>Tempo<small>{{ P.how === 'avg' ? 'średnia z ostatnich 2 tyg. vs średnia z 2 tyg. wcześniej' : 'linia przez pomiary z ostatnich 4 tyg.' }}</small></span>
            <b class="num" :class="tone(P.kg)">{{ signK(P.kg) }} {{ wu() }}/tydz.</b></div>
          <div class="e-row"><span>Realnie między<small>przy takim rozrzucie pomiarów</small></span><b class="num">{{ signK(P.lo) }} i {{ signK(P.hi) }}</b></div>
          <div class="e-row"><span>% wagi na tydzień<small>z {{ P.n }} pomiarów w {{ P.span }} dni</small></span><b class="num" :class="tone(P.kg)">{{ signPct(P.pct) }}</b></div>
          <div class="e-row"><span>Dziś według trendu<small>bez dziennych skoków wody</small></span><b class="num">{{ fmtKg(r1(P.level)) }} {{ wu() }}</b></div>
          <div class="e-row" v-for="w in [4, 12]" :key="w"><span>Za {{ w }} {{ w < 5 ? 'tygodnie' : 'tygodni' }}<small>{{ fmtDate(iso(new Date(Date.now() + w * 7 * 864e5))) }}</small></span>
            <b class="num">ok. {{ fmtKg(r1(P.level + P.kg * w)) }} {{ wu() }}<i>{{ fmtKg(r1(P.level + P.lo * w)) }}–{{ fmtKg(r1(P.level + P.hi * w)) }}</i></b></div>
          <div class="e-row"><span>{{ kcal < 0 ? 'Deficyt' : 'Nadwyżka' }} kalorii<small>szacunek: 1 kg tłuszczu ≈ 7700 kcal</small></span><b class="num">ok. {{ Math.abs(kcal) }} kcal/dzień</b></div>
        </div>

        <!-- calories: a steady daily intake (counted elsewhere) + the weight trend → burn → how much to eat -->
        <div v-if="list.length" class="card kcal">
          <div class="card-title">Kalorie</div>
          <template v-if="!prefs.kcalLog.length">
            <p class="k-intro">Wpisz, ile średnio jesz kcal dziennie (liczysz w innej apce). Gdy jesz podobnie przez ok. 2 tygodnie, policzę Twoje spalanie i powiem, ile jeść, żeby iść w dobrym tempie.</p>
            <button class="btn block soft-btn press" @click="setKcal">Wpisz kalorie</button>
          </template>
          <template v-else>
            <button class="e-row press k-row" @click="setKcal"><span>Jesz średnio<small>{{ kcalSince }}</small></span><b class="num">{{ E.current ?? '–' }} kcal<i>zmień</i></b></button>
            <template v-if="E.tdee">
              <div class="e-row"><span>Twoje spalanie<small>szacunek z wagi i kalorii, {{ E.known }} dni</small></span><b class="num">ok. {{ E.tdee }} kcal</b></div>
              <div v-if="prefs.goal !== 'maintain'" class="k-pace">
                <small>Tempo, które chcesz</small>
                <div class="seg3"><button v-for="o in paceOpts" :key="o" class="press" :class="{ on: paceNow === o }" @click="setPref('paceGoal', o)">{{ fmtKg(o) }} %</button></div>
              </div>
              <div class="k-advice" :class="{ same: Math.abs(E.diff ?? 0) < 100 }">
                <b class="num">Jedz ok. {{ E.suggest }} kcal dziennie</b>
                <p>{{ adviceText }}</p>
              </div>
              <p class="k-note">Zmień o tyle, trzymaj 2–3 tygodnie i zajrzyj znowu – liczba sama się poprawi, gdy waga zareaguje.<template v-if="E.floored"> Mniej nie radzę – za duży deficyt zabiera mięśnie i siłę.</template></p>
            </template>
            <p v-else class="k-note">{{ E.need === 'kcal' ? 'Zbieram dane: ' + E.known + ' z 14 dni z kaloriami w ostatnich tygodniach.' : 'Spalanie policzę, gdy będzie tempo wagi (4 pomiary z co najmniej tygodnia).' }}</p>
          </template>
        </div>

        <!-- target weight: progress + when, at the current pace -->
        <button v-if="list.length" class="card target press" @click="setTarget">
          <template v-if="prefs.goalKg">
            <div class="t-top"><b>Cel {{ fmtKg(r1(toU(prefs.goalKg))) }} {{ wu() }}</b><span class="num">{{ target.left > 0.05 ? 'zostało ' + fmtKg(r1(target.left)) + ' ' + wu() : 'cel osiągnięty!' }}</span></div>
            <div class="bar"><i :style="{ width: target.pct + '%' }"></i></div>
            <small>{{ target.eta }}</small>
          </template>
          <template v-else><div class="t-top t-empty"><b>Ustaw cel wagi</b><span>np. 80 kg – pokażę postęp i kiedy go osiągniesz</span></div></template>
        </button>

        <ion-segment class="period" :value="String(range ?? 'all')" @ionChange="e => (range = e.detail.value === 'all' ? null : +e.detail.value)">
          <ion-segment-button value="30"><ion-label>30 dni</ion-label></ion-segment-button>
          <ion-segment-button value="90"><ion-label>90 dni</ion-label></ion-segment-button>
          <ion-segment-button value="all"><ion-label>Całość</ion-label></ion-segment-button>
        </ion-segment>

        <div class="card chart-card">
          <div class="card-title">Waga <span class="leg"><i class="dot"></i>pomiar <i class="ln"></i>średnia 7 dni<template v-if="P"> <i class="ln dash"></i>prognoza</template></span></div>
          <div v-show="shown.length" class="chart-wrap"><canvas ref="cv"></canvas></div>
          <p v-if="P && shown.length" class="c-note">Przerywana linia = tempo z ostatnich 4 tyg. przedłużone o 4 tygodnie, pas = realny zakres.</p>
          <div v-if="!shown.length" class="empty">Brak pomiarów{{ list.length ? ' w tym okresie' : '' }}.<br>Dodaj pierwszy przyciskiem poniżej.</div>
        </div>

        <!-- details for the chosen period -->
        <div v-if="shown.length > 1" class="card det num">
          <div><small>Najniżej</small><b>{{ fmtKg(r1(det.min)) }}</b></div>
          <div><small>Najwyżej</small><b>{{ fmtKg(r1(det.max)) }}</b></div>
          <div><small>Średnio</small><b>{{ fmtKg(r1(det.avg)) }}</b></div>
          <div><small>30 dni</small><b :class="det.m30 == null ? '' : tone(det.m30)">{{ det.m30 == null ? '–' : sign(det.m30) }}</b></div>
          <div><small>Pomiarów</small><b>{{ shown.length }}</b></div>
          <div><small>W tym tyg.</small><b>{{ det.week }}<i>/7</i></b></div>
        </div>

        <div class="btns">
          <button class="btn block primary-btn press" @click="add"><ion-icon :icon="add_" /> Dodaj dzisiejszą wagę</button>
          <button class="btn block plain press" @click="paste"><ion-icon :icon="clipboardOutline" /> Wklej stare pomiary</button>
        </div>

        <div class="card weeks" v-if="weeksList.length > 1">
          <div class="card-title">Tygodnie <span class="leg">średnia · zmiana</span></div>
          <div v-for="w in weeksList" :key="w.from" class="wk-row num">
            <span>{{ w.label }}</span>
            <b>{{ fmtKg(r1(w.avg)) }} {{ wu() }}</b>
            <small :class="w.d == null ? '' : tone(w.d)">{{ w.d == null ? '' : sign(w.d) }}</small>
          </div>
        </div>

        <div class="card" v-if="list.length">
          <div class="card-title">Pomiary</div>
          <button class="row press" v-for="r in rows" :key="r.date" @click="edit(r)">
            <div class="r-left"><b class="num">{{ fmtDate(r.date) }}</b><span>{{ dayName(r.date) }}</span></div>
            <div class="r-right num">
              <small v-if="r.d" :class="{ ok: r.d < 0, bad: r.d > 0 }">{{ sign(r.d) }}</small>
              <b>{{ fmtKg(r1(r.kg)) }}</b><small>{{ wu() }}</small>
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
import { LOC, t } from '../i18n'
import Ico from './Ico.vue'
import { prefs } from '../prefs'
import { setPref } from '../account'
import { useIonRouter } from '@ionic/vue'
import { chevronBack } from 'ionicons/icons'
import { useScrolled } from '../useScrolled'
import { computed, ref, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel, IonIcon, onIonViewDidEnter } from '@ionic/vue'
import { Chart, LineController, LineElement, PointElement, LinearScale, Filler, Tooltip } from 'chart.js'
import { add as add_, clipboardOutline, scale } from 'ionicons/icons'
import { iso, fmtKg, fmtDate, fmtShort, ago } from '../store'
import { cloud } from '../cloud'
import { weights as weightsKg, weightsU as weights, setWeight, delWeight, parseList, smooth, paceToday, daysSince, kcalPerDay, energy } from '../weight'
import { wu, toU, fromU } from '../units'
import { askWeight, parseKg } from '../weightQuick'
import { ask } from '../dialog'

Chart.register(LineController, LineElement, PointElement, LinearScale, Filler, Tooltip)
const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/progress', 'back', 'replace'))
const { scrolled, onScroll } = useScrolled()
const dnum = s => Math.round(new Date(s + 'T12:00').getTime() / 864e5) // x axis = real days, so gaps show as gaps
const dstr = n => fmtShort(iso(new Date(n * 864e5))) // n is a day number from dnum; read back in local time it is that same date

const list = computed(() => smooth(weights.value))
const last = computed(() => list.value[list.value.length - 1])
const avg7 = computed(() => last.value?.avg ?? null)
// change since the start: average now against the average of the first week of weigh-ins (averages, not single days)
const total = computed(() => {
  if (list.value.length < 2) return 0
  const end = new Date(list.value[0].date + 'T12:00').getTime() + 6 * 864e5, first = list.value.filter(p => new Date(p.date + 'T12:00').getTime() <= end)
  return last.value.avg - first.reduce((a, p) => a + p.kg, 0) / first.length
})
const P = computed(() => paceToday(weights.value))
const since = computed(() => daysSince(weights.value))
// calories (always worked out in kg)
const E = computed(() => energy(weightsKg.value, prefs.kcalLog, prefs.goal, prefs.paceGoal))
const paceOpts = computed(() => (prefs.goal === 'bulk' ? [0.1, 0.25, 0.5] : [0.3, 0.5, 0.7]))
const paceNow = computed(() => prefs.paceGoal ?? (prefs.goal === 'bulk' ? 0.25 : 0.5))
const kcalSince = computed(() => { const e = [...prefs.kcalLog].sort((a, b) => a.from.localeCompare(b.from)).at(-1); return e ? 'od ' + fmtDate(e.from) : '' })
const adviceText = computed(() => {
  const e = E.value; if (!e.tdee) return ''
  const goal = prefs.goal === 'maintain' ? 'żeby trzymać wagę' : (prefs.goal === 'bulk' ? 'żeby przybierać ok. ' : 'żeby chudnąć ok. ') + (prefs.goal === 'maintain' ? '' : fmtKg(r1(Math.abs(toU(e.targetKg)))) + ' ' + wu() + ' na tydzień')
  if (e.diff == null) return goal + '.'
  if (Math.abs(e.diff) < 100) return 'Tyle, ile teraz – ' + goal + '.'
  return (e.diff > 0 ? 'O ' + e.diff + ' kcal więcej' : 'O ' + -e.diff + ' kcal mniej') + ' niż teraz – ' + goal + '.'
})
async function setKcal() {
  const today = iso(new Date()), ago = n => iso(new Date(Date.now() - n * 864e5))
  const cur = E.value.current
  const r = await ask({ icon: scale, title: 'Ile jesz dziennie?', message: 'Średnio, w kcal – tak jak liczysz w swojej apce do kalorii.', input: { mode: 'numeric', value: cur ? String(cur) : '', placeholder: 'np. 2400' },
    choices: [{ key: 'from', label: 'Od kiedy tak jesz?', value: prefs.kcalLog.length ? today : ago(14), options: [{ value: today, label: 'Od dziś' }, { value: ago(7), label: 'Od tygodnia' }, { value: ago(14), label: 'Od 2 tyg.' }, { value: ago(28), label: 'Od miesiąca' }] }],
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, ...(prefs.kcalLog.length ? [{ text: 'Wyczyść kalorie', role: 'clear', kind: 'danger' }] : []), { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role === 'clear') return setPref('kcalLog', [])
  if (r.role !== 'ok') return
  const v = Math.round(+String(r.value || '').replace(/[^\d]/g, ''))
  if (!(v >= 800 && v <= 8000)) return ask({ icon: scale, title: 'Nie rozumiem liczby', message: 'Wpisz kalorie na dzień, np. 2400.', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
  const from = r.picks.from
  setPref('kcalLog', [...prefs.kcalLog.filter(e => e.from < from), { from, kcal: v }])
}
const wk = computed(() => P.value?.kg ?? null)
const kcal = computed(() => (P.value ? kcalPerDay(fromU(P.value.kg)) : 0))
const signK = v => { const r = Math.round(v * 100) / 100; return (r > 0 ? '+' : r < 0 ? '−' : '±') + fmtKg(Math.abs(r)) }
const signPct = v => { const r = Math.round(v * 100) / 100; return (r > 0 ? '+' : r < 0 ? '−' : '±') + fmtKg(Math.abs(r)) + ' %' }
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
const r1 = v => Math.round(v * 10) / 10
// details of the shown period
const det = computed(() => {
  const v = shown.value.map(p => p.kg), today = iso(new Date())
  const ago30 = iso(new Date(Date.now() - 30 * 864e5)), old = list.value.filter(p => p.date <= ago30).at(-1)
  const mon = new Date(); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7))
  return { min: Math.min(...v), max: Math.max(...v), avg: v.reduce((a, b) => a + b, 0) / v.length,
    m30: old && last.value ? last.value.avg - old.avg : null, week: list.value.filter(p => p.date >= iso(mon) && p.date <= today).length }
})
// last 8 Mon–Sun weeks with measurements: average and change vs the week before
const weeksList = computed(() => {
  const by = {}
  for (const p of list.value) { const d = new Date(p.date + 'T12:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); (by[iso(d)] ||= []).push(p.kg) }
  const ks = Object.keys(by).sort()
  return ks.map((k, i) => ({ from: k, avg: by[k].reduce((a, b) => a + b, 0) / by[k].length, prev: i ? ks[i - 1] : null }))
    .map(w => ({ ...w, d: w.prev ? w.avg - by[w.prev].reduce((a, b) => a + b, 0) / by[w.prev].length : null, label: fmtShort(w.from) + ' – ' + fmtShort(iso(new Date(new Date(w.from + 'T12:00').getTime() + 6 * 864e5))) }))
    .slice(-8).reverse()
})
// target weight progress + ETA at the current pace
const target = computed(() => {
  const g = toU(prefs.goalKg), now = avg7.value ?? last.value?.kg
  if (!g || now == null) return { left: 0, pct: 0, eta: '' }
  const start = list.value[0].kg, left = Math.abs(now - g)
  const pct = Math.max(0, Math.min(100, Math.round(start === g ? 100 : (start - now) / (start - g) * 100)))
  let eta
  if (left <= 0.05) eta = 'Gratulacje – trzymaj wagę.'
  else if (wk.value == null) eta = 'Termin pokażę, gdy będzie tempo (4 pomiary z co najmniej tygodnia).'
  else if (Math.sign(g - now) !== Math.sign(wk.value) || Math.abs(wk.value) < 0.02) eta = 'Przy obecnym tempie waga nie idzie w stronę celu.'
  else { const w = left / Math.abs(wk.value), d = new Date(Date.now() + w * 7 * 864e5); eta = 'Przy obecnym tempie: ok. ' + Math.ceil(w) + ' tyg. – około ' + fmtDate(iso(d)) }
  return { left, pct, eta }
})
async function setTarget() {
  const r = await ask({ icon: scale, title: 'Cel wagi', message: 'Ile chcesz ważyć? Zostaw puste, żeby usunąć cel.', input: { mode: 'decimal', value: prefs.goalKg ? fmtKg(r1(toU(prefs.goalKg))) : '', placeholder: 'np. 80' },
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role !== 'ok') return
  const v = String(r.value || '').trim() ? parseKg(r.value) : null
  setPref('goalKg', v == null ? null : fromU(v))
}
const GOALS = [{ v: 'cut', t: 'Redukcja' }, { v: 'maintain', t: 'Utrzymanie' }, { v: 'bulk', t: 'Masa' }]
const tone = v => { const g = prefs.goal; if (g === 'maintain' || Math.abs(v) < 0.05) return ''; return (g === 'bulk' ? v > 0 : v < 0) ? 'ok' : 'bad' }
const verdict = computed(() => {
  if (wk.value == null && since.value > 14) return { ico: 'chart', cls: '', title: 'Dawno bez pomiaru', text: 'Ostatnia waga jest sprzed ' + since.value + ' dni. Zważ się, żeby policzyć aktualne tempo.' }
  if (wk.value == null) return list.value.length ? { ico: 'chart', cls: '', title: 'Zbieram dane', text: 'Tempo pokażę po 4 pomiarach z co najmniej tygodnia. Najlepiej waż się codziennie rano.' } : null
  const pct = P.value.pct
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


async function add() { await askWeight() }
async function edit(p) {
  const r = await ask({ icon: scale, title: fmtDate(p.date), message: 'Popraw wagę albo usuń pomiar', input: { mode: 'decimal', value: fmtKg(p.kg) },
    buttons: [{ text: 'Zapisz', role: 'ok', kind: 'primary' }, { text: 'Usuń pomiar', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role === 'del') return delWeight(p.date)
  if (r.role !== 'ok') return
  const kg = parseKg(r.value)
  if (kg != null) setWeight(p.date, fromU(kg))
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
  const g = cv.value.getContext('2d').createLinearGradient(0, 0, 0, 250)
  g.addColorStop(0, c + '40'); g.addColorStop(1, c + '00')
  const pts = shown.value, byX = new Map(pts.map((p, k) => [dnum(p.date), { p, prev: k ? pts[k - 1] : null }]))
  // the 7-day average breaks where there were 8+ days without weighing (no invented line over the gap)
  const avg = []
  pts.forEach((p, k) => { if (k && dnum(p.date) - dnum(pts[k - 1].date) > 7) avg.push({ x: dnum(p.date) - 1, y: null }); avg.push({ x: dnum(p.date), y: +p.avg.toFixed(2) }) })
  const pr = P.value, x0 = dnum(list.value.at(-1).date), x1 = pts.length ? dnum(pts[0].date) : x0
  const ahead = pr ? 28 : 0, proj = []
  if (pr) for (let d = Math.max(Math.ceil(pr.from), x1 - x0); d <= ahead + pr.ago; d += 1) proj.push({ x: x0 + d, y: pr.level0 + pr.kg / 7 * d, lo: pr.level0 + (d > 0 ? pr.lo : pr.kg) / 7 * d, hi: pr.level0 + (d > 0 ? pr.hi : pr.kg) / 7 * d })
  const ys = [...pts.map(p => p.kg), ...proj.flatMap(q => [q.lo, q.hi])], lo = Math.min(...ys), hi = Math.max(...ys)
  const step = hi - lo < 3 ? 0.5 : hi - lo < 8 ? 1 : hi - lo < 20 ? 2 : 5
  const xmin = x1 - (pts.length === 1 ? 3 : 0), xmax = x0 + (ahead ? ahead + pr.ago : pts.length === 1 ? 3 : 0), span = xmax - xmin
  const every = span <= 40 ? 7 : span <= 120 ? 14 : 28
  chart?.destroy()
  chart = new Chart(cv.value, {
    type: 'line',
    data: {
      datasets: [
        { label: 'band-lo', data: proj.map(q => ({ x: q.x, y: q.hi })), borderWidth: 0, pointRadius: 0, pointHitRadius: 0, fill: false },
        { label: 'band', data: proj.map(q => ({ x: q.x, y: q.lo })), borderWidth: 0, pointRadius: 0, pointHitRadius: 0, backgroundColor: c + '22', fill: '-1' },
        { label: 'Prognoza', data: proj.map(q => ({ x: q.x, y: q.y })), borderColor: c, borderDash: [5, 5], borderWidth: 2, pointRadius: 0, pointHitRadius: 0, fill: false },
        { label: 'Średnia 7 dni', data: avg, borderColor: c, backgroundColor: g, fill: true, tension: .3, borderWidth: 3, pointRadius: 0, pointHitRadius: 0, spanGaps: false },
        { label: 'Pomiar', data: pts.map(p => ({ x: dnum(p.date), y: p.kg })), showLine: false, pointRadius: pts.map((p, k) => (k === pts.length - 1 ? 5 : 3.5)),
          pointBackgroundColor: muted, pointBorderWidth: 0, pointHoverRadius: 6, pointHitRadius: 12 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 450 }, layout: { padding: { right: 10, top: 6 } },
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      plugins: { legend: { display: false }, tooltip: { displayColors: false, filter: x => x.dataset.label === 'Pomiar' || x.dataset.label === 'Prognoza', yAlign: 'bottom',
        callbacks: {
          title: x => { const n = x[0].parsed.x; return dstr(n) + ' · ' + new Date(n * 864e5).toLocaleDateString(LOC(), { weekday: 'short' }) },
          label: x => {
            const n = x.parsed.x, q = byX.get(n), U = ' ' + wu()
            if (x.dataset.label === 'Prognoza') return n > x0 ? [t('Prognoza') + ': ' + fmtKg(x.parsed.y.toFixed(1)) + U, t('Zakres') + ': ' + fmtKg(proj.find(r => r.x === n).lo.toFixed(1)) + '–' + fmtKg(proj.find(r => r.x === n).hi.toFixed(1)) + U] : []
            if (!q) return []
            const out = [t('Pomiar') + ': ' + fmtKg(q.p.kg.toFixed(1)) + U, t('Średnia 7 dni') + ': ' + fmtKg(q.p.avg.toFixed(1)) + U]
            if (q.prev) out.push(t('Od poprzedniego') + ': ' + sign(q.p.kg - q.prev.kg) + U)
            return out
          }
        } } },
      scales: {
        x: { type: 'linear', min: xmin, max: xmax, grid: { color: line, drawTicks: false }, border: { display: false },
          afterBuildTicks: ax => { const t = [], mon = n => n - ((new Date(n * 864e5).getDay() + 6) % 7); for (let n = mon(Math.ceil(xmin)); n <= xmax; n += every) if (n >= xmin) t.push({ value: n }); ax.ticks = t },
          ticks: { color: muted, maxRotation: 0, autoSkip: true, padding: 6, callback: v => dstr(v) } },
        y: { min: Math.floor((lo - step * 0.2) / step) * step, max: Math.ceil((hi + step * 0.2) / step) * step, grid: { color: line }, border: { display: false },
          ticks: { color: muted, stepSize: step, callback: v => (Math.abs(+v / step - Math.round(+v / step)) < 1e-6 ? fmtKg(v) : '') } }
      }
    }
  })
}
watch(shown, () => nextTick(draw))
onMounted(() => nextTick(draw))
// drawn while the page was still sliding in → draw again once it is on screen
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
.verdict.good b { color: var(--app-ok); }
.verdict.warn b { color: #ff9500; }
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
.chart-wrap { position: relative; height: 250px; }
.kcal .k-intro { margin: 0 0 12px; font-size: 14px; color: var(--app-muted); line-height: 1.4; }
.soft-btn { background: color-mix(in srgb, var(--accent) 16%, transparent); color: var(--accent); }
.kcal .k-row { width: 100%; background: none; border: 0; font: inherit; color: inherit; text-align: left; }
.kcal .k-pace { padding: 10px 0; border-top: 0.5px solid var(--app-line); display: flex; align-items: center; gap: 10px; }
.kcal .k-pace small { font-size: 13px; color: var(--app-muted); flex: none; }
.kcal .k-advice { margin-top: 6px; padding: 12px 14px; border-radius: 14px; background: color-mix(in srgb, var(--accent) 14%, transparent); }
.kcal .k-advice b { font-size: 18px; color: var(--accent); }
.kcal .k-advice.same b { color: var(--app-ok); }
.kcal .k-advice p { margin: 3px 0 0; font-size: 14px; line-height: 1.35; }
.kcal .k-note { margin: 10px 0 0; font-size: 12.5px; color: var(--app-muted); line-height: 1.4; }
.kcal .e-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 0; border-top: 0.5px solid var(--app-line); }
.kcal .card-title + .e-row { border-top: 0; }
.kcal .e-row span { font-size: 14.5px; display: flex; flex-direction: column; }
.kcal .e-row small { font-size: 12px; color: var(--app-muted); margin-top: 1px; }
.kcal .e-row b { font-size: 16px; font-weight: 700; display: flex; flex-direction: column; align-items: flex-end; }
.kcal .e-row b i { font-style: normal; font-size: 12px; font-weight: 500; color: var(--accent); }
.leg .ln.dash { background: repeating-linear-gradient(90deg, var(--accent) 0 4px, transparent 4px 7px); }
.c-note { margin: 8px 2px 0; font-size: 12px; color: var(--app-muted); line-height: 1.35; }
.est .e-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 9px 0; border-top: 0.5px solid var(--app-line); }
.est .card-title + .e-row { border-top: 0; }
.est .e-row span { font-size: 14.5px; display: flex; flex-direction: column; min-width: 0; }
.est .e-row small { font-size: 12px; color: var(--app-muted); margin-top: 1px; line-height: 1.3; }
.est .e-row b { font-size: 16px; font-weight: 700; text-align: right; flex: none; display: flex; flex-direction: column; align-items: flex-end; }
.est .e-row b i { font-style: normal; font-size: 12px; font-weight: 500; color: var(--app-muted); }
.est .e-row b.ok { color: var(--app-ok); } .est .e-row b.bad { color: var(--app-bad); }
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
.target { display: block; width: calc(100% - 32px); margin: 0 16px 10px; padding: 13px 15px; border: 0; text-align: left; font: inherit; color: inherit; }
.t-top { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; }
.t-top b { font-size: 16px; font-weight: 700; white-space: nowrap; }
.t-top.t-empty { flex-direction: column; align-items: flex-start; gap: 2px; }
.t-top.t-empty span { text-align: left; }
.t-top span { font-size: 13px; color: var(--app-muted); text-align: right; }
.target .bar { height: 8px; border-radius: 4px; background: var(--app-field); margin: 9px 0 6px; overflow: hidden; }
.target .bar i { display: block; height: 100%; border-radius: 4px; background: linear-gradient(90deg, var(--accent-2, var(--accent)), var(--accent)); }
.target small { font-size: 13px; color: var(--app-muted); }
.det { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px 6px; margin: 0 16px 12px; padding: 13px 14px; }
.det div { display: flex; flex-direction: column; }
.det small { font-size: 12px; color: var(--app-muted); }
.det b { font-size: 18px; font-weight: 700; }
.det b i { font-style: normal; font-size: 13px; color: var(--app-muted); font-weight: 500; }
.det b.ok { color: var(--app-ok); } .det b.bad { color: var(--app-bad); }
.weeks .wk-row { display: grid; grid-template-columns: 1fr auto 64px; gap: 10px; align-items: baseline; padding: 9px 16px; border-top: 0.5px solid var(--app-line); font-size: 14.5px; }
.weeks .wk-row span { color: var(--app-muted); }
.weeks .wk-row small { text-align: right; font-weight: 600; color: var(--app-muted); }
.weeks .wk-row small.ok { color: var(--app-ok); } .weeks .wk-row small.bad { color: var(--app-bad); }
</style>
