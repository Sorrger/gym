<!-- hang timer: set seconds on a dial (knob position = value, 5..120 s) → prep 5-4-3-2-1 → counts down to 0 → saved.
     Stop during the run saves the seconds actually held. Based on timestamps, so it stays right if the screen sleeps.
     Emits save(secs) (parent writes the value and ticks the set) and close. -->
<template>
  <div class="timer-screen">
    <div class="tm-head">{{ title }}</div>

    <div class="tm-ring" :class="['ph-' + phase, { dragging: dial != null }]" ref="dialEl"
      @pointerdown="dialDown" @pointermove="dialMove" @pointerup="dialUp" @pointercancel="dialUp">
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="50" class="bg" />
        <circle cx="60" cy="60" r="50" class="fg" :style="{ strokeDashoffset: 314.16 * (1 - ring) }" />
        <g v-if="phase === 'setup'" class="knob-g" :style="{ transform: `rotate(${(dial ?? secs) / DIAL_MAX * 360}deg)` }">
          <circle cx="110" cy="60" r="8.5" class="knob" />
        </g>
      </svg>
      <div class="tm-val num">
        <b>{{ phase === 'setup' ? secs : phase === 'prep' ? prepLeft : left }}</b>
        <span>{{ phase === 'setup' ? 'sekund · kręć palcem' : phase === 'prep' ? 'przygotuj się' : phase === 'done' ? 'brawo!' : 'zostało sekund' }}</span>
      </div>
    </div>

    <div class="tm-adj" v-if="phase === 'setup'">
      <button @click="secs = Math.max(DIAL_MIN, secs - 5)">−5 s</button>
      <button @click="secs = Math.max(DIAL_MIN, secs - 1)">−1</button>
      <button @click="secs = Math.min(DIAL_MAX, secs + 1)">+1</button>
      <button @click="secs = Math.min(DIAL_MAX, secs + 5)">+5 s</button>
    </div>
    <p class="tm-goal num" v-else>{{ phase === 'run' ? 'Wiszenie ' + secs + ' s' : phase === 'done' ? 'Zapisano ' + secs + ' s' : 'Start za chwilę' }}</p>

    <div class="tm-btns">
      <button class="tm-cancel" @click="emit('close')">Anuluj</button>
      <button class="tm-stop" v-if="phase === 'setup'" @click="start">Start</button>
      <button class="tm-stop" v-else-if="phase === 'prep'" @click="skipPrep">Start teraz</button>
      <button class="tm-stop" v-else-if="phase === 'run'" @click="stop">Stop i zapisz</button>
      <button class="tm-stop" v-else @click="emit('close')">Gotowe</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { beep } from './beep'

const props = defineProps({ title: String, initial: { type: Number, default: 30 } })
const emit = defineEmits(['save', 'close'])

const PREP = 5, DIAL_MIN = 5, DIAL_MAX = 120
const phase = ref('setup'), secs = ref(props.initial), now = ref(Date.now()), dialEl = ref(null)
const dial = ref(null) // exact (fractional) dial position while the finger moves – ring and knob follow it smoothly
let go = 0, end = 0, iv = null, raf = 0, wake = null, beeped = new Set(), doneT = null

const prepLeft = computed(() => (go ? Math.max(1, Math.ceil((go - now.value) / 1000)) : PREP))
const left = computed(() => (end ? Math.max(0, Math.ceil((end - now.value) / 1000)) : secs.value))
const ring = computed(() => {
  if (phase.value === 'setup') return (dial.value ?? secs.value) / DIAL_MAX
  if (phase.value === 'prep') return (go - now.value) / (PREP * 1000)
  if (phase.value === 'run') return Math.max(0, (end - now.value) / (secs.value * 1000))
  return 1
})
const once = (k, fn) => { if (!beeped.has(k)) { beeped.add(k); fn() } }

function tick() {
  now.value = Date.now()
  if (phase.value === 'prep') {
    if (now.value >= go) { phase.value = 'run'; once('go', () => beep(1320, 300)) }
    else once('p' + prepLeft.value, () => beep(880, 110))
  }
  if (phase.value === 'run') {
    if (now.value >= end) { finish(secs.value); return }
    if (left.value <= 3) once('l' + left.value, () => beep(1100, 90))
    // every 10 s of hanging: a low "ding" – 1 at 10 s, 2 at 20 s… (count without looking); not during the last 3 s
    const held = Math.floor((now.value - go) / 1000)
    if (held > 0 && held % 10 === 0 && left.value > 3) once('h' + held, () => {
      const n = Math.min(5, held / 10)
      for (let i = 0; i < n; i++) setTimeout(() => beep(660, 160), i * 230)
    })
  }
}
async function start() {
  try { wake = await navigator.wakeLock?.request('screen') } catch {}
  const t = Date.now()
  beeped = new Set()
  go = t + PREP * 1000; end = go + secs.value * 1000
  phase.value = 'prep'; now.value = t
  clearInterval(iv); iv = setInterval(tick, 100); tick()
  cancelAnimationFrame(raf)
  const frame = () => { if (phase.value === 'setup' || phase.value === 'done') return; now.value = Date.now(); raf = requestAnimationFrame(frame) }
  raf = requestAnimationFrame(frame)
}
function skipPrep() { const t = Date.now(); go = t; end = t + secs.value * 1000; beeped.add('p1'); tick() }
function finish(held) {
  clearInterval(iv); iv = null; cancelAnimationFrame(raf)
  if (held >= 1) emit('save', held)
  if (held >= secs.value) {
    phase.value = 'done'
    once('end', () => { beep(1320, 160); setTimeout(() => beep(1760, 320), 200) })
    clearTimeout(doneT); doneT = setTimeout(() => emit('close'), 1600)
  } else emit('close')
}
function stop() { finish(Math.max(0, Math.floor((Date.now() - go) / 1000))) }

// dial: the knob follows the finger; it can't jump across the top from 120 to 0 (or back)
let dragging = false
function dialRaw(e) {
  const r = dialEl.value.getBoundingClientRect()
  const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) // 0 at top, clockwise
  const v = ((a + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * DIAL_MAX
  const prev = dial.value ?? secs.value
  if (Math.abs(v - prev) > DIAL_MAX / 2) return prev > DIAL_MAX / 2 ? DIAL_MAX : DIAL_MIN
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, v))
}
function dialSet(e) { const v = dialRaw(e); dial.value = v; secs.value = Math.round(v) }
function dialDown(e) { if (phase.value !== 'setup') return; dragging = true; e.target.setPointerCapture?.(e.pointerId); dialSet(e) }
function dialMove(e) { if (!dragging) return; e.preventDefault(); dialSet(e) }
function dialUp() { dragging = false; dial.value = null } // knob settles on the whole second

onUnmounted(() => {
  clearInterval(iv); clearTimeout(doneT); cancelAnimationFrame(raf)
  try { wake?.release() } catch {}
})
</script>

<style scoped>
.timer-screen { position: absolute; inset: 0; z-index: 110; display: flex; flex-direction: column; align-items: center; background: var(--app-bg);
  padding: calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(20px + env(safe-area-inset-bottom, 0px)); }
.tm-head { color: var(--app-muted); font-size: 15px; font-weight: 600; }
.tm-ring { position: relative; width: min(80vw, 310px); aspect-ratio: 1; margin: auto 0 0; touch-action: none; }
.tm-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); overflow: visible; }
.tm-ring circle { fill: none; stroke-width: 10; }
.tm-ring .bg { stroke: color-mix(in srgb, var(--c) 14%, transparent); }
.tm-ring .fg { stroke: var(--c); stroke-linecap: round; stroke-dasharray: 314.16; transition: stroke .2s; }
.tm-ring.ph-setup .fg { transition: stroke-dashoffset .25s cubic-bezier(.2,.8,.2,1); }
.tm-ring.dragging .fg, .tm-ring.dragging .knob-g { transition: none !important; }
.tm-ring .knob-g { transform-origin: 60px 60px; transform-box: view-box; transition: transform .25s cubic-bezier(.2,.8,.2,1); }
.tm-ring.ph-prep .fg { stroke: var(--app-faint); }
.tm-ring.ph-done .fg { stroke: var(--app-ok); }
.tm-ring .knob { fill: #fff; stroke: var(--c); stroke-width: 3.5; filter: drop-shadow(0 1px 3px rgba(0,0,0,.3)); }
.tm-val { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
.tm-val b { font-size: 92px; font-weight: 700; letter-spacing: -2px; line-height: 1; }
.tm-ring.ph-done .tm-val b { color: var(--app-ok); }
.tm-val span { margin-top: 6px; color: var(--app-muted); font-size: 16px; }
.tm-adj { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; width: 100%; margin: 22px 0 auto; }
.tm-adj button { height: 44px; border: 0; border-radius: 999px; background: var(--app-field); color: var(--ion-text-color);
  font-size: 16px; font-weight: 600; }
.tm-adj button:active { opacity: .6; }
.tm-goal { min-height: 44px; margin: 22px 0 auto; font-size: 17px; font-weight: 600; color: var(--app-muted); display: grid; place-items: center; }
.tm-btns { width: 100%; display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; }
.tm-btns button { height: 56px; border: 0; border-radius: 16px; font-size: 17px; font-weight: 600; }
.tm-cancel { background: var(--app-field); color: var(--ion-text-color); }
.tm-stop { background: var(--c); color: #fff; }
.tm-btns button:active { transform: scale(.97); }
</style>
