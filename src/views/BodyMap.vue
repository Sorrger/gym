<template>
  <svg class="bodymap" :viewBox="`0 0 ${labels ? 212 : 208} ${labels ? 226 : 214}`" role="img" :aria-label="ariaText">
    <g v-for="(v, vi) in VIEWS" :key="v.id" :transform="`translate(${vi * 108 + 2} 2)`">
      <path v-for="(d, i) in BASE" :key="'b' + i" :d="d" class="base" />
      <path v-for="(r, i) in v.regions" :key="i" :d="r.d" :class="cls(r.m)" />
      <text v-if="labels" x="50" y="222" class="lbl">{{ v.name }}</text>
    </g>
  </svg>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({ main: { type: Array, default: () => [] }, help: { type: Array, default: () => [] }, labels: Boolean })

const ell = (cx, cy, rx, ry) => `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0Z`
const rect = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}Z`
const pair = (m, f) => [{ m, d: f(false) }, { m, d: f(true) }]   // left + mirrored right side
const X = (x, flip) => (flip ? 100 - x : x)

// plain silhouette (same for front and back), 100 × 210 units
const BASE = [
  ell(50, 16, 10, 12), rect(44, 25, 12, 10, 3),
  'M30 38Q50 32 70 38L72 70Q70 96 66 104L34 104Q30 96 28 70Z',
  'M34 100L66 100Q71 114 65 122L35 122Q29 114 34 100Z',
  rect(16, 40, 13, 40, 6.5), rect(71, 40, 13, 40, 6.5),
  rect(13, 78, 12, 36, 6), rect(75, 78, 12, 36, 6),
  ell(18, 119, 5, 7), ell(82, 119, 5, 7),
  rect(32, 116, 17, 52, 8.5), rect(51, 116, 17, 52, 8.5),
  rect(34, 166, 14, 38, 7), rect(52, 166, 14, 38, 7),
  ell(41, 206, 7, 3.5), ell(59, 206, 7, 3.5)
]

const FRONT = [
  ...pair('shoulders', f => ell(X(27, f), 45, 8, 7)),
  ...pair('chest', f => `M${X(49, f)} 42Q${X(38, f)} 39 ${X(32, f)} 48Q${X(35, f)} 60 ${X(49, f)} 60Z`),
  ...pair('biceps', f => ell(X(22.5, f), 62, 5, 11)),
  ...pair('forearms', f => ell(X(19, f), 94, 5, 13)),
  { m: 'abs', d: rect(43, 63, 14, 37, 4) },
  ...pair('obliques', f => `M${X(41, f)} 64Q${X(34, f)} 66 ${X(32, f)} 77Q${X(34, f)} 92 ${X(41, f)} 100Z`),
  ...pair('quads', f => ell(X(40.5, f), 141, 8, 23)),
  ...pair('calves', f => ell(X(41, f), 184, 5, 15))
]
const BACK = [
  { m: 'traps', d: 'M50 29L37 42L50 50L63 42Z' },
  ...pair('reardelts', f => ell(X(27, f), 45, 8, 7)),
  { m: 'upperback', d: 'M40 47L50 53L60 47L58 64L50 69L42 64Z' },
  ...pair('lats', f => `M${X(38, f)} 50Q${X(30, f)} 58 ${X(31, f)} 76L${X(42, f)} 90L${X(41, f)} 67Z`),
  ...pair('triceps', f => ell(X(22.5, f), 62, 5, 11)),
  ...pair('forearms', f => ell(X(19, f), 94, 5, 13)),
  { m: 'lowerback', d: rect(44, 72, 12, 27, 4) },
  ...pair('glutes', f => ell(X(41.5, f), 112, 9, 10)),
  ...pair('hamstrings', f => ell(X(40.5, f), 146, 7.5, 20)),
  ...pair('calves', f => ell(X(41, f), 182, 6, 14))
]
const VIEWS = [{ id: 'f', name: 'Przód', regions: FRONT }, { id: 'b', name: 'Tył', regions: BACK }]

const NAMES = { chest: 'klatka', shoulders: 'barki', biceps: 'biceps', forearms: 'przedramiona', abs: 'brzuch', obliques: 'skośne brzucha',
  quads: 'czworogłowe', calves: 'łydki', traps: 'kaptury', reardelts: 'tył barków', upperback: 'górne plecy', lats: 'najszersze',
  triceps: 'triceps', lowerback: 'dolne plecy', glutes: 'pośladki', hamstrings: 'dwugłowe' }
const ariaText = computed(() => 'Mięśnie: ' + props.main.map(m => NAMES[m]).join(', ') +
  (props.help.length ? '; pomocniczo: ' + props.help.map(m => NAMES[m]).join(', ') : ''))

const cls = m => props.main.includes(m) ? 'mus main' : props.help.includes(m) ? 'mus help' : 'mus'
</script>

<style scoped>
.bodymap { display: block; height: 100%; width: auto; }
.base { fill: color-mix(in srgb, var(--ion-text-color, #000) 7%, transparent); }
.mus { fill: color-mix(in srgb, var(--ion-text-color, #000) 9%, transparent); transition: fill .25s; }
.mus.help { fill: color-mix(in srgb, var(--c, #8a5cf6) 38%, transparent); }
.mus.main { fill: var(--c, #8a5cf6); }
@media (prefers-color-scheme: dark) {
  .base { fill: color-mix(in srgb, var(--ion-text-color, #fff) 13%, transparent); }
  .mus { fill: color-mix(in srgb, var(--ion-text-color, #fff) 19%, transparent); }
  .mus.help { fill: color-mix(in srgb, var(--c, #8a5cf6) 50%, transparent); }
}
.lbl { font-size: 11px; font-weight: 600; text-anchor: middle; fill: var(--app-muted, #888); }
</style>
