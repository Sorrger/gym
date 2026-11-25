<template>
  <div>
    <div class="plans">
      <button v-for="p in plans" :key="p.key" class="pcard press" :style="{ '--c': COLORS[p.key] }" @click="router.push('/progress/' + p.i)">
        <div class="pc-top">
          <span class="pc-name">{{ p.name }}</span>
          <ion-icon :icon="chevronForward" class="pc-chev" />
        </div>
        <span class="pc-last">{{ p.s.last ? ago(p.s.last.date) : 'jeszcze nie było' }}</span>
        <div class="pc-bars" aria-hidden="true">
          <span v-for="(h, j) in p.s.sbars" :key="j" :style="{ height: h + '%' }" :class="{ last: j === p.s.sbars.length - 1 }"></span>
          <span v-if="!p.s.sbars.length" class="ghost" style="height: 30%"></span>
        </div>
        <div class="pc-foot num">
          <b>{{ signed(p.s.gain) }}</b>
          <small>siły</small>
          <em v-if="p.s.tracked">↑ {{ p.s.up }}/{{ p.s.tracked }}</em>
        </div>
      </button>
    </div>
    <p class="section-foot">Słupki = siła z ostatnich treningów. ↑ = ile ćwiczeń poprawiłeś ostatnim razem.</p>
  </div>
</template>

<script setup>
// Postępy → Treningi: one card per training (strength of the last workouts) → /progress/:day
import { useIonRouter, IonIcon } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { COLORS } from '../../plan'
import { ago } from '../../store'
import { usePlans, signed } from './plans'

const router = useIonRouter()
const plans = usePlans()
</script>

<style scoped>
.plans { margin: 0 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pcard { text-align: left; border: 0; border-radius: var(--r-lg); padding: 14px; color: #fff; font: inherit; display: flex; flex-direction: column; min-height: 168px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 80%, #fff) 0%, var(--c) 55%, color-mix(in srgb, var(--c) 82%, #000) 100%);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c) 28%, transparent); }
.pc-top { display: flex; justify-content: space-between; align-items: center; }
.pc-name { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }
.pc-chev { font-size: 18px; opacity: .8; }
.pc-last { font-size: 12px; opacity: .85; }
.pc-bars { display: flex; align-items: flex-end; gap: 4px; height: 48px; margin-top: auto; padding-top: 10px; }
.pc-bars span { flex: 1; max-width: 16px; border-radius: 4px 4px 2px 2px; background: rgba(255,255,255,.35); }
.pc-bars span.last { background: #fff; }
.pc-bars span.ghost { background: rgba(255,255,255,.18); max-width: none; }
.pc-foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.pc-foot b { font-size: 17px; font-weight: 700; }
.pc-foot small { font-size: 13px; opacity: .85; margin-left: -2px; }
.pc-foot em { margin-left: auto; white-space: nowrap; font-style: normal; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; background: rgba(255,255,255,.25); }
</style>
