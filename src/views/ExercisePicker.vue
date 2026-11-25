<!-- exercise catalogue: search / muscle group → base exercise → options (equipment, grip, position…) → pick.
     Emits pick({ name, unit, main, help, range }). -->
<template>
  <ion-modal :is-open="open" :initial-breakpoint="1" :breakpoints="[0, 1]" class="ex-sheet" :style="{ '--c': color }" @didDismiss="emit('close')">
    <div class="ep">
      <div class="ep-head">
        <button v-if="base" class="ep-back press" @click="base = null" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button>
        <b>{{ base ? base.pl : 'Katalog ćwiczeń' }}</b>
        <button class="ep-x press" @click="emit('close')" aria-label="Zamknij"><ion-icon :icon="close" /></button>
      </div>

      <template v-if="!base">
        <input v-model="q" class="ep-search" type="search" placeholder="Szukaj, np. wyciskanie, przysiad…" />
        <div class="ep-groups">
          <button class="gchip press" :class="{ on: !grp }" @click="grp = ''">Wszystkie</button>
          <button v-for="g in GROUPS" :key="g.k" class="gchip press" :class="{ on: grp === g.k }" @click="grp = grp === g.k ? '' : g.k">{{ g.pl }}</button>
        </div>
        <div class="ep-list">
          <template v-for="sec in shown" :key="sec.k">
            <h4>{{ sec.pl }}</h4>
            <button v-for="b in sec.items" :key="b.id" class="ep-row press" @click="choose(b)">
              <span><b>{{ b.pl }}</b><small v-if="lang === 'pl' ? b.aka : b.akaEn" class="aka" data-no-tr>{{ lang === 'pl' ? 'potocznie: ' + b.aka : 'also called: ' + b.akaEn }}</small><small>{{ eqText(b) }}</small></span><ion-icon :icon="chevronForward" />
            </button>
          </template>
          <p v-if="!shown.length" class="ep-empty">Nic nie znaleziono. Wpisz własną nazwę w polu ćwiczenia.</p>
        </div>
      </template>

      <div v-else class="ep-list">
        <div v-for="ax in opts.axes" :key="ax" class="ep-axis">
          <span class="lbl">{{ AXES[ax].pl }}</span>
          <div class="ochips">
            <button v-for="k in base.o[ax]" :key="k" class="ochip press" :class="{ on: sel[ax] === k }" @click="setOpt(ax, k)">{{ AXES[ax].v[k][0] }}</button>
          </div>
        </div>
        <div v-if="opts.variants" class="ep-axis">
          <span class="lbl">Wariant</span>
          <div class="ochips">
            <button v-for="v in opts.variants" :key="v[0]" class="ochip press" :class="{ on: sel.v === v[0] }" @click="setOpt('v', v[0])">{{ v[1] }}</button>
          </div>
        </div>

        <div class="card ep-prev">
          <div class="ep-map"><BodyMap :main="res.main" :help="res.help" /></div>
          <div class="ep-info">
            <b class="ep-name" data-no-tr>{{ lang === 'pl' ? res.name : res.nameEn }}</b>
            <p><span class="dot m"></span>{{ res.main.map(m => MUSCLE_NAMES[m]).join(', ') }}</p>
            <p v-if="res.help.length"><span class="dot h"></span>{{ res.help.map(m => MUSCLE_NAMES[m]).join(', ') }}</p>
            <p class="unit"><span>{{ UNIT_TEXT[res.unit] }}</span><span class="num"> · {{ res.range[0] }}–{{ res.range[1] }}</span><span>{{ res.unit === 's' ? ' s' : ' powt.' }}</span></p>
          </div>
        </div>
        <p v-if="lang === 'pl' && base.aka" class="ep-how" data-no-tr>Potocznie: {{ base.aka }}<br>Po angielsku: {{ base.akaEn }}</p>
        <p v-else-if="base.akaEn" class="ep-how" data-no-tr>Also called: {{ base.akaEn }}</p>
        <p v-if="base.how" class="ep-how">{{ base.how[0] }}</p>
        <p v-if="res.assisted" class="ep-how">Wpisujesz ciężar wspomagania – mniej kg = trudniej.</p>
        <button class="ep-pick press" @click="pick">Wybierz</button>
      </div>
    </div>
  </ion-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { IonModal, IonIcon } from '@ionic/vue'
import { close, chevronBack, chevronForward } from 'ionicons/icons'
import { BASES, GROUPS, AXES, axesOf, fullSel, compose, catalogEN } from '../catalog'
import { MUSCLE_NAMES } from '../muscles'
import { lang, addPhrases } from '../i18n'
import BodyMap from './BodyMap.vue'

const props = defineProps({ open: Boolean, color: String })
const emit = defineEmits(['close', 'pick'])
addPhrases(catalogEN())

const UNIT_TEXT = { kg: 'Ciężar (kg)', reps: 'Powtórzenia', s: 'Czas (s)' }
const q = ref(''), grp = ref('')
/** @type {import('vue').Ref<any>} */
const base = ref(null)
/** @type {Record<string, string>} */
const sel = reactive({})
watch(() => props.open, o => { if (o) { base.value = null; q.value = '' } })

// search ignores Polish letters and case; matches the Polish and English names
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const shown = computed(() => {
  const words = fold(q.value.trim()).split(/\s+/).filter(Boolean)
  const hit = b => words.every(w => fold(b.pl + ' ' + b.en + ' ' + (b.aka || '') + ' ' + (b.akaEn || '') + ' ' + (b.k || '')).includes(w))
  return GROUPS.filter(g => !grp.value || g.k === grp.value)
    .map(g => ({ ...g, items: BASES.filter(b => b.g === g.k && hit(b)) }))
    .filter(g => g.items.length)
})
const eqText = b => b.o.eq.map(k => AXES.eq.v[k][0]).join(', ')

function choose(b) {
  for (const k of Object.keys(sel)) delete sel[k]
  Object.assign(sel, fullSel(b))
  base.value = b
}
function setOpt(ax, k) { const s = fullSel(base.value, { ...sel, [ax]: k }); for (const x of Object.keys(sel)) delete sel[x]; Object.assign(sel, s) }
const opts = computed(() => axesOf(base.value, sel))
const res = computed(() => compose(base.value, sel))
function pick() { const r = res.value; emit('pick', { name: r.name, unit: r.unit, main: r.main, help: r.help, range: r.range }); emit('close') }
</script>

<style>
/* the sheet is moved out of the page when opened, so these must not be scoped */
.ex-sheet { --height: 92%; --background: var(--app-bg); --border-radius: 22px; }
.ex-sheet .ep { display: flex; flex-direction: column; height: 100%; }
.ex-sheet .ep-head { display: grid; grid-template-columns: 44px 1fr 44px; align-items: center; padding: 12px 10px 6px; text-align: center; }
.ex-sheet .ep-head b { grid-column: 2; font-size: 17px; }
.ex-sheet .ep-back, .ex-sheet .ep-x { width: 34px; height: 34px; border: 0; border-radius: 50%; background: var(--app-field); color: var(--ion-text-color);
  display: grid; place-items: center; font-size: 18px; justify-self: center; }
.ex-sheet .ep-x { grid-column: 3; }
.ex-sheet .ep-search { margin: 4px 16px 8px; height: 40px; border: 0; border-radius: 12px; padding: 0 12px; background: var(--app-field);
  color: var(--ion-text-color); font-size: 16px; }
.ex-sheet .ep-groups { display: flex; gap: 6px; overflow-x: auto; padding: 0 16px 8px; scrollbar-width: none; }
.ex-sheet .gchip, .ex-sheet .ochip { flex: none; border: 0; border-radius: 999px; padding: 7px 12px; background: var(--app-field);
  color: var(--ion-text-color); font-size: 14px; font-weight: 500; }
.ex-sheet .gchip.on, .ex-sheet .ochip.on { background: var(--c); color: #fff; }
.ex-sheet .ep-list { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 0 16px calc(20px + env(safe-area-inset-bottom, 0px)); }
.ex-sheet h4 { margin: 14px 4px 6px; font-size: 15px; color: var(--app-muted); font-weight: 600; }
.ex-sheet .ep-row { width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px; text-align: left; border: 0;
  background: var(--app-card); color: var(--ion-text-color); padding: 11px 14px; border-radius: 0; border-bottom: .5px solid var(--app-line, rgba(0,0,0,.08)); }
.ex-sheet h4 + .ep-row { border-radius: 12px 12px 0 0; }
.ex-sheet .ep-row:last-child, .ex-sheet .ep-row:has(+ h4) { border-radius: 0 0 12px 12px; border-bottom: 0; }
.ex-sheet h4 + .ep-row:last-child, .ex-sheet h4 + .ep-row:has(+ h4) { border-radius: 12px; }
.ex-sheet .ep-row b { display: block; font-size: 16px; font-weight: 500; line-height: 1.3; }
.ex-sheet .ep-row small { display: block; margin-top: 2px; color: var(--app-muted); font-size: 13px; line-height: 1.3; }
.ex-sheet .ep-row small.aka { color: var(--ion-text-color); opacity: .6; }
.ex-sheet .ep-row ion-icon { color: var(--app-muted); flex: none; }
.ex-sheet .ep-empty { color: var(--app-muted); text-align: center; margin-top: 30px; }
.ex-sheet .ep-axis { margin: 10px 0 4px; }
.ex-sheet .ep-axis .lbl { display: block; font-size: 13px; color: var(--app-muted); margin: 0 4px 6px; }
.ex-sheet .ochips { display: flex; flex-wrap: wrap; gap: 6px; }
.ex-sheet .ep-prev { display: flex; gap: 12px; align-items: center; margin-top: 14px; padding: 12px; }
.ex-sheet .ep-map { height: 110px; flex: none; }
.ex-sheet .ep-info { min-width: 0; }
.ex-sheet .ep-name { display: block; font-size: 16px; line-height: 1.25; margin-bottom: 6px; }
.ex-sheet .ep-info p { margin: 3px 0; font-size: 13px; color: var(--app-muted); }
.ex-sheet .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; background: var(--c); }
.ex-sheet .dot.h { opacity: .4; }
.ex-sheet .ep-how { font-size: 14px; color: var(--app-muted); margin: 10px 4px; line-height: 1.4; }
.ex-sheet .ep-pick { width: 100%; height: 50px; border: 0; border-radius: 14px; background: var(--c); color: #fff; font-size: 16px; font-weight: 600; margin-top: 6px; }
</style>
