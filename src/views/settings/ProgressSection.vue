<template>
  <div>
    <div class="ios-group">
      <StepRow v-for="t in NUMS" :key="t.k" :item="t" />
    </div>
    <p class="section-foot">Ćwiczenie idzie w górę, gdy wszystkie serie dojdą do góry zakresu (np. 3 × 8 przy 6-8) – albo wcześniej, gdy w każdej zostaje Twój zapas. {{ isDefault ? '' : 'Masz własne ustawienia.' }}</p>
    <button v-if="!isDefault" class="reset-btn press" @click="reset">Przywróć domyślne zasady treningu</button>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ask } from '../../dialog'
import { NUMS, rulesDefault, resetRules } from './rules'
import StepRow from './StepRow.vue'

const isDefault = computed(rulesDefault)
async function reset() {
  const { role } = await ask({ title: 'Przywrócić domyślne zasady?', message: 'Podpowiedzi, zapas, krok ciężaru, zejście i lżejszy tydzień wrócą do ustawień startowych. Treningi zostają.',
    buttons: [{ text: 'Przywróć', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'ok') resetRules()
}
</script>
