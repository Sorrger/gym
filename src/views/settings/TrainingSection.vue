<!-- Trening: pick a ready set (Podstawowy / Zaawansowany) or set everything yourself (Własny → details page) -->
<template>
  <div>
    <div class="card look">
      <span class="lbl">Jak ma działać trening</span>
      <div class="seg3 modes">
        <button v-for="m in MODES" :key="m.v" class="press" :class="{ on: mode === m.v }" @click="pick(m.v)">{{ m.t }}</button>
      </div>
      <p class="hint">{{ MODES.find(m => m.v === mode).d }}</p>
    </div>
    <div class="ios-group feats">
      <div v-for="f in FEATURES" :key="f.k" class="row feat">
        <div class="grow"><b>{{ f.t }}</b></div>
        <span class="fs" :class="{ on: isOn(f) }">{{ isOn(f) ? 'Włączone' : 'Wyłączone' }}</span>
      </div>
    </div>
    <div class="ios-group">
      <button class="row press detail-row" @click="router.push('/settings/details')">
        <div class="grow"><b>Ustaw wszystko szczegółowo</b><span>Każdy przełącznik, przerwa, lżejszy tydzień i zasady progresji</span></div>
        <ion-icon :icon="chevronForward" class="chev" />
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { prefs } from '../../prefs'
import { ask } from '../../dialog'
import { PRESETS, FEATURES, modeOf, applyPreset } from './rules'

const router = useIonRouter()
const MODES = [...PRESETS, { v: 'custom', t: 'Własny', d: 'Twoje ustawienia – zmieniasz każdą rzecz osobno w „Ustaw wszystko szczegółowo”.' }]
const mode = computed(() => { void prefs.coach; return modeOf() })
const isOn = f => (f.on ? f.on(prefs[f.k]) : !!prefs[f.k])
async function pick(v) {
  if (v === mode.value) { if (v === 'custom') router.push('/settings/details'); return }
  if (v === 'custom') { router.push('/settings/details'); return }
  if (mode.value === 'custom') {
    const { role } = await ask({ title: 'Zastąpić własne ustawienia?', message: `Tryb „${MODES.find(m => m.v === v).t}” ustawi wszystkie przełączniki i zasady progresji od nowa. Treningi zostają.`,
      buttons: [{ text: 'Zmień', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
    if (role !== 'ok') return
  }
  applyPreset(v)
}
</script>

<style scoped>
.feats { margin-top: 10px; }
.feat { min-height: 44px; }
.fs { font-size: 14px; color: var(--app-muted); }
.fs.on { color: var(--app-good, #34c759); font-weight: 600; }
</style>
