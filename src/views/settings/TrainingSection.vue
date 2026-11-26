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
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import { setPref } from '../../account'
import { COACH, TOGGLES, REST, DELOAD_NUMS } from './rules'
import StepRow from './StepRow.vue'
import SwitchRow from './SwitchRow.vue'
import PlatesPick from './PlatesPick.vue'
</script>
