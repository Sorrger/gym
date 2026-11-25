<template>
  <!-- own colour icons instead of emoji (look the same on every phone, match the app) -->
  <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
    <defs>
      <linearGradient :id="id" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :stop-color="pal[1]" /><stop offset="1" :stop-color="pal[1]" />
      </linearGradient>
    </defs>
    <template v-if="name === 'flame'">
      <path :fill="`url(#${id})`" d="M12.2 1.8c.9 3.6 5.6 5.9 5.6 11.1a5.8 5.8 0 0 1-11.6 0c0-2.4 1.1-4.1 2.5-5.2.2 1.8 1.1 2.9 2.3 3.3-.5-3.3-.1-6.5 1.2-9.2z" />
      <path fill="#ffd60a" d="M12 13.2c1 1.4 2.6 2.3 2.6 4.2a2.6 2.6 0 0 1-5.2 0c0-1.6 1-2.7 2.6-4.2z" />
    </template>
    <template v-else-if="name === 'scale'">
      <rect x="3" y="3.5" width="18" height="17" rx="5" :fill="`url(#${id})`" />
      <path fill="#fff" d="M7.2 10.6a4.8 4.8 0 0 1 9.6 0z" opacity=".95" />
      <path d="M12 10.4 14 7.6" stroke="#0a5c8a" stroke-width="1.5" stroke-linecap="round" />
      <rect x="9" y="15.5" width="6" height="1.6" rx=".8" fill="#fff" opacity=".6" />
    </template>
    <template v-else-if="name === 'dumbbell'">
      <rect x="2" y="7.5" width="3.4" height="9" rx="1.4" :fill="`url(#${id})`" />
      <rect x="18.6" y="7.5" width="3.4" height="9" rx="1.4" :fill="`url(#${id})`" />
      <rect x="5" y="5.5" width="3.6" height="13" rx="1.6" :fill="`url(#${id})`" />
      <rect x="15.4" y="5.5" width="3.6" height="13" rx="1.6" :fill="`url(#${id})`" />
      <rect x="8.4" y="10.8" width="7.2" height="2.4" rx="1" :fill="pal[1]" />
    </template>
    <template v-else-if="name === 'trophy'">
      <path d="M6.5 5.5H4.2a.7.7 0 0 0-.7.8c.3 2.7 1.8 4.4 4.2 4.9M17.5 5.5h2.3a.7.7 0 0 1 .7.8c-.3 2.7-1.8 4.4-4.2 4.9" fill="none" :stroke="pal[1]" stroke-width="1.8" stroke-linecap="round" />
      <path :fill="`url(#${id})`" d="M6.5 3h11v5.2a5.5 5.5 0 0 1-11 0z" />
      <rect x="10.8" y="13" width="2.4" height="4" :fill="pal[1]" />
      <rect x="7.5" y="17" width="9" height="3.6" rx="1.2" :fill="`url(#${id})`" />
      <path d="M9.3 5.3v2.6" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".7" />
    </template>
    <template v-else-if="name === 'check'">
      <circle cx="12" cy="12" r="10" :fill="`url(#${id})`" />
      <path d="m7.4 12.3 3.1 3.1 6.1-6.4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </template>
    <template v-else-if="name === 'warn'">
      <path :fill="`url(#${id})`" d="M10.3 3.4a2 2 0 0 1 3.4 0l8 13.8a2 2 0 0 1-1.7 3H4a2 2 0 0 1-1.7-3z" />
      <rect x="10.9" y="8.2" width="2.2" height="6.3" rx="1.1" fill="#fff" /><circle cx="12" cy="17" r="1.3" fill="#fff" />
    </template>
    <template v-else-if="name === 'bolt'">
      <path :fill="`url(#${id})`" d="M13.8 1.8 4.6 13.4h6.1l-1.4 8.8 9.2-11.8h-6.1z" />
    </template>
    <template v-else-if="name === 'chart'">
      <rect x="2.5" y="3" width="19" height="18" rx="5" :fill="`url(#${id})`" />
      <path d="m6.5 15.5 3.6-3.8 2.8 2.4 4.6-5.3" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="17.5" cy="8.8" r="1.5" fill="#fff" />
    </template>
    <template v-else-if="name === 'pause'">
      <rect x="2.5" y="3" width="19" height="18" rx="5" :fill="`url(#${id})`" />
      <rect x="8.2" y="8" width="2.6" height="8" rx="1.1" fill="#fff" /><rect x="13.2" y="8" width="2.6" height="8" rx="1.1" fill="#fff" />
    </template>
    <template v-else-if="name === 'up'">
      <rect x="2.5" y="3" width="19" height="18" rx="5" :fill="`url(#${id})`" />
      <path d="M12 17V7.5m-4 4 4-4 4 4" fill="none" stroke="#fff" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ name: String })
let n = 0
const id = 'ig' + Math.random().toString(36).slice(2, 8) + (n++)
const PAL = {
  flame: ['#ffb340', '#ff3b30'], scale: ['#5ac8fa', '#0a84ff'], dumbbell: ['#b9a2ff', '#7346f5'],
  trophy: ['#ffe066', '#f5a300'], check: ['#4cd964', '#1f9d55'], warn: ['#ffcc00', '#ff9500'],
  bolt: ['#ffe066', '#ff9f0a'], chart: ['#b9a2ff', '#7346f5'], pause: ['#aeb4be', '#7c8591'], up: ['#ffb340', '#ff6b00']
}
const pal = computed(() => PAL[props.name] || PAL.dumbbell)
</script>

<style scoped>
.ico { width: 1.15em; height: 1.15em; vertical-align: -0.2em; flex: none; display: inline-block; }
</style>
