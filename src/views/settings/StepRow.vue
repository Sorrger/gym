<!-- one settings row with a − value + stepper for a number preference -->
<template>
  <div class="row every">
    <div class="grow"><b>{{ item.t }}</b><span>{{ item.d }}</span></div>
    <div class="stepper num">
      <button class="press" :disabled="!canStep(item, -1)" @click="step(item, -1)" aria-label="Mniej">−</button>
      <b>{{ item.fmt(prefs[item.k]) }}</b>
      <button class="press" :disabled="!canStep(item, 1)" @click="step(item, 1)" aria-label="Więcej">+</button>
    </div>
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import { canStep, step } from './rules'
defineProps({ item: { type: Object, required: true } })
</script>
