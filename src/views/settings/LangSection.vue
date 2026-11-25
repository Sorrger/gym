<template>
  <div>
    <div class="card look" data-no-tr>
      <span class="lbl">Język · Language</span>
      <div class="seg3">
        <button class="press" :class="{ on: lang === 'pl' }" @click="setLang('pl')">Polski</button>
        <button class="press" :class="{ on: lang === 'en' }" @click="setLang('en')">English</button>
      </div>
    </div>
    <p class="section-foot">Po zmianie apka przeładuje się na sekundę.</p>
  </div>
</template>

<script setup>
import { lang, setLang } from '../../i18n'
</script>
