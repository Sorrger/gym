<template>
  <div>
    <div class="card look">
      <span class="lbl">Podpowiedzi ciężaru i powtórzeń</span>
      <div class="seg3">
        <button v-for="m in COACH" :key="m.v" class="press" :class="{ on: prefs.coach === m.v }" @click="setPref('coach', m.v)">{{ m.t }}</button>
      </div>
      <p class="hint">{{ COACH.find(m => m.v === prefs.coach).d }}</p>
    </div>
    <div class="ios-group toggles">
      <SwitchRow v-for="t in TOGGLES" :key="t.k" v-bind="t" />
      <StepRow v-if="prefs.restTimer" :item="REST" />
      <template v-if="prefs.deload">
        <StepRow v-for="t in DELOAD_NUMS" :key="t.k" :item="t" />
        <SwitchRow k="deloadHalf" t="Połowa serii w lżejszym tygodniu" d="Wyłączone = tyle serii co zwykle" />
      </template>
    </div>
    <div v-if="prefs.plates" class="card look plates-card"><PlatesPick /></div>
    <h3 class="sec-t">Progresja</h3>
    <div class="ios-group">
      <StepRow v-for="t in NUMS" :key="t.k" :item="t" />
    </div>
    <p class="section-foot">Ćwiczenie idzie w górę, gdy wszystkie serie dojdą do góry zakresu (np. 3 × 8 przy 6-8) – albo wcześniej, gdy w każdej zostaje Twój zapas.</p>
    <button v-if="!isDefault" class="reset-btn press" @click="reset">Przywróć domyślne zasady treningu</button>
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import { setPref } from '../../account'
import { computed } from 'vue'
import { ask } from '../../dialog'
import { COACH, TOGGLES, REST, DELOAD_NUMS, NUMS, rulesDefault, resetRules } from './rules'
import StepRow from './StepRow.vue'
import SwitchRow from './SwitchRow.vue'
import PlatesPick from './PlatesPick.vue'

// every switch and number of the training, one by one ("Własne" on the Trening page)
const isDefault = computed(rulesDefault)
async function reset() {
  const { role } = await ask({ title: 'Przywrócić domyślne zasady?', message: 'Podpowiedzi, zapas, krok ciężaru, zejście i lżejszy tydzień wrócą do ustawień startowych. Treningi zostają.',
    buttons: [{ text: 'Przywróć', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'ok') resetRules()
}
</script>

<style scoped>
.sec-t { margin: 26px 18px 8px; font-size: 21px; font-weight: 700; }
</style>
