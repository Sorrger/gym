<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>Edytuj plan</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Trening</button>
        <h1 class="t-large">Edytuj plan</h1>
        <p class="sub">{{ isCustom ? 'Twój własny plan' : 'Plan podstawowy z apki' }}</p>
      </header>
      <div class="page">
        <p class="info">Dotknij trening, żeby zmienić jego nazwę, ćwiczenia, serie, zamienniki i dni – albo dodaj nowy. Zmiany są tylko na tym telefonie (i w Twojej kopii) – zrobione treningi zostają w historii.</p>

        <div class="ios-group">
          <button v-for="p in plans" :key="p.key" class="row press" @click="router.push('/plan/' + p.i + '/edit?from=plans')">
            <span class="plan-ico" :style="{ '--c': COLORS[p.key] }">{{ p.abbr }}</span>
            <div class="grow">
              <b>{{ p.name }}</b>
              <span>{{ p.ex.length }} {{ word(p.ex.length) }}{{ p.days ? ' · ' + p.days : '' }}</span>
            </div>
            <ion-icon :icon="createOutline" class="ed" />
          </button>
        </div>

        <button class="add press" @click="router.push('/plan/new/edit')"><ion-icon :icon="add" /> Dodaj trening</button>
        <p class="hint">Np. 2 treningi (A/B), 3 (FBW) albo 5–6 – tyle, ile chcesz. Gdy nie ustawisz dni tygodnia, apka podpowiada treningi po kolei.</p>

        <button v-if="isCustom" class="reset press" @click="reset">Przywróć plan podstawowy</button>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { add, createOutline, refreshOutline, chevronBack } from 'ionicons/icons'
import { PLAN, COLORS, WEEKDAY_TO_DAY, DEFAULT_PLAN } from '../plan'
import { custom, savePlan } from '../customPlan'
import { ask } from '../dialog'
import { useScrolled } from '../useScrolled'
const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/tabs/train', 'back', 'replace'))
const NAMES = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
const word = n => (n === 1 ? 'ćwiczenie' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'ćwiczenia' : 'ćwiczeń')
const plans = computed(() => PLAN.map((p, i) => ({ ...p, i, days: [1, 2, 3, 4, 5, 6, 0].filter(js => WEEKDAY_TO_DAY[js] === i).map(js => NAMES[js]).join(', ') })).filter(p => !p.hidden))
const isCustom = computed(() => !!custom.data)
async function reset() {
  const { role } = await ask({ icon: refreshOutline, title: 'Przywrócić plan podstawowy?', message: 'Wrócą treningi, ćwiczenia, zamienniki i dni z apki. Twoje dodatkowe treningi znikną z planu, ale zrobione treningi zostają w historii.',
    buttons: [{ text: 'Przywróć', role: 'ok', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role !== 'ok') return
  // extra trainings stay as hidden (old workouts point at them)
  const days = PLAN.map((p, i) => (i < DEFAULT_PLAN.length ? null : { ...(custom.data?.days?.[i] || { name: p.name, note: p.note, ex: p.ex }), hidden: true }))
  await savePlan(days.some(Boolean) ? { days, muscles: custom.data?.muscles || {} } : null, '#/plans')
}
</script>

<style scoped>
.info { margin: 0 20px 14px; font-size: 14px; color: var(--app-muted); line-height: 1.35; }
.row .grow b { display: block; font-size: 16px; font-weight: 600; }
.row .grow span { display: block; font-size: 13px; color: var(--app-muted); }
.ed { font-size: 20px; color: var(--app-muted); }
.add { display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% - 32px); margin: 14px 16px 6px; padding: 13px; border: 0; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 600; color: var(--accent); background: color-mix(in srgb, var(--accent) 13%, var(--app-card)); }
.hint { margin: 4px 20px 18px; font-size: 13px; color: var(--app-muted); line-height: 1.35; }
.reset { display: block; width: calc(100% - 32px); margin: 0 16px; padding: 12px; border: 0; background: none; font: inherit; font-size: 15px; font-weight: 600; color: var(--app-bad); }
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; }
.mini-bar.on .mb-back { pointer-events: auto; }
</style>
