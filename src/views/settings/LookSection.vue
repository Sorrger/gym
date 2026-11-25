<template>
  <div>
    <div class="card look">
      <span class="lbl">Motyw</span>
      <div class="seg3">
        <button v-for="m in MODES" :key="m.v" class="press" :class="{ on: look.mode === m.v }" @click="setLook('mode', m.v)">{{ m.t }}</button>
      </div>
      <span class="lbl">Styl tła</span>
      <div class="styles">
        <button v-for="st in STYLES" :key="st.id" class="st press" :class="{ on: (look.style || 'classic') === st.id }" @click="setLook('style', st.id)">
          <span class="mock" :style="mock(st.id)"><i class="m-card"><i class="m-dot"></i><i class="m-line"></i></i><i class="m-card short"><i class="m-line"></i></i></span>
          <b>{{ st.name }}</b><small>{{ st.sub }}</small>
        </button>
      </div>
      <span class="lbl">Kolor</span>
      <div class="sw">
        <button v-for="a in ACCENTS" :key="a.id" class="press" :class="{ on: look.accent === a.id }" @click="setLook('accent', a.id)" :aria-label="a.name">
          <i :style="{ background: dark ? a.dark : a.light }"></i><small>{{ a.name }}</small>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { look, setLook, ACCENTS, STYLES, surfaces, isDark } from '../../theme'
const MODES = [{ v: 'system', t: 'Jak telefon' }, { v: 'light', t: 'Jasny' }, { v: 'dark', t: 'Ciemny' }]
const dark = computed(() => { void look.mode; return isDark() })
// a small picture of the style with the current accent and light/dark mode
function mock(id) {
  const a = ACCENTS.find(x => x.id === look.accent) || ACCENTS[0], acc = dark.value ? a.dark : a.light
  const [bg, card] = surfaces(id, dark.value, acc) || (dark.value ? ['#000000', '#1c1c1e'] : ['#f2f2f7', '#ffffff'])
  return { '--bg': bg, '--card': card, '--acc': acc, '--ln': dark.value ? 'rgba(255,255,255,.25)' : 'rgba(0,0,0,.18)' }
}
</script>

<style scoped>
.styles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
.st { border: 0; border-radius: 14px; padding: 8px; background: var(--app-field); display: flex; flex-direction: column; align-items: flex-start; text-align: left; font: inherit; color: var(--ion-text-color); }
.st.on { box-shadow: inset 0 0 0 2px var(--accent); }
.st b { font-size: 14px; margin-top: 7px; }
.st small { font-size: 11px; color: var(--app-muted); }
.mock { width: 100%; height: 58px; border-radius: 9px; background: var(--bg); padding: 7px; display: flex; flex-direction: column; gap: 5px; box-shadow: inset 0 0 0 .5px var(--app-line); }
.m-card { display: flex; align-items: center; gap: 6px; height: 19px; border-radius: 6px; background: var(--card); padding: 0 6px; }
.m-card.short { width: 70%; }
.m-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--acc); flex: none; }
.m-line { height: 4px; flex: 1; border-radius: 2px; background: var(--ln); }
</style>
