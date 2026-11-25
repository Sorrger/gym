<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }" aria-hidden="true"><span>Trening</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head">
        <h1 class="t-large">Trening</h1>
        <p class="sub">{{ active ? 'Masz otwarty trening ' + PLAN[active.day].name : 'Wybierz, co dziś robisz' }}</p>
      </header>
      <div class="page">
        <button v-if="active" class="cont press" :style="{ '--c': COLORS[PLAN[active.day].key] }" @click="router.push('/workout/' + active.id)">
          <span class="plan-ico">{{ PLAN[active.day].abbr }}</span><div class="grow"><b>Kontynuuj {{ PLAN[active.day].name }}</b><span>trening w toku</span></div><ion-icon :icon="chevronForward" />
        </button>

        <div class="plans">
          <template v-for="(d, i) in PLAN" :key="d.key">
          <div v-if="!d.hidden" class="plan press" :class="{ next: i === next && !active }" :style="{ '--c': COLORS[d.key] }" role="button" @click="router.push('/plan/' + i)">
            <div class="plan-top">
              <div class="plan-l">
                <span class="plan-ico">{{ d.abbr }}</span>
                <span v-if="i === next && !active" class="next-pill">{{ { today: 'Dziś', missed: 'Zaległy', next: 'Następny' }[sug.kind] }}</span>
              </div>
              <div class="plan-body"><BodyMap v-bind="dayMuscles(i)" /></div>
            </div>
            <b>{{ d.name }}</b>
            <span class="meta">{{ d.ex.length }} ćw.{{ days(i) ? ' · ' + days(i) : '' }}</span>
          </div>
          </template>
        </div>

        <div class="ios-group edit-g">
          <button class="row press" @click="router.push('/plans')"><ion-icon :icon="createOutline" class="ri" /><div class="grow"><b>Edytuj plan</b><span>zmień treningi i ćwiczenia albo dodaj nowe</span></div><ion-icon :icon="chevronForward" class="chev" /></button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { add, createOutline, refreshOutline, chevronForward } from 'ionicons/icons'
import { PLAN, COLORS, WEEKDAY_TO_DAY, DEFAULT_PLAN } from '../plan'
import { dayMuscles } from '../muscles'
import { state, activeSession, suggestion } from '../store'
import { custom, savePlan } from '../customPlan'
import { ask } from '../dialog'
import { useScrolled } from '../useScrolled'
import BodyMap from './BodyMap.vue'
const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
const days = i => [1, 2, 3, 4, 5, 6, 0].filter(js => WEEKDAY_TO_DAY[js] === i).map(js => NAMES[js]).join(', ')
const active = computed(() => { void state.sessions; return activeSession() })
const sug = computed(() => { void state.sessions; return suggestion() })
const next = computed(() => sug.value.day)
const isCustom = computed(() => !!custom.data)
async function reset() {
  const { role } = await ask({ icon: refreshOutline, title: 'Przywrócić plan podstawowy?', message: 'Wrócą treningi, ćwiczenia, zamienniki i dni z apki. Twoje dodatkowe treningi znikną z planu, ale zrobione treningi zostają w historii.',
    buttons: [{ text: 'Przywróć', role: 'ok', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role !== 'ok') return
  // extra trainings stay as hidden (old workouts point at them)
  const daysArr = PLAN.map((p, i) => (i < DEFAULT_PLAN.length ? null : { ...(custom.data?.days?.[i] || { name: p.name, note: p.note, ex: p.ex }), hidden: true }))
  await savePlan(daysArr.some(Boolean) ? { days: daysArr, muscles: custom.data?.muscles || {} } : null, '#/tabs/train')
}
</script>

<style scoped>
.cont { display: flex; align-items: center; gap: 12px; width: calc(100% - 32px); margin: 0 16px 14px; padding: 12px 14px; border: 0; border-radius: var(--r-lg); text-align: left; font: inherit; color: var(--ion-text-color); background: color-mix(in srgb, var(--c) 14%, var(--app-card)); }
.cont b { display: block; font-size: 16px; }
.cont span { font-size: 13px; color: var(--app-muted); }
.cont ion-icon { color: var(--c); font-size: 20px; }
.plans { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 16px; }
.plan { position: relative; text-align: left; color: var(--ion-text-color); border-radius: var(--r-lg); padding: 14px; display: flex; flex-direction: column; min-height: 168px; background: var(--app-card); box-shadow: var(--app-shadow); }
.plan.next { box-shadow: inset 0 0 0 1.5px color-mix(in srgb, var(--c) 55%, transparent); }
.plan-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: auto; padding-bottom: 12px; }
.plan .plan-ico { --s: 42px; }
.plan-l { display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
.plan-body { height: 78px; margin: -4px -4px 0 0; pointer-events: none; }
.plan b { font-size: 17px; font-weight: 600; letter-spacing: -.2px; line-height: 1.2; padding-right: 30px; }
.meta { font-size: 13px; color: var(--app-muted); padding-right: 30px; }
.next-pill { background: color-mix(in srgb, var(--c) 15%, transparent); color: var(--c); font-size: 12px; font-weight: 700; border-radius: 999px; padding: 3px 8px; }
.edit { position: absolute; right: 8px; bottom: 8px; width: 34px; height: 34px; border: 0; border-radius: 50%; display: grid; place-items: center; padding: 0; font-size: 17px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); }
.ri { font-size: 22px; color: var(--accent); flex: none; }
.ri.bad, b.bad { color: var(--app-bad); }
.row .grow b { display: block; font-size: 16px; font-weight: 600; }
.row .grow span { display: block; font-size: 13px; color: var(--app-muted); }
.edit-g { margin-top: 16px; }
.chev { color: var(--app-faint); font-size: 18px; }
.hint { margin: 8px 20px 24px; font-size: 13px; color: var(--app-muted); line-height: 1.35; }
</style>
