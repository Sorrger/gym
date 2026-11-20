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
        <div v-else-if="backupWarn" class="card warn" @click="router.push('/tabs/settings')">
          <ion-icon :icon="cloudOfflineOutline" />
          <div><b>Kopia na GitHub nie działa</b><span>{{ cloud.error || 'Nie wysłano od kilku dni' }}</span></div>
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
            <div v-for="d in week" :key="d.date" class="day" :class="{ today: d.today, future: d.future }">
              <span class="wd">{{ d.wd }}</span>
              <span class="dot num" :class="{ has: d.s }" :style="d.s ? { '--c': COLORS[PLAN[d.s.day].key] } : null">
                <ion-icon v-if="d.s" :icon="checkmark" /><template v-else>{{ d.n }}</template>
              </span>
            </div>
          </div>
        </div>

        <h3 class="section-title">{{ active ? 'Albo zacznij inny' : 'Zacznij trening' }}</h3>
        <div class="plans">
          <button v-for="(d, i) in PLAN" :key="d.key" class="plan press" :class="{ next: i === next && !active }"
            :style="{ '--c': COLORS[d.key] }" @click="start(i)">
            <div class="plan-top">
              <div class="plan-l">
                <span class="plan-ico">{{ d.abbr }}</span>
                <span v-if="i === next && !active" class="next-pill">{{ isToday(i) ? 'Dziś' : 'Następny' }}</span>
              </div>
              <div class="plan-body"><BodyMap v-bind="dayMuscles(i)" /></div>
            </div>
            <b>{{ d.name }}</b>
            <span class="meta">{{ d.ex.length }} ćwiczeń · {{ lastText(i) }}</span>
          </button>
        </div>

        <div class="stats foot">
          <div><span>Ten miesiąc</span><b>{{ monthCount }}</b></div>
          <div><span>Łącznie</span><b>{{ done.length }}</b></div>
          <div><span>Serie</span><b>{{ totalSets }}</b></div>
        </div>
      </div>

      <ion-toast :is-open="!!state.flash" :message="state.flash" :duration="2500" position="top" @didDismiss="state.flash = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ask } from '../dialog'
import { barbell } from 'ionicons/icons'
import BodyMap from './BodyMap.vue'
import { dayMuscles } from '../muscles'
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, useIonRouter  } from '@ionic/vue'
import { chevronForward, checkmark, alertCircle, cloudOfflineOutline } from 'ionicons/icons'
import { PLAN, COLORS, WEEKDAY_TO_DAY } from '../plan'
import { cloud } from '../cloud'
import { state, activeSession, startSession, finishSession, lastDoneOf, suggestedDay, doneSessions, counts, ago, iso } from '../store'

const router = useIonRouter()
const active = computed(() => { void state.sessions; return activeSession() })
const activeCounts = computed(() => (active.value ? counts(active.value) : { n: 0, t: 0 }))
const activePct = computed(() => (activeCounts.value.t ? activeCounts.value.n / activeCounts.value.t : 0))
const nowTick = ref(Date.now()); let tk
onMounted(() => { tk = setInterval(() => (nowTick.value = Date.now()), 30000) })
onUnmounted(() => clearInterval(tk))
const activeMinutes = computed(() => {
  if (!active.value) return ''
  const m = Math.max(0, Math.round((nowTick.value - active.value.started) / 60000))
  return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'
})
const next = computed(() => { void state.sessions; return suggestedDay() })
const done = computed(() => { void state.sessions; return doneSessions() })
const totalSets = computed(() => done.value.reduce((a, s) => a + counts(s).n, 0))

const todayText = computed(() => {
  const s = new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })
  return s.charAt(0).toUpperCase() + s.slice(1)
})
const greeting = computed(() => {
  const h = new Date().getHours()
  return h < 5 ? 'Dobranoc' : h < 12 ? 'Dzień dobry' : h < 18 ? 'Cześć' : 'Dobry wieczór'
})

const week = computed(() => {
  const now = new Date(), today = iso(now)
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7))
  return ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'].map((wd, k) => {
    const d = new Date(mon); d.setDate(mon.getDate() + k)
    const date = iso(d)
    return { wd, date, n: d.getDate(), today: date === today, future: date > today, s: done.value.find(s => s.date === date) }
  })
})
const weekCount = computed(() => { const from = week.value[0].date; return done.value.filter(s => s.date >= from).length })
const monthCount = computed(() => { const p = iso(new Date()).slice(0, 7); return done.value.filter(s => s.date.startsWith(p)).length })

function lastText(i) { void state.sessions; const l = lastDoneOf(i); return l ? ago(l.date) : 'jeszcze nie robiony' }

// warn only when the backup has been failing for a while, not after one missed upload at the gym
const backupWarn = computed(() => cloud.token && cloud.dirty && cloud.error && cloud.error !== 'Brak połączenia' ||
  (cloud.token && cloud.dirty && cloud.lastSync && Date.now() - cloud.lastSync > 3 * 864e5))
const reload = () => location.reload()
const isToday = i => WEEKDAY_TO_DAY[new Date().getDay()] === i

function open(id) { router.push('/workout/' + id) }

async function start(day) {
  const a = active.value
  if (a && a.day === day) { open(a.id); return } // same plan: just continue it
  if (a) {
    const c = counts(a)
    const { role } = await ask({ icon: barbell, color: COLORS[PLAN[a.day].key],
      title: `Trwa trening ${PLAN[a.day].name}`,
      message: c.n
        ? `Masz odhaczone ${c.n}/${c.t} serii. Na pewno zakończyć go (zostanie zapisany) i zacząć ${PLAN[day].name}?`
        : `Nic jeszcze nie odhaczyłeś. Na pewno porzucić go i zacząć ${PLAN[day].name}?`,
      buttons: [
        { text: 'Wróć do ' + PLAN[a.day].name, role: 'continue', kind: 'primary' },
        { text: c.n ? 'Zakończ i zacznij ' + PLAN[day].name : 'Porzuć i zacznij ' + PLAN[day].name, role: 'confirm', kind: 'soft' },
        { text: 'Anuluj', role: 'cancel' }
      ] })
    if (role === 'continue') { open(a.id); return }
    if (role !== 'confirm') return
    finishSession(a.id)
  }
  const s = startSession(day)
  open(s.id)
}
</script>

<style scoped>
.eyebrow { margin: 0 0 2px; color: var(--app-muted); font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }

.warn { display: flex; gap: 12px; align-items: center; color: var(--app-bad); }
.warn ion-icon { font-size: 26px; flex: none; }
.warn b { display: block; font-size: 15px; font-weight: 600; }
.warn span { display: block; font-size: 13px; color: var(--app-muted); }

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
