<template>
  <div>
    <div class="ios-group toggles">
      <SwitchRow k="weightOn" t="Śledzenie wagi" d="Kafelek na Starcie, ekran Waga, cel sylwetki" />
    </div>
    <p v-if="prefs.weightOn" class="section-foot">Cel (redukcja, utrzymanie, masa) i wagę docelową ustawiasz na ekranie Waga: Postępy → Ciało.</p>
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import SwitchRow from './SwitchRow.vue'
</script>
