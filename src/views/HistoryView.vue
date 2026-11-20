<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade"><ion-toolbar><ion-title>Historia</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar><ion-title size="large">Historia</ion-title></ion-toolbar>
        <p class="sub">Dni, w których byłeś na siłowni</p>
      </ion-header>
      <div class="page">

        <div class="card cal">
          <div class="cal-head">
            <button class="nav press" @click="shift(-1)" aria-label="Poprzedni miesiąc"><ion-icon :icon="chevronBack" /></button>
            <b>{{ monthLabel }}</b>
            <button class="nav press" @click="shift(1)" :disabled="isCurrentMonth" aria-label="Następny miesiąc"><ion-icon :icon="chevronForward" /></button>
          </div>
          <div class="grid wd"><span v-for="d in ['Pn','Wt','Śr','Cz','Pt','Sb','Nd']" :key="d">{{ d }}</span></div>
          <div class="grid">
            <span v-for="n in lead" :key="'l' + n"></span>
            <button v-for="c in cells" :key="c.date" class="day num" :class="{ today: c.date === today, has: c.items.length, sel: c.date === selected, future: c.date > today }"
              :style="c.items.length ? { '--c': COLORS[PLAN[c.items[0].day].key] } : null" @click="pick(c)">
              {{ c.n }}
              <span class="marks" v-if="c.items.length > 1"><i v-for="s in c.items" :key="s.id" :style="{ background: COLORS[PLAN[s.day].key] }"></i></span>
            </button>
          </div>
          <div class="legend">
            <span v-for="d in PLAN" :key="d.key"><i :style="{ background: COLORS[d.key] }"></i>{{ d.name }}</span>
          </div>
        </div>

        <div class="stats">
          <div><span>Treningi</span><b>{{ monthList.length }}</b></div>
          <div><span>Serie</span><b>{{ monthSets }}</b></div>
          <div><span>Tyg. z rzędu</span><b>{{ streak }}<small v-if="streak"> 🔥</small></b></div>
        </div>

        <div class="list-head">
          <h3 class="section-title">{{ selected ? fmtDate(selected) : monthLabel }}</h3>
          <button v-if="selected" class="clear" @click="selected = null">Cały miesiąc</button>
        </div>
        <ion-list :inset="true" v-if="shown.length" class="hist-list">
          <ion-item-sliding v-for="s in shown" :key="s.id">
            <ion-item button :detail="false" @click="open(s)">
              <span class="plan-ico" slot="start" :style="{ '--c': COLORS[PLAN[s.day].key] }">{{ PLAN[s.day].abbr }}</span>
              <ion-label>
                <h2>{{ PLAN[s.day].name }}</h2>
                <p class="num">{{ dayName(s.date) }}, {{ fmtDate(s.date) }}<span v-if="!s.finished"> · w toku</span></p>
                <p v-if="stravaFor(s.id)" class="sv num"><ion-icon :icon="heart" /> {{ svText(stravaFor(s.id)) }}</p>
              </ion-label>
              <ion-note slot="end" class="num">{{ counts(s).n }}/{{ counts(s).t }}</ion-note>
            </ion-item>
            <ion-item-options side="end">
              <ion-item-option color="danger" @click="ask(s)">Usuń</ion-item-option>
            </ion-item-options>
          </ion-item-sliding>
        </ion-list>
        <div v-else class="card empty">
          {{ selected ? 'Tego dnia nie było treningu.' : 'W tym miesiącu nie ma jeszcze treningów.' }}
        </div>
        <p class="hint" v-if="shown.length">Stuknij trening: szczegóły, tętno, edycja. Przesuń w lewo, żeby usunąć.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ask as askDialog } from '../dialog'
import { computed, ref } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonItemSliding,
  IonItemOptions, IonItemOption, IonLabel, IonNote, IonIcon, useIonRouter  } from '@ionic/vue'
import { chevronBack, chevronForward, trashOutline, heart } from 'ionicons/icons'
import { stravaFor, svText } from '../strava'
import { PLAN, COLORS } from '../plan'
import { state, doneSessions, counts, fmtDate, remove, iso } from '../store'

const router = useIonRouter()
const today = iso(new Date())
const view = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1))
const selected = ref(null)

const all = computed(() => { void state.sessions; return doneSessions() })
const prefix = computed(() => iso(view.value).slice(0, 7))
const isCurrentMonth = computed(() => prefix.value === today.slice(0, 7))
const monthLabel = computed(() => { const s = view.value.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }); return s.charAt(0).toUpperCase() + s.slice(1) })
const lead = computed(() => (view.value.getDay() + 6) % 7)
const cells = computed(() => {
  const y = view.value.getFullYear(), m = view.value.getMonth(), days = new Date(y, m + 1, 0).getDate()
  return Array.from({ length: days }, (_, i) => {
    const date = iso(new Date(y, m, i + 1))
    return { n: i + 1, date, items: all.value.filter(s => s.date === date) }
  })
})
const monthList = computed(() => all.value.filter(s => s.date.startsWith(prefix.value)))
const monthSets = computed(() => monthList.value.reduce((a, s) => a + counts(s).n, 0))
const shown = computed(() => (selected.value ? monthList.value.filter(s => s.date === selected.value) : monthList.value))

// consecutive weeks (Mon–Sun) with at least one workout, counting back from this week (or last week if none yet this week)
const streak = computed(() => {
  const weeks = new Set(all.value.map(s => { const d = new Date(s.date + 'T12:00:00'); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return iso(d) }))
  const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  if (!weeks.has(iso(d))) d.setDate(d.getDate() - 7)
  let n = 0
  while (weeks.has(iso(d))) { n++; d.setDate(d.getDate() - 7) }
  return n
})

function shift(k) { selected.value = null; view.value = new Date(view.value.getFullYear(), view.value.getMonth() + k, 1) }
function pick(c) {
  if (c.items.length === 1 && selected.value === c.date) { open(c.items[0]); return }
  selected.value = selected.value === c.date ? null : c.date
}
const dayName = d => { const s = new Date(d + 'T12:00:00').toLocaleDateString('pl-PL', { weekday: 'short' }); return s.charAt(0).toUpperCase() + s.slice(1) }

function open(s) { router.push((s.finished ? '/session/' : '/workout/') + s.id) }
async function ask(s) {
  const { role } = await askDialog({ icon: trashOutline, title: 'Usunąć trening?',
    message: `${PLAN[s.day].name}, ${fmtDate(s.date)}. Tego nie da się cofnąć.`,
    buttons: [{ text: 'Usuń trening', role: 'destructive', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role === 'destructive') remove(s.id)
}
</script>

<style scoped>
.sv { color: #fc4c02 !important; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.sv ion-icon { font-size: 12px; }
.cal { padding: 14px 10px 12px; }
.cal-head { display: flex; justify-content: space-between; align-items: center; margin: 0 6px 12px; }
.cal-head b { font-size: 17px; font-weight: 600; letter-spacing: -.2px; }
.nav { width: 32px; height: 32px; border: 0; border-radius: 50%; background: none; color: var(--accent);
  display: grid; place-items: center; font-size: 20px; }
.nav:active { background: var(--app-field); }
.nav:disabled { opacity: .3; }
.grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px 0; justify-items: center; }
.wd span { font-size: 12px; color: var(--app-muted); font-weight: 600; padding-bottom: 4px; text-transform: uppercase; }
.day { position: relative; width: 40px; height: 40px; border: 0; border-radius: 50%; background: none; color: var(--ion-text-color);
  font-size: 17px; font-weight: 400; display: grid; place-items: center; transition: transform .1s; }
.day:active { transform: scale(.9); }
.day.future { color: var(--app-faint); }
.day.today { color: var(--accent); font-weight: 700; }
.day.has { background: var(--c); color: #fff; font-weight: 600; }
.day.sel { box-shadow: 0 0 0 2px var(--app-card), 0 0 0 4px var(--c, var(--accent)); }
.marks { position: absolute; bottom: 3px; display: flex; gap: 2px; }
.marks i { width: 5px; height: 5px; border-radius: 50%; box-shadow: 0 0 0 1px #fff; }
.legend { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px 14px; margin-top: 12px; padding-top: 12px;
  border-top: 0.5px solid var(--app-line); font-size: 12px; color: var(--app-muted); }
.legend span { display: flex; align-items: center; gap: 5px; }
.legend i { width: 8px; height: 8px; border-radius: 50%; }

.list-head { display: flex; justify-content: space-between; align-items: baseline; padding-right: 20px; }
.clear { border: 0; background: none; color: var(--accent); font-size: 15px; }
.hist-list { margin: 0 16px; border-radius: var(--r-lg); box-shadow: var(--app-shadow); }
.hist-list ion-item { --padding-start: 14px; --inner-padding-end: 12px; --min-height: 62px; }
.hist-list .plan-ico { --s: 36px; margin-right: 12px; }
.hist-list h2 { font-weight: 600; font-size: 17px; letter-spacing: -.2px; }
.hist-list p { font-size: 13px !important; }
.hist-list ion-note { font-size: 15px; color: var(--app-muted); }
.trash { width: 32px; height: 32px; margin-left: 8px; border: 0; border-radius: 50%; background: none; color: var(--app-faint);
  display: grid; place-items: center; font-size: 18px; flex: none; }
.trash:active { background: color-mix(in srgb, var(--app-bad) 14%, transparent); color: var(--app-bad); }
.empty { color: var(--app-muted); text-align: center; padding: 24px; }
.hint { text-align: center; color: var(--app-muted); font-size: 13px; margin: 8px 0 0; }
</style>
