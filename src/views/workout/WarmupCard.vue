<!-- warm-up: a note only, nothing is saved, so it never counts in stats -->
<template>
  <div class="warm">
    <div class="warm-h"><ion-icon :icon="flameOutline" /><b>Rozgrzewka</b><span>nie liczy się do statystyk</span></div>
    <div class="warm-row num" v-for="(w, wi) in info.sets" :key="wi">
      <b>{{ wi === 0 ? 'Gryf ' + fmtNum(w.w) : fmtNum(w.w) }} {{ wu() }} × {{ w.r }}</b>
      <span>{{ w.plates.length ? 'na stronę: ' + w.plates.map(fmtNum).join(' + ') : 'pusty gryf' }}</span>
    </div>
    <div class="warm-row work num"><b>Robocze {{ fmtNum(info.W) }} {{ wu() }}</b><span>{{ info.plates.length ? 'na stronę: ' + info.plates.map(fmtNum).join(' + ') : '' }}</span></div>
    <p>Spokojnie, bez zmęczenia, ok. 1 min przerwy między seriami.</p>
  </div>
</template>

<script setup>
import { IonIcon } from '@ionic/vue'
import { flameOutline } from 'ionicons/icons'
import { fmtNum } from '../../plan'
import { wu } from '../../units'
defineProps({ info: { type: Object, required: true } }) // { W, sets: [{ w, r, plates }], plates }
</script>

<style scoped>
.warm { margin: 8px 4px 2px; padding: 10px 12px; border-radius: 14px; background: var(--app-field); }
.warm-h { display: flex; align-items: center; gap: 6px; color: #ff9f0a; font-size: 14px; }
.warm-h span { margin-left: auto; font-size: 11.5px; color: var(--app-muted); }
.warm-row { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 14.5px; border-top: 0.5px solid var(--app-line); }
.warm-h + .warm-row { border-top: 0; margin-top: 4px; }
.warm-row span { color: var(--app-muted); font-size: 13px; }
.warm-row.work b { color: var(--c); }
.warm p { margin: 4px 0 0; font-size: 12px; color: var(--app-muted); }
</style>
