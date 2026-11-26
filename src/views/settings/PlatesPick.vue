<!-- which plates the gym has + its standard bar; used by the plates-per-side line and the warm-up card -->
<template>
  <div class="pp">
    <span class="pp-l">Talerze na Twojej siłowni</span>
    <div class="pp-chips">
      <button v-for="p in allPlates" :key="p" class="pp-c num press" :class="{ on: has(p) }" :aria-pressed="has(p)" @click="toggle(p)">{{ fmtNum(p) }}</button>
    </div>
    <span class="pp-l">Gryf (sztanga prosta)</span>
    <div class="pp-chips">
      <button v-for="b in bars" :key="b" class="pp-c num press" :class="{ on: curBar === b }" @click="setPref(lb ? 'barLb' : 'barKg', b)">{{ b }} {{ lb ? 'lb' : 'kg' }}</button>
    </div>
    <p class="pp-h">Apka liczy talerze tylko z zaznaczonych. Jeśli czegoś nie da się złożyć, pokaże ile zostaje.</p>
  </div>
</template>

<script setup>
import { prefs } from '../../prefs'
import { setPref } from '../../account'
import { computed } from 'vue'
import { ALL_PLATES, PLATES, fmtNum } from '../../plan'
import { ALL_PLATES_LB, BARS_LB, isLb, plateSetU } from '../../units'
// plates and bars follow the weight unit (kg plates / lb plates are separate lists)
const lb = computed(() => isLb())
const allPlates = computed(() => (lb.value ? ALL_PLATES_LB : ALL_PLATES))
const bars = computed(() => (lb.value ? BARS_LB : [20, 15, 10]))
const curBar = computed(() => (lb.value ? prefs.barLb : prefs.barKg))
const list = () => plateSetU(PLATES)
const has = p => list().includes(p)
function toggle(p) {
  const l = list()
  const next = has(p) ? l.filter(x => x !== p) : [...l, p].sort((a, b) => b - a)
  if (next.length) setPref(lb.value ? 'plateSetLb' : 'plateSet', next) // at least one plate stays
}
</script>

<style scoped>
.pp { display: flex; flex-direction: column; gap: 8px; }
.pp-l { font-size: 13px; color: var(--app-muted); margin: 2px 2px 0; }
.pp-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.pp-c { min-width: 46px; height: 36px; padding: 0 10px; border: 0; border-radius: 10px; font: inherit; font-size: 15px; font-weight: 700;
  background: var(--app-field); color: var(--app-muted); }
.pp-c.on { background: color-mix(in srgb, var(--accent) 16%, var(--app-card)); color: var(--accent); }
.pp-h { margin: 2px 2px 0; font-size: 12.5px; line-height: 1.35; color: var(--app-muted); }
</style>
