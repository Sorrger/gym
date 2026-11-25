<template>
  <div>
    <div class="card look">
      <span class="lbl">Motyw</span>
      <div class="seg3">
        <button v-for="m in MODES" :key="m.v" class="press" :class="{ on: look.mode === m.v }" @click="setLook('mode', m.v)">{{ m.t }}</button>
      </div>
      <span class="lbl">Kolor</span>
      <div class="sw">
        <button v-for="a in ACCENTS" :key="a.id" class="press" :class="{ on: look.accent === a.id }" @click="setLook('accent', a.id)" :aria-label="a.name">
          <i :style="{ background: a.light }"></i><small>{{ a.name }}</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { look, setLook, ACCENTS } from '../../theme'
const MODES = [{ v: 'system', t: 'Jak telefon' }, { v: 'light', t: 'Jasny' }, { v: 'dark', t: 'Ciemny' }]
</script>
