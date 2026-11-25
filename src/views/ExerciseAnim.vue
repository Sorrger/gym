<!-- Plays one exercise scene (src/anim/scenes.js) in a loop; a still frame when the phone asks for less motion. -->
<template>
  <svg class="xa" viewBox="0 0 380 250" role="img" :aria-label="label">
    <g v-for="(s, i) in parts.filter(x => x.under)" :key="'u' + i" :transform="`translate(${s.at.x} ${s.at.y})`" class="plate">
      <circle :r="s.r" class="plate-fill" /><circle :r="s.r" class="plate-rim" /><circle :r="s.r * 0.7" class="plate-ring" /><circle r="4" class="plate-hub" />
    </g>
    <line v-if="scene.path" class="path" :x1="scene.path[0].x" :y1="scene.path[0].y" :x2="scene.path[1].x" :y2="scene.path[1].y" />
    <template v-for="(s, i) in scene.back" :key="'b' + i">
      <component :is="s.t" :class="s.c" v-bind="s.a" />
    </template>
    <template v-for="(s, i) in parts.filter(x => !x.under)" :key="'f' + i">
      <g v-if="s.t === 'plate'" :transform="`translate(${s.at.x} ${s.at.y})`" class="plate">
        <circle :r="s.r" class="plate-fill" /><circle :r="s.r" class="plate-rim" /><circle :r="s.r * 0.7" class="plate-ring" /><circle r="4" class="plate-hub" />
      </g>
      <component v-else :is="s.t" :class="s.c" v-bind="s.a" />
    </template>
    <text v-if="phase" class="ph" x="352" y="30" text-anchor="end">{{ phase }}</text>
  </svg>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { phaseAt } from '../anim/model'

const props = defineProps({ scene: { type: Object, required: true }, label: { type: String, default: '' } })
/** @type {import('vue').Ref<any[]>} */
const parts = ref(props.scene.frame(0))
const phase = ref('')
let raf = 0
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const t0 = performance.now()
  const tick = now => {
    const { k, label } = phaseAt(props.scene.phases, now - t0)
    parts.value = props.scene.frame(k)
    phase.value = label
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)
})
onBeforeUnmount(() => cancelAnimationFrame(raf))
</script>

<style scoped>
.xa { --box: color-mix(in srgb, var(--ion-text-color) 6%, var(--app-bg)); --fig: color-mix(in srgb, var(--ion-text-color) 55%, var(--box));
  display: block; width: 100%; height: auto; background: var(--box); border-radius: 14px; }
.xa .shadow { fill: color-mix(in srgb, var(--ion-text-color) 7%, transparent); }
.xa .ground { stroke: color-mix(in srgb, var(--ion-text-color) 22%, transparent); }
.xa .gear, .xa .plate-fill { fill: color-mix(in srgb, var(--ion-text-color) 30%, var(--box)); }
.xa .body { fill: var(--fig); }
.xa .limb, .xa .near, .xa .outline, .xa .accent, .xa .hair { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.xa .limb { stroke: var(--fig); }
.xa .outline { stroke: var(--box); }
.xa .near { stroke: color-mix(in srgb, var(--ion-text-color) 72%, var(--box)); }
.xa .hand { fill: color-mix(in srgb, var(--ion-text-color) 80%, var(--box)); stroke: var(--box); stroke-width: 2; }
.xa .accent { stroke: var(--c, var(--accent)); }
.xa .hair { stroke: color-mix(in srgb, var(--ion-text-color) 35%, var(--box)); }
.xa .path { stroke: var(--c, var(--accent)); stroke-width: 1.5; stroke-dasharray: 4 4; opacity: .6; }
.xa .plate-rim { fill: none; stroke: var(--fig); stroke-width: 2; }
.xa .plate-ring { fill: none; stroke: var(--fig); stroke-width: 1; opacity: .5; }
.xa .plate-hub { fill: var(--fig); }
.xa .ph { fill: var(--app-muted); font-size: 13px; font-weight: 600; }
</style>
