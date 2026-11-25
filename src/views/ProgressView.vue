<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }" aria-hidden="true"><span>Postępy</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head">
        <h1 class="t-large">Postępy</h1>
        <p class="sub">{{ periodLabel }}</p>
      </header>
      <div class="page">
        <nav class="ptabs" role="tablist">
          <button v-for="t in TABS" :key="t.v" role="tab" class="press" :class="{ on: tab === t.v }" @click="ui.ptab = t.v">{{ t.t }}</button>
        </nav>
        <ion-segment v-if="tab !== 'plans'" class="period" :value="String(ui.period ?? 'all')" @ionChange="e => (ui.period = e.detail.value === 'all' ? null : +e.detail.value)">
          <ion-segment-button value="28"><ion-label>4 tygodnie</ion-label></ion-segment-button>
          <ion-segment-button value="91"><ion-label>3 miesiące</ion-label></ion-segment-button>
          <ion-segment-button value="all"><ion-label>Całość</ion-label></ion-segment-button>
        </ion-segment>

        <OverviewTab v-if="tab === 'all'" :period="ui.period" />
        <PlansTab v-else-if="tab === 'plans'" />
        <BodyTab v-else :period="ui.period" />
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
// Postępy: three tabs (Przegląd / Treningi / Ciało) and the period switch; each tab is a component in ./progress
import { computed } from 'vue'
import { IonPage, IonContent, IonSegment, IonSegmentButton, IonLabel } from '@ionic/vue'
import { useScrolled } from '../useScrolled'
import { ui } from '../store'
import OverviewTab from './progress/OverviewTab.vue'
import PlansTab from './progress/PlansTab.vue'
import BodyTab from './progress/BodyTab.vue'

const TABS = [{ v: 'all', t: 'Przegląd' }, { v: 'plans', t: 'Treningi' }, { v: 'body', t: 'Ciało' }]
const tab = computed(() => ui.ptab || 'all')
const { scrolled, onScroll } = useScrolled()
const periodLabel = computed(() => (ui.period === 28 ? 'Ostatnie 4 tygodnie' : ui.period === 91 ? 'Ostatnie 3 miesiące' : 'Od początku'))
</script>

<style scoped>
.ptabs { display: flex; gap: 2px; margin: 2px 16px 10px; padding: 2px; border-radius: 9px; background: var(--app-field); }
.ptabs button { flex: 1; border: 0; padding: 7px 4px; border-radius: 7px; font: inherit; font-size: 14px; font-weight: 600; color: var(--ion-text-color); background: transparent; transition: background .2s; }
:global(.ion-palette-dark) .ptabs button.on { background: #636366; }
.ptabs button.on { background: var(--app-card); box-shadow: 0 2px 6px rgba(0,0,0,.12), 0 0 0 0.5px rgba(0,0,0,.04); }
.period { margin: 4px 16px 14px; width: auto; --background: var(--app-field); }
.period ion-segment-button { --indicator-color: var(--seg-on, var(--app-card)); --color: var(--ion-text-color); --color-checked: var(--ion-text-color); font-size: 13px; font-weight: 600; min-height: 32px; }
:global(.ion-palette-dark) .period { --seg-on: #636366; }
</style>
