<!-- Plays one exercise scene in a loop: hand-drawn scenes (scenes.js) or rig scenes (rig.js + library.js).
     A still frame when the phone asks for less motion. -->
<template>
  <svg class="xa" :viewBox="vb" role="img" :aria-label="label">
    <template v-if="scene.rig && !scene.top">
      <ellipse class="shadow" :cx="box.x + box.w / 2" :cy="2" :rx="box.w * 0.36" ry="5" />
      <line class="ground" :x1="box.x" y1="0" :x2="box.x + box.w" y2="0" stroke-width="2" />
    </template>
    <g v-for="(s, i) in parts.filter(x => x.under)" :key="'u' + i" :transform="`translate(${s.at.x} ${s.at.y})`" class="plate">
      <circle :r="s.r" class="plate-fill" /><circle :r="s.r" class="plate-rim" /><circle :r="s.r * 0.7" class="plate-ring" /><circle r="4" class="plate-hub" />
    </g>
    <line v-if="scene.path" class="path" :x1="scene.path[0].x" :y1="scene.path[0].y" :x2="scene.path[1].x" :y2="scene.path[1].y" />
    <template v-for="(s, i) in scene.back || []" :key="'b' + i">
      <component :is="s.t" :class="s.c" v-bind="s.a" />
    </template>
    <template v-for="(s, i) in parts.filter(x => !x.under)" :key="'f' + i">
      <g v-if="s.t === 'plate'" :transform="`translate(${s.at.x} ${s.at.y})`" class="plate" :class="{ far: s.far }">
        <circle :r="s.r" class="plate-fill" /><circle :r="s.r" class="plate-rim" /><circle :r="s.r * 0.7" class="plate-ring" /><circle r="4" class="plate-hub" />
      </g>
      <component v-else :is="s.t" :class="s.c" v-bind="s.a" />
    </template>
    <text v-if="phase" class="ph" :x="phX" :y="phY" text-anchor="end" :font-size="fs">{{ phase }}</text>
  </svg>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { phaseAt } from '../anim/model'
import { draw, poseAt } from '../anim/rig'

const props = defineProps({ scene: { type: Object, required: true }, label: { type: String, default: '' } })
const box = computed(() => props.scene.box || { x: 0, y: 0, w: 380, h: 250 })
const vb = computed(() => `${box.value.x} ${box.value.y} ${box.value.w} ${box.value.h}`)
const k380 = computed(() => box.value.w / 380)
const phX = computed(() => box.value.x + box.value.w - 28 * k380.value)
const phY = computed(() => box.value.y + 30 * k380.value)
const fs = computed(() => 13 * k380.value)
const frameAt = k => (props.scene.rig ? draw(props.scene, poseAt(props.scene.frames, k)) : props.scene.frame(k))
/** @type {import('vue').Ref<any[]>} */
const parts = ref(frameAt(props.scene.rig ? 0.6 : 0))
const phase = ref('')
let raf = 0
onMounted(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const t0 = performance.now()
  const tick = now => {
    const { k, label } = phaseAt(props.scene.phases, now - t0)
    parts.value = frameAt(k)
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
.xa .shadow { fill: color-mix(in srgb, var(--ion-text-color) 7%, var(--box)); }
.xa .ground { stroke: color-mix(in srgb, var(--ion-text-color) 22%, var(--box)); }
.xa .gear, .xa .plate-fill { fill: color-mix(in srgb, var(--ion-text-color) 30%, var(--box)); }
.xa .pad { fill: color-mix(in srgb, var(--ion-text-color) 40%, var(--box)); stroke: color-mix(in srgb, var(--ion-text-color) 40%, var(--box)); stroke-linecap: round; }
.xa rect.pad { stroke: none; }
.xa line.gear, .xa .gear-line, .xa .frame { stroke: color-mix(in srgb, var(--ion-text-color) 30%, var(--box)); stroke-linecap: round; fill: none; }
.xa .frame { stroke: color-mix(in srgb, var(--ion-text-color) 22%, var(--box)); }
.xa .cable { stroke: color-mix(in srgb, var(--ion-text-color) 45%, var(--box)); fill: none; }
.xa .band { stroke: var(--c, var(--accent)); opacity: .55; stroke-linecap: round; }
.xa .rim { fill: none; stroke: var(--fig); stroke-width: 2; }
.xa .hub { fill: var(--fig); }
.xa .body { fill: var(--fig); stroke: var(--fig); stroke-linecap: round; }
.xa circle.body { stroke: none; }
.xa .limb, .xa .near, .xa .outline, .xa .accent, .xa .hair, .xa .far { fill: none; stroke-linecap: round; stroke-linejoin: round; }
.xa .limb { stroke: var(--fig); }
.xa .far { stroke: color-mix(in srgb, var(--ion-text-color) 32%, var(--box)); }
.xa circle.far { fill: color-mix(in srgb, var(--ion-text-color) 32%, var(--box)); stroke: none; }
.xa .gear.far, .xa .rim.far, .xa .hub.far, .xa .plate.far { opacity: .55; }
.xa .outline { stroke: var(--box); }
.xa .bodyf { fill: var(--fig); }
.xa .farf { fill: color-mix(in srgb, var(--ion-text-color) 32%, var(--box)); }
.xa .nearf { fill: color-mix(in srgb, var(--ion-text-color) 72%, var(--box)); }
.xa .outf { fill: var(--box); }
.xa .near { stroke: color-mix(in srgb, var(--ion-text-color) 72%, var(--box)); }
.xa .hand { fill: color-mix(in srgb, var(--ion-text-color) 80%, var(--box)); stroke: var(--box); stroke-width: 2; }
.xa .accent { stroke: var(--c, var(--accent)); }
.xa circle.accent { fill: var(--c, var(--accent)); stroke: none; }
.xa path.accent { fill: var(--c, var(--accent)); stroke: none; }
.xa .accent.soft { opacity: .45; }
.xa .hair { stroke: color-mix(in srgb, var(--ion-text-color) 35%, var(--box)); }
.xa .path { stroke: var(--c, var(--accent)); stroke-width: 1.5; stroke-dasharray: 4 4; opacity: .6; }
.xa .plate-rim { fill: none; stroke: var(--fig); stroke-width: 2; }
.xa .plate-ring { fill: none; stroke: var(--fig); stroke-width: 1; opacity: .5; }
.xa .plate-hub { fill: var(--fig); }
.xa .ph { fill: var(--app-muted); font-weight: 600; }
</style>
