<!-- wheel picker for one set: kg with quarter steps; seconds and reps as whole numbers.
     Writes into the given sets array (this set, or this and the next ones) and emits done. -->
<template>
  <ion-modal :is-open="open" :initial-breakpoint="1" :breakpoints="[0, 1]" class="wheel-sheet" :style="{ '--c': color }" @didDismiss="emit('close')">
    <div class="sheet" v-if="g">
      <div class="sheet-head">
        <span>{{ g.label ? g.label + ' · ' : '' }}Seria {{ si + 1 }}{{ field === 'r' ? ' · powt.' : '' }}</span>
        <b class="num">{{ shownTxt }}</b>
        <ion-button fill="clear" :strong="true" :style="{ '--color': color }" @click="apply(false)">Gotowe</ion-button>
      </div>
      <ion-picker>
        <ion-picker-column :value="int" @ionChange="e => (int = +e.detail.value)">
          <ion-picker-column-option v-for="n in ints" :key="n" :value="n">{{ n }}</ion-picker-column-option>
        </ion-picker-column>
        <ion-picker-column v-if="UNITS[unit].frac" :value="frac" @ionChange="e => (frac = +e.detail.value)">
          <ion-picker-column-option v-for="f in FRACS" :key="f" :value="f">,{{ f === 0 ? '0' : String(f * 100).padStart(2, '0') }}</ion-picker-column-option>
        </ion-picker-column>
        <ion-picker-column value="u" :disabled="true">
          <ion-picker-column-option value="u">{{ UNITS[unit].short }}</ion-picker-column-option>
        </ion-picker-column>
      </ion-picker>
      <div class="quick">
        <button v-for="q in quick" :key="q" @click="set(val + q)" class="num">{{ q > 0 ? '+' : '−' }}{{ fmtNum(Math.abs(q)) }}</button>
      </div>
      <button class="apply-all" v-if="arr.length - si > 1" @click="apply(true)">Ustaw {{ shownTxt }} dla tej i kolejnych serii</button>
    </div>
  </ion-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { IonModal, IonButton, IonPicker, IonPickerColumn, IonPickerColumnOption } from '@ionic/vue'
import { UNITS, fmtNum } from '../../plan'
import { toU, fromU } from '../../units'

const props = defineProps({
  open: Boolean, color: String,
  g: Object, si: { type: Number, default: 0 }, field: { type: String, default: 'w' }, // 'w' value, 'r' reps
  arr: { type: Array, default: () => [] }, initial: { type: Number, default: 0 },
})
const emit = defineEmits(['close', 'done'])
const FRACS = [0, 0.25, 0.5, 0.75]
const int = ref(0), frac = ref(0)
const unit = computed(() => (props.field === 'r' ? 'reps' : props.g?.unit || 'kg'))
const ints = computed(() => Array.from({ length: UNITS[unit.value].max + 1 }, (_, i) => i))
const quick = computed(() => { const st = UNITS[unit.value].step; return [-2 * st, -st, st, 2 * st] })
const val = computed(() => int.value + (UNITS[unit.value].frac ? frac.value : 0))
function set(v) {
  const u = UNITS[unit.value]
  v = Math.max(0, Math.min(u.max, u.frac ? Math.round(v * 4) / 4 : Math.round(v)))
  int.value = Math.floor(v); frac.value = Math.round((v - Math.floor(v)) * 4) / 4
}
// kg values are shown and picked in the user's unit (kg or lb) and stored in kg
const isKg = () => unit.value === 'kg'
const shownTxt = computed(() => fmtNum(val.value) + ' ' + UNITS[unit.value].short) // val is already in the shown unit
watch(() => [props.open, props.g, props.si, props.field], () => { if (props.open) set(isKg() ? toU(props.initial) : props.initial) }, { immediate: true })
function apply(all) {
  const f = props.field, v = isKg() ? fromU(val.value) : val.value
  props.arr.forEach((x, i) => { if (i === props.si || (all && i > props.si)) x[f] = f === 'r' ? Math.max(1, v) : v })
  emit('done'); emit('close')
}
</script>

<style>
/* the sheet is moved out of the page when opened, so these must not be scoped */
.wheel-sheet { --height: auto; --background: var(--app-card); --border-radius: 22px; }
.wheel-sheet .sheet { padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }
.wheel-sheet .sheet-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 4px 0 4px; }
.wheel-sheet .sheet-head span { color: var(--app-muted); font-size: 15px; }
.wheel-sheet .sheet-head b { font-size: 20px; font-weight: 700; }
.wheel-sheet .sheet-head ion-button { justify-self: end; margin: 0; }
.wheel-sheet ion-picker { --highlight-background: var(--app-field); }
.wheel-sheet ion-picker-column-option { font-size: 22px; }
.wheel-sheet .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
.wheel-sheet .quick button { height: 44px; border: 0; border-radius: 999px; background: var(--app-field); color: var(--ion-text-color); font-size: 17px; font-weight: 600; }
.wheel-sheet .quick button:active { opacity: .6; }
.wheel-sheet .apply-all { width: 100%; margin-top: 10px; height: 50px; border: 0; border-radius: 14px; background: var(--c); color: #fff !important;
  font-size: 15px; font-weight: 600; }
</style>
