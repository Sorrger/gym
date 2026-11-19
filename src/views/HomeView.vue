<template>
  <ion-page>
    <ion-content :scroll-y="false">
      <div class="home">
        <header class="page-head">
          <p class="eyebrow">{{ todayText }}</p>
          <h1>{{ greeting }}</h1>
        </header>

        <!-- this week -->
        <div class="card week">
          <div class="week-head">
            <span>Ten tydzień</span>
            <b class="num">{{ weekCount }} <small>{{ weekCount === 1 ? 'trening' : weekCount >= 2 && weekCount <= 4 ? 'treningi' : 'treningów' }}</small></b>
          </div>
          <div class="days">
            <div v-for="d in week" :key="d.date" class="day" :class="{ today: d.today, future: d.future }">
              <span class="wd">{{ d.wd }}</span>
              <span class="dot num" :class="{ has: d.s }" :style="d.s ? { '--c': COLORS[PLAN[d.s.day].key] } : null">
                {{ d.s ? PLAN[d.s.day].abbr : d.n }}
              </span>
            </div>
          </div>
        </div>

        <!-- workout in progress -->
        <div v-if="active" class="card active press" :style="{ '--c': COLORS[PLAN[active.day].key] }" @click="open(active.id)">
          <div class="plan-ico">{{ PLAN[active.day].abbr }}</div>
          <div class="active-mid">
            <span class="live"><i></i> W toku · {{ activeCounts.n }}/{{ activeCounts.t }} serii</span>
            <b>{{ PLAN[active.day].name }}</b>
            <div class="bar"><div :style="{ width: (activeCounts.t ? activeCounts.n / activeCounts.t * 100 : 0) + '%' }"></div></div>
          </div>
          <button class="go" aria-label="Kontynuuj"><ion-icon :icon="play" /></button>
        </div>

        <h3 class="section-title">{{ active ? 'Albo zacznij inny' : 'Wybierz trening' }}</h3>
        <div class="plans">
          <button v-for="(d, i) in PLAN" :key="d.key" class="plan press" :class="{ next: i === next && !active }"
            :style="{ '--c': COLORS[d.key] }" @click="start(i)">
            <div class="plan-top">
              <span class="plan-ico">{{ d.abbr }}</span>
              <span v-if="i === next && !active" class="pill">Następny</span>
            </div>
            <b>{{ d.name }}</b>
            <span class="meta">{{ d.ex.length }} ćwiczeń</span>
            <span class="meta last">{{ lastText(i) }}</span>
          </button>
        </div>

        <div class="stat-grid foot">
          <div class="stat"><span>Ten miesiąc</span><b>{{ monthCount }}</b></div>
          <div class="stat"><span>Łącznie</span><b>{{ done.length }}</b></div>
          <div class="stat"><span>Serie</span><b>{{ totalSets }}</b></div>
        </div>
      </div>

      <ion-toast :is-open="!!state.flash" :message="state.flash" :duration="2500" position="top" @didDismiss="state.flash = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, useIonRouter, alertController } from '@ionic/vue'
import { play } from 'ionicons/icons'
import { PLAN, COLORS } from '../plan'
import { state, activeSession, startSession, finishSession, lastDoneOf, suggestedDay, doneSessions, counts, ago, iso } from '../store'

const router = useIonRouter()
const active = computed(() => { void state.sessions; return activeSession() })
const activeCounts = computed(() => (active.value ? counts(active.value) : { n: 0, t: 0 }))
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

function lastText(i) { void state.sessions; const l = lastDoneOf(i); return l ? 'Ostatnio ' + ago(l.date) : 'Jeszcze nie robiony' }

function open(id) { router.push('/workout/' + id) }

async function start(day) {
  const a = active.value
  if (a && a.day === day) { open(a.id); return } // same plan: just continue it
  if (a) {
    const c = counts(a)
    const al = await alertController.create({
      header: `Trwa trening ${PLAN[a.day].name}`,
      message: c.n
        ? `Masz odhaczone ${c.n}/${c.t} serii. Na pewno zakończyć go (zostanie zapisany) i zacząć ${PLAN[day].name}?`
        : `Nic jeszcze nie odhaczyłeś. Na pewno porzucić go i zacząć ${PLAN[day].name}?`,
      buttons: [
        { text: 'Wróć do ' + PLAN[a.day].name, role: 'continue' },
        { text: c.n ? 'Zakończ i zacznij nowy' : 'Porzuć i zacznij nowy', role: 'confirm' },
        { text: 'Anuluj', role: 'cancel' }
      ]
    })
    await al.present()
    const { role } = await al.onDidDismiss()
    if (role === 'continue') { open(a.id); return }
    if (role !== 'confirm') return
    finishSession(a.id)
  }
  const s = startSession(day)
  open(s.id)
}
</script>

<style scoped>
.home { height: 100%; display: flex; flex-direction: column; padding: calc(env(safe-area-inset-top, 0px) + 14px) 0 12px; }
.eyebrow { margin: 0 0 2px; color: var(--app-muted); font-size: 15px; font-weight: 500; }

.week { padding: 12px 12px 14px; }
.week-head { display: flex; justify-content: space-between; align-items: baseline; padding: 0 4px 10px; }
.week-head span { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; color: var(--app-muted); }
.week-head b { font-size: 17px; font-weight: 800; }
.week-head small { font-size: 13px; color: var(--app-muted); font-weight: 600; }
.days { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; }
.day { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.wd { font-size: 11px; font-weight: 600; color: var(--app-muted); }
.day.today .wd { color: var(--ion-color-primary); }
.dot { width: 38px; height: 38px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 600;
  background: var(--app-field); color: var(--ion-text-color); }
.day.future .dot { background: none; color: var(--app-muted); box-shadow: inset 0 0 0 1px var(--app-line); }
.day.today .dot { box-shadow: inset 0 0 0 2px var(--ion-color-primary); }
.dot.has { background: linear-gradient(140deg, color-mix(in srgb, var(--c) 70%, #fff), var(--c) 75%); color: #fff; font-weight: 800; font-size: 12px; box-shadow: none; }
.day.today .dot.has { box-shadow: 0 0 0 2px var(--app-card), 0 0 0 4px var(--c); }

.active { display: flex; align-items: center; gap: 12px; box-shadow: 0 0 0 2px var(--c); cursor: pointer; }
.active .plan-ico { --s: 46px; }
.active-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.active-mid b { font-size: 19px; font-weight: 800; }
.live { color: var(--c); font-size: 13px; font-weight: 700; display: flex; align-items: center; gap: 6px; }
.live i { width: 7px; height: 7px; border-radius: 50%; background: var(--c); animation: pulse 1.6s infinite; }
@keyframes pulse { 50% { opacity: .3; } }
@media (prefers-reduced-motion: reduce) { .live i { animation: none; } }
.bar { height: 5px; border-radius: 3px; background: var(--app-field); overflow: hidden; margin-top: 4px; }
.bar div { height: 100%; background: var(--c); border-radius: 3px; transition: width .3s; }
.go { width: 46px; height: 46px; border: 0; border-radius: 50%; background: var(--c); color: #fff; font-size: 20px; display: grid; place-items: center; flex: none; }

.section-title { margin-top: 10px; }
.plans { display: grid; grid-template-columns: 1fr 1fr; grid-auto-rows: 1fr; gap: 12px; margin: 0 16px; flex: 1; max-height: 420px; min-height: 0; }
.plan { text-align: left; border: 0; color: var(--ion-text-color); border-radius: 20px; padding: 14px; display: flex; flex-direction: column;
  gap: 1px; font: inherit; min-height: 0;
  background: linear-gradient(160deg, color-mix(in srgb, var(--c) 9%, var(--app-card)), var(--app-card) 70%); }
.plan.next { box-shadow: 0 0 0 2px var(--c); }
.plan-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: auto; padding-bottom: 10px; }
.plan .plan-ico { --s: 46px; }
.plan b { font-size: 20px; font-weight: 800; line-height: 1.15; }
.meta { font-size: 13px; color: var(--app-muted); }
.meta.last { padding-top: 2px; }
.pill { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; background: var(--c); color: #fff; border-radius: 999px; padding: 3px 8px; }

.foot { margin-top: auto; padding-top: 12px; margin-bottom: 0; }
</style>
