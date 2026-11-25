<template>
  <div class="rest-bar" :class="{ end: rest.left.value === 0 }" role="timer">
    <span class="rest-ico"><ion-icon :icon="stopwatchOutline" /></span>
    <div class="rest-t"><small>{{ rest.left.value ? 'Przerwa' : 'Koniec przerwy' }}</small><b class="num">{{ rest.text.value }}</b></div>
    <button class="press" @click="rest.add(-15)" aria-label="15 sekund krócej">−15</button>
    <button class="press" @click="rest.add(15)" aria-label="15 sekund dłużej">+15</button>
    <button class="press skip" @click="rest.stop()">{{ rest.left.value ? 'Pomiń' : 'OK' }}</button>
  </div>
</template>

<script setup>
import { IonIcon } from '@ionic/vue'
import { stopwatchOutline } from 'ionicons/icons'
defineProps({ rest: { type: Object, required: true } }) // from useRest()
</script>

<style scoped>
.rest-bar { position: absolute; z-index: 80; left: 12px; right: 12px; bottom: calc(env(safe-area-inset-bottom, 0px) + 86px); display: flex; align-items: center; gap: 8px;
  padding: 9px 10px 9px 12px; border-radius: 18px; background: var(--app-card); box-shadow: 0 10px 30px rgba(0,0,0,.22); }
.rest-bar.end { background: #34c759; color: #fff; }
.rest-ico { font-size: 24px; color: var(--c); display: grid; }
.rest-bar.end .rest-ico { color: #fff; }
.rest-t { flex: 1; display: flex; flex-direction: column; line-height: 1.1; }
.rest-t small { font-size: 12px; color: var(--app-muted); font-weight: 600; }
.rest-bar.end .rest-t small { color: rgba(255,255,255,.85); }
.rest-t b { font-size: 24px; font-weight: 800; letter-spacing: -.3px; }
.rest-bar button { border: 0; border-radius: 11px; padding: 9px 10px; font: inherit; font-size: 15px; font-weight: 700; background: var(--app-field); color: var(--ion-text-color); }
.rest-bar button.skip { background: var(--c); color: #fff; }
.rest-bar.end button { background: rgba(255,255,255,.25); color: #fff; }
</style>
