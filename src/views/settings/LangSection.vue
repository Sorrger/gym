<template>
  <div>
    <div class="card look" data-no-tr>
      <span class="lbl">Język · Language</span>
      <div class="seg3">
        <button v-for="(l, k) in LANGS" :key="k" class="press" :class="{ on: lang === k }" @click="setLang(k)">{{ l.name }}</button>
      </div>
    </div>
    <p class="section-foot">Po zmianie apka przeładuje się na sekundę.</p>
    <div class="card look">
      <span class="lbl">Jednostki ciężaru</span>
      <div class="seg3 units">
        <button v-for="u in ['kg', 'lb']" :key="u" class="press" :class="{ on: prefs.units === u }" @click="setPref('units', u)">{{ u }}</button>
      </div>
    </div>
    <p class="section-foot">Treningi zawsze zapisują się w kg – zmiana tylko przelicza to, co widzisz. Krok ciężaru w lb: 5 lb, talerze i gryf w funtach.</p>
  </div>
</template>

<script setup>
import { lang, setLang, LANGS } from '../../i18n'
import { prefs } from '../../prefs'
import { setPref } from '../../account'
</script>

<style scoped>
.seg3.units { grid-template-columns: repeat(2, 1fr); }
</style>
