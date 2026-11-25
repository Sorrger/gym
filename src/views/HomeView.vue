<template>
  <ion-page>
    <ion-content>
      <div class="home page-top">
        <header class="page-head">
          <p class="eyebrow">{{ todayText }}</p>
          <h1>{{ greeting }}</h1>
        </header>

        <div v-if="state.loadError" class="card warn" @click="reload">
          <ion-icon :icon="alertCircle" />
          <div><b>Nie udało się wczytać treningów</b><span>Nic nie zostało usunięte. Dotknij, żeby spróbować ponownie.</span></div>
        </div>
        <div v-else-if="backupWarn" class="card warn" @click="router.push('/settings/backup')">
          <ion-icon :icon="cloudOfflineOutline" />
          <div><b>Kopia na GitHubie nie działa</b><span>{{ cloud.error || 'Nie wysłano od kilku dni' }}</span></div>
        </div>

        <!-- workout in progress -->
        <button v-if="active" class="live-card press" :style="{ '--c': COLORS[PLAN[active.day].key] }" @click="open(active.id)">
          <div class="live-top">
            <span class="live-dot"><i></i> Trening w toku</span>
            <span class="num">{{ activeMinutes }}</span>
          </div>
          <div class="live-mid">
            <div>
              <b>{{ PLAN[active.day].name }}</b>
              <span class="num">{{ activeCounts.n }} z {{ activeCounts.t }} serii</span>
            </div>
            <svg class="ring" viewBox="0 0 44 44" aria-hidden="true">
              <circle cx="22" cy="22" r="18" class="r-bg" />
              <circle cx="22" cy="22" r="18" class="r-fg" :style="{ strokeDashoffset: 113.1 * (1 - activePct) }" />
            </svg>
          </div>
          <span class="live-go">Kontynuuj <ion-icon :icon="chevronForward" /></span>
        </button>

        <!-- this week -->
        <div class="card week">
          <div class="week-head">
            <span class="t-head">Ten tydzień</span>
            <span class="t-foot num">{{ weekCount }} {{ weekCount === 1 ? 'trening' : weekCount >= 2 && weekCount <= 4 ? 'treningi' : 'treningów' }}</span>
          </div>
          <div class="days">
            <div v-for="d in week" :key="d.date" class="day" :class="{ today: d.today, future: d.future, off: d.off, both: d.both }" @click="dayTap(d)">
              <span class="wd">{{ d.wd }}</span>
              <span class="dot num" :class="{ has: d.s }" :style="d.s ? { '--c': COLORS[PLAN[d.s.day].key] } : null">
                <ion-icon v-if="d.s" :icon="checkmark" /><template v-else>{{ d.n }}</template>
              </span>
            </div>
          </div>
        </div>

        <!-- quick numbers: streak, body weight, all trainings -->
        <div class="stats home-stats">
          <div><span><Ico name="flame" /> Seria</span><b class="num">{{ streak }}<small>{{ streak === 1 ? 'tydz.' : 'tyg.' }}</small></b></div>
          <div class="press w-tile" @click="quickWeight" aria-label="Zapisz dzisiejszą wagę"><span><Ico name="scale" /> Waga<i class="w-plus" :class="{ done: weighedToday }">{{ weighedToday ? '✓' : '+' }}</i></span>
            <b v-if="wNow" class="num">{{ fmt(wNow) }}<small>kg</small></b><b v-else class="add">Dodaj</b>
            <em v-if="wTrend != null" class="num" :class="weightTone(wTrend)">{{ wTrend > 0 ? '+' : '' }}{{ fmt(wTrend, 2) }} kg/tydz.</em></div>
          <div><span><Ico name="dumbbell" /> Treningi</span><b class="num">{{ totalDone }}</b><em class="num">{{ monthDone }} w tym mies.</em></div>
        </div>

        <div v-if="dl.active || dl.due" class="card warn dl-card">
          <ion-icon :icon="trendingDown" />
          <div><b>Tydzień lżejszy (deload)</b>
            <span>{{ dl.active ? 'Do ' + dlEnd + ': ' + deloadWords() + ', 3-4 powtórzenia w zapasie.' : 'Od następnego treningu – ' + dl.reason + '. ' + cap(deloadWords()) + ', potem wracasz do normy.' }}</span></div>
        </div>
        <h3 class="section-title">{{ active ? 'Albo zacznij inny' : 'Twój trening' }}</h3>
        <button v-if="!active" class="off-link press" @click="markOff">
          <ion-icon :icon="addCircle" /><template v-if="sug.kind === 'missed'">Trening {{ PLAN[next].name }} zrobiony bez zapisu? <b>Dodaj</b></template><template v-else><b>Dodaj zrobiony trening</b></template>
        </button>
        <!-- only the suggested training here; all of them are in the Trening tab -->
        <div class="plans solo">
          <template v-for="(d, i) in PLAN" :key="d.key">
          <button v-if="!d.hidden && i === next && !active" class="plan press" :class="{ next: i === next && !active }"
            :style="{ '--c': COLORS[d.key] }" @click="start(i)">
            <div class="plan-top">
              <div class="plan-l">
                <span class="plan-ico">{{ d.abbr }}</span>
                <span v-if="i === next && !active" class="next-pill">{{ { today: 'Dziś', missed: 'Zaległy', next: 'Następny' }[sug.kind] }}</span>
              </div>
              <div class="plan-body"><BodyMap v-bind="dayMuscles(i)" /></div>
            </div>
            <b>{{ d.name }}</b>
            <span class="meta">{{ d.ex.length }} ćwiczeń · {{ lastText(i) }}</span>
          </button>
          </template>
        </div>
        <button class="all-link press" @click="router.push('/tabs/train')">Wszystkie treningi ({{ nVisible }}) <ion-icon :icon="chevronForward" /></button>

      </div>

      <ion-toast :is-open="!!state.flash" :message="t(state.flash)" :duration="2500" position="top" @didDismiss="state.flash = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { LOC, t } from '../i18n'
import { weightTone, deloadWords } from '../prefs'
const cap = t => t.charAt(0).toUpperCase() + t.slice(1)
import Ico from './Ico.vue'
import BodyMap from './BodyMap.vue'
import { dayMuscles } from '../muscles'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, useIonRouter, onIonViewWillEnter } from '@ionic/vue'
import { chevronForward, checkmark, alertCircle, cloudOfflineOutline, trendingDown, addCircle } from 'ionicons/icons'
import { PLAN, COLORS, WEEKDAY_TO_DAY } from '../plan'
import { cloud } from '../cloud'
import { weights, smooth, trend } from '../weight'
import { askWeight } from '../weightQuick'
import { weekStreak } from '../stats'
import { state, activeSession, lastDoneOf, suggestion, deloadState, doneSessions, counts, ago, iso, markDoneOff, offMarks, remove, addPastSession, dropEmptyManual } from '../store'
import { ask } from '../dialog'

const router = useIonRouter()
const active = computed(() => { void state.sessions; return activeSession() })
const activeCounts = computed(() => (active.value ? counts(active.value) : { n: 0, t: 0 }))
const activePct = computed(() => (activeCounts.value.t ? activeCounts.value.n / activeCounts.value.t : 0))
const nowTick = ref(Date.now()); let tk
onIonViewWillEnter(() => dropEmptyManual())
onMounted(() => { dropEmptyManual(); tk = setInterval(() => (nowTick.value = Date.now()), 30000) })
onUnmounted(() => clearInterval(tk))
const activeMinutes = computed(() => {
  if (!active.value) return ''
  const m = Math.max(0, Math.round((nowTick.value - active.value.started) / 60000))
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'
})
const sug = computed(() => { void state.sessions; void nowTick.value; return suggestion() })
const next = computed(() => sug.value.day)
const dlEnd = computed(() => dl.value.end ? dl.value.end.slice(8) + '.' + dl.value.end.slice(5, 7) : '')
const dl = computed(() => { void state.sessions; void nowTick.value; return deloadState() })
const done = computed(() => { void state.sessions; return doneSessions() })
const totalSets = computed(() => done.value.reduce((a, s) => a + counts(s).n, 0))

const todayText = computed(() => {
  const s = new Date().toLocaleDateString(LOC(), { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 5 ? 'Dobranoc' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór'
})

// "done without the app": the user picks which plan and on which day of this week (maybe another plan was done that day)
// "Dodaj zrobiony trening": a training done but not logged (forgot the phone, before the app…).
// With sets → a finished workout on that day, opened to tick the sets; without → just marked as done.
async function markOff() {
  const day = next.value, now = new Date()
  const WD = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(now); d.setDate(now.getDate() - 6 + k); return d }).map(d => {
    const date = iso(d), real = done.value.filter(s => s.date === date), offs = offMarks().filter(s => s.date === date)
    return { date, d, real, offs, label: date === iso(now) ? 'Dziś' : WD[d.getDay()] }
  })
  const js = +Object.keys(WEEKDAY_TO_DAY).find(k => WEEKDAY_TO_DAY[k] === day)
  const sched = sug.value.kind === 'missed' ? days.filter(x => x.d.getDay() === js).at(-1) : null
  const def = (sched && !sched.real.length ? sched : days.slice().reverse().find(x => !x.real.length && !x.offs.length) || days[6]).date
  const { role, picks } = await ask({ icon: addCircle, title: 'Dodaj zrobiony trening',
    message: 'Zapomniałeś zapisać? Wybierz trening i dzień. Możesz wpisać serie albo tylko zaznaczyć, że trening był.',
    choices: [
      { key: 'day', label: 'Trening', value: day, options: PLAN.map((p, i) => ({ value: i, label: p.name, hidden: p.hidden })).filter(o => !o.hidden) },
      { key: 'date', label: 'Kiedy', value: def, options: days.map(x => ({ value: x.date, label: x.label, sub: x.real.length ? PLAN[x.real[0].day].name : x.d.getDate() + '.' + String(x.d.getMonth() + 1).padStart(2, '0') })) }],
    buttons: [
      { text: 'Wpisz serie i ciężary', role: 'sets', kind: 'primary' },
      { text: 'Bez serii – tylko zaznacz, że był', role: 'mark', kind: 'soft' },
      { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'sets') { const s = addPastSession(picks.day, picks.date); router.push('/workout/' + s.id); return }
  if (role !== 'mark') return
  markDoneOff(picks.day, picks.date)
  const x = days.find(y => y.date === picks.date)
  state.flash = `Dodano: ${PLAN[picks.day].name}, ${x.label.toLowerCase()} ${x.d.getDate()}.${picks.date.slice(5, 7)} (bez serii)`
}
// tapping a day with "done without the app" marks: remove one
async function dayTap(d) {
  if (!d.offs.length) return
  const { role } = await ask({ icon: checkmark, title: 'Trening bez serii', message: `${d.wd} ${d.n}.${d.date.slice(5, 7)}: ` + d.offs.map(s => PLAN[s.day].name).join(', ') + ' – zaznaczony jako zrobiony, bez wpisanych serii. Usunąć?',
    buttons: [...d.offs.map(s => ({ text: 'Usuń: ' + PLAN[s.day].name, role: s.id, kind: 'danger' })), { text: 'Zostaw', role: 'cancel', kind: 'plain' }] })
  if (role !== 'cancel' && state.sessions[role]?.offApp) remove(role)
}
const streak = computed(() => { void state.sessions; return weekStreak() })
const wNow = computed(() => { const l = weights.value; return l.length ? smooth(l).at(-1).avg : null })
const wTrend = computed(() => trend(weights.value))
// weight in one tap from Start: dialog right here (details → the Weight page)
const weighedToday = computed(() => weights.value.some(p => p.date === iso(new Date())))
async function quickWeight() {
  const r = await askWeight({ details: true })
  if (r === 'details') router.push('/weight')
  else if (r === 'saved') state.flash = 'Waga zapisana'
}
const fmt = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ',')
const totalDone = computed(() => doneSessions().length)
const monthDone = computed(() => { const m = iso(new Date()).slice(0, 7); return doneSessions().filter(s => s.date.startsWith(m)).length })
const week = computed(() => {
  void state.sessions
  const now = new Date(), today = iso(now)
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  const offs = offMarks()
  return ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((wd, k) => {
    const d = new Date(mon); d.setDate(mon.getDate() + k)
    const date = iso(d)
    const real = done.value.filter(s => s.date === date), off = offs.filter(s => s.date === date)
    return { k, wd, date, n: d.getDate(), today: date === today, future: date > today, real, offs: off, s: real[0] || off[0], off: !real.length && !!off.length, both: !!real.length && !!off.length }
  })
})
const weekCount = computed(() => week.value.reduce((a, d) => a + d.real.length + d.offs.length, 0))
const monthCount = computed(() => { const p = iso(new Date()).slice(0, 7); return done.value.filter(s => s.date.startsWith(p)).length })

function lastText(i) { void state.sessions; const l = lastDoneOf(i); return l ? ago(l.date) : 'jeszcze nie było' }

// warn only when the backup has been failing for a while, not after one missed upload at the gym
const backupWarn = computed(() => cloud.token && cloud.dirty && cloud.error && cloud.error !== 'Brak połączenia' ||
  (cloud.token && cloud.dirty && cloud.lastSync && Date.now() - cloud.lastSync > 3 * 864e5))
const reload = () => location.reload()
const isToday = i => WEEKDAY_TO_DAY[new Date().getDay()] === i

function open(id) { router.push('/workout/' + id) }

// tapping a plan opens its preview (exercises, last results) – the workout starts from there
function start(day) { router.push('/plan/' + day) }
const nVisible = computed(() => PLAN.filter(p => !p.hidden).length)
</script>

<style scoped>
.eyebrow { margin: 0 0 2px; color: var(--app-muted); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }

.warn { display: flex; gap: 12px; align-items: center; color: var(--app-bad); }
.warn ion-icon { font-size: 26px; flex: none; }
.warn b { display: block; font-size: 15px; font-weight: 600; }
.warn span { display: block; font-size: 13px; color: var(--app-muted); }
.dl-card { color: #0a84ff; background: color-mix(in srgb, #0a84ff 9%, var(--app-card)); align-items: flex-start; }
.dl-card ion-icon { font-size: 20px; padding: 8px; border-radius: 11px; background: color-mix(in srgb, #0a84ff 16%, transparent); }
.dl-card span { margin-top: 2px; line-height: 1.35; }

/* in-progress workout: the most important thing on the screen */
.live-card { display: block; width: calc(100% - 32px); margin: 0 16px 12px; padding: 16px 16px 14px; border: 0; border-radius: var(--r-lg); text-align: left;
  color: #fff; font: inherit; box-shadow: 0 10px 28px color-mix(in srgb, var(--c) 32%, transparent);
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 78%, #fff) 0%, var(--c) 55%, color-mix(in srgb, var(--c) 82%, #000) 100%); }
.live-top { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; opacity: .92; }
.live-dot { display: flex; align-items: center; gap: 6px; }
.live-dot i { width: 7px; height: 7px; border-radius: 50%; background: #fff; animation: pulse 1.6s infinite; }
@keyframes pulse { 50% { opacity: .35; } }
@media (prefers-reduced-motion: reduce) { .live-dot i { animation: none; } }
.live-mid { display: flex; justify-content: space-between; align-items: center; margin: 6px 0 10px; }
.live-mid b { display: block; font-size: 28px; font-weight: 700; letter-spacing: -.3px; }
.live-mid span { font-size: 15px; opacity: .9; }
.ring { width: 52px; height: 52px; transform: rotate(-90deg); flex: none; }
.ring circle { fill: none; stroke-width: 5; }
.r-bg { stroke: rgba(255,255,255,.28); }
.r-fg { stroke: #fff; stroke-linecap: round; stroke-dasharray: 113.1; transition: stroke-dashoffset .4s; }
.live-go { display: inline-flex; align-items: center; gap: 2px; background: rgba(255,255,255,.22); border-radius: 999px; padding: 6px 12px 6px 14px;
  font-size: 15px; font-weight: 600; }

.week { padding: 14px 12px; }
.day.off .dot { opacity: .5; }
.day.both .dot { box-shadow: 0 0 0 2px var(--app-card), 0 0 0 3.5px color-mix(in srgb, var(--c) 45%, transparent); }
.off-link { display: flex; align-items: center; gap: 6px; width: calc(100% - 40px); margin: 0 20px 12px; padding: 0; border: 0; background: none; text-align: left; font: inherit; font-size: 13.5px; color: var(--app-muted); }
.off-link b { color: var(--accent); font-weight: 600; }
.off-link ion-icon { font-size: 19px; color: var(--accent); flex: none; }
.week-head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 12px; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); }
.day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.wd { font-size: 12px; font-weight: 500; color: var(--app-muted); }
.day.today .wd { color: var(--accent); font-weight: 700; }
.dot { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 15px; font-weight: 500;
  background: var(--app-field); color: var(--ion-text-color); }
.day.future .dot { background: none; color: var(--app-faint); }
.day.today .dot { background: var(--accent); color: #fff; font-weight: 700; }
.dot.has { background: var(--c); color: #fff; font-size: 18px; }
.day.today .dot.has { background: var(--c); box-shadow: 0 0 0 2px var(--app-card), 0 0 0 4px var(--c); }

.section-title { margin-top: 20px; }
.plans { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 16px; }
.plans.solo { grid-template-columns: 1fr; }
.plans.solo .plan-body { height: 96px; }
.home-stats { margin: 0 16px 12px; padding: 13px 0; }
.home-stats > div { padding: 0 12px; }
.home-stats span { font-size: 12.5px; }
.home-stats b { font-size: 21px; }
.home-stats b.add { color: var(--accent); font-size: 17px; padding-top: 3px; }
.home-stats em { display: block; font-style: normal; font-size: 11.5px; color: var(--app-muted); margin-top: 1px; white-space: nowrap; }
.w-plus { margin-left: auto; width: 20px; height: 20px; border-radius: 50%; display: inline-grid; place-items: center; font-style: normal; font-size: 15px; font-weight: 700; line-height: 1; color: #fff; background: var(--accent); }
.w-plus.done { background: var(--app-ok); font-size: 12px; }
.w-tile span { display: flex; align-items: center; gap: 4px; }
.home-stats em.dn { color: var(--app-ok); }
.home-stats em.upw { color: var(--app-bad); }
.all-link { display: flex; align-items: center; justify-content: center; gap: 4px; width: calc(100% - 32px); margin: 12px 16px 4px; padding: 13px; border: 0; border-radius: var(--r-md); font: inherit; font-size: 15.5px; font-weight: 600; color: var(--accent); background: var(--app-card); }
.plan { text-align: left; border: 0; color: var(--ion-text-color); border-radius: var(--r-lg); padding: 14px; display: flex; flex-direction: column;
  gap: 2px; font: inherit; min-height: 128px; background: var(--app-card); box-shadow: var(--app-shadow); }
.plan.next { box-shadow: inset 0 0 0 2px var(--c), var(--app-shadow); }
.plan-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: auto; padding-bottom: 12px; }
.plan .plan-ico { --s: 42px; }
.plan-l { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.plan-body { height: 78px; margin: -4px -4px 0 0; pointer-events: none; }
.plan b { font-size: 17px; font-weight: 600; letter-spacing: -.2px; line-height: 1.2; }
.meta { font-size: 13px; color: var(--app-muted); }
.next-pill { background: var(--c); color: #fff; font-size: 11px; font-weight: 600; border-radius: 999px; padding: 3px 8px; }

.foot { margin-top: 16px; }
</style>
