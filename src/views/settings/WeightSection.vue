<template>
  <div>
    <div class="ios-group toggles">
      <SwitchRow k="weightOn" t="Śledzenie wagi" d="Kafelek na Starcie, ekran Waga, cel sylwetki" />
    </div>
    <template v-if="prefs.weightOn">
      <h3 class="section-title">Cel</h3>
      <div class="card look">
        <span class="lbl">Twój cel</span>
        <div class="seg3">
          <button v-for="g in GOALS" :key="g.v" class="press" :class="{ on: prefs.goal === g.v }" @click="setPref('goal', g.v)">{{ g.t }}</button>
        </div>
        <p class="hint">{{ GOALS.find(g => g.v === prefs.goal).d }}</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import { setPref } from '../../account'
import { GOALS } from './rules'
import SwitchRow from './SwitchRow.vue'
</script>
