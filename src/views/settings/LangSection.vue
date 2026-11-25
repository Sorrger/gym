<template>
  <div>
    <div class="card look" data-no-tr>
      <span class="lbl">Język · Language</span>
      <div class="seg3">
        <button v-for="(l, k) in LANGS" :key="k" class="press" :class="{ on: lang === k }" @click="setLang(k)">{{ l.name }}</button>
      </div>
    </div>
    <p class="section-foot">Po zmianie apka przeładuje się na sekundę.</p>
  </div>
</template>

<script setup>
import { lang, setLang, LANGS } from '../../i18n'
</script>
