<!-- exercise catalogue: search / muscle group → base exercise → options (equipment, grip, position…) → pick.
     Also the user's own exercises (prop `own`) and a form to create one.
     Emits pick({ name, unit, main, help, range, own? }) and delOwn(id). -->
<template>
  <ion-modal :is-open="open" :initial-breakpoint="1" :breakpoints="[0, 1]" class="ex-sheet" :style="{ '--c': color }" @didDismiss="emit('close')">
    <div class="ep">
      <div class="ep-head">
        <button v-if="base || making" class="ep-back press" @click="base = null; making = false" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button>
        <b>{{ making ? 'Własne ćwiczenie' : base ? base.pl : 'Katalog ćwiczeń' }}</b>
        <button class="ep-x press" @click="emit('close')" aria-label="Zamknij"><ion-icon :icon="close" /></button>
      </div>

      <div v-if="making" class="ep-list ep-make">
        <label class="lbl">Nazwa<input v-model="mk.name" class="ep-search mk-in" maxlength="60" placeholder="np. Wyciskanie na mojej maszynie" /></label>
        <span class="lbl">Partia ciała</span>
        <div class="ochips"><button v-for="g in GROUPS" :key="g.k" class="ochip press" :class="{ on: mk.g === g.k }" @click="mk.g = g.k">{{ g.pl }}</button></div>
        <span class="lbl">Co zapisujesz</span>
        <div class="ochips"><button v-for="(t, u) in UNIT_TEXT" :key="u" class="ochip press" :class="{ on: mk.unit === u }" @click="mk.unit = u">{{ t }}</button></div>
        <span class="lbl">{{ mk.unit === 's' ? 'Zakres sekund' : 'Zakres powtórzeń' }}</span>
        <div class="mk-rng num"><input v-model.number="mk.lo" inputmode="numeric" aria-label="Od" /><span>–</span><input v-model.number="mk.hi" inputmode="numeric" aria-label="Do" /></div>
        <span class="lbl">Mięśnie (dotknij: główny → pomocniczy → brak)</span>
        <div class="ochips"><button v-for="(lbl, id) in MUSCLE_NAMES" :key="id" class="ochip mchip press" :class="{ on: mk.m[id] === 1, half: mk.m[id] === 2 }" @click="cycleM(id)">{{ lbl }}</button></div>
        <div class="card ep-prev">
          <div class="ep-map"><BodyMap :main="mkMain" :help="mkHelp" /></div>
          <div class="ep-info"><b class="ep-name" data-no-tr>{{ mk.name.trim() || 'Nowe ćwiczenie' }}</b><p>{{ mkMain.length ? mkMain.map(m => MUSCLE_NAMES[m]).join(', ') : 'Wybierz choć jeden główny mięsień' }}</p></div>
        </div>
        <p v-if="mkErr" class="mk-err">{{ mkErr }}</p>
      </div>

      <template v-else-if="!base">
        <input v-model="q" class="ep-search" type="search" placeholder="Szukaj, np. wyciskanie, przysiad…" />
        <div class="ep-groups">
          <button class="gchip press" :class="{ on: !grp }" @click="grp = ''">Wszystkie</button>
          <button v-for="g in GROUPS" :key="g.k" class="gchip press" :class="{ on: grp === g.k }" @click="grp = grp === g.k ? '' : g.k">{{ g.pl }}</button>
        </div>
        <div class="ep-list">
          <button class="ep-new press" @click="startMake"><ion-icon :icon="add" /> Utwórz własne ćwiczenie</button>
          <template v-if="ownShown.length">
            <h4>Moje ćwiczenia</h4>
            <div v-for="o in ownShown" :key="o.id" class="ep-row own">
              <button class="own-pick press" @click="pickOwn(o)"><b data-no-tr>{{ o.name }}</b><small>{{ (o.main || []).map(m => MUSCLE_NAMES[m]).join(', ') }} · {{ UNIT_TEXT[o.unit] }}</small></button>
              <button v-if="!usedNames.includes(o.name)" class="own-del press" @click="delOwn(o)" aria-label="Usuń własne ćwiczenie"><ion-icon :icon="trashOutline" /></button>
            </div>
          </template>
          <template v-for="sec in shown" :key="sec.k">
            <h4>{{ sec.pl }}</h4>
            <button v-for="b in sec.items" :key="b.id" class="ep-row press" @click="choose(b)">
              <span><b>{{ b.pl }}</b><small v-if="lang === 'pl' ? b.aka : b.akaEn" class="aka" data-no-tr>{{ lang === 'pl' ? 'potocznie: ' + b.aka : 'also called: ' + b.akaEn }}</small><small>{{ eqText(b) }}</small></span><ion-icon :icon="chevronForward" />
            </button>
          </template>
          <p v-if="!shown.length && !ownShown.length" class="ep-empty">Nic nie znaleziono. Utwórz własne ćwiczenie przyciskiem na górze.</p>
        </div>
      </template>

      <div v-else class="ep-list">
        <div v-for="ax in opts.axes" :key="ax" class="ep-axis">
          <span class="lbl">{{ AXES[ax].pl }}</span>
          <div class="ochips">
            <button v-for="k in opts.vals[ax]" :key="k" class="ochip press" :class="{ on: sel[ax] === k }" @click="setOpt(ax, k)">{{ AXES[ax].v[k][0] }}</button>
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
      </div>
      <div v-if="making" class="ep-foot"><button class="ep-pick press" @click="makeOwn">Utwórz i wybierz</button></div>
      <div v-else-if="base" class="ep-foot"><p class="ep-sum" data-no-tr>{{ lang === 'pl' ? res.name : res.nameEn }}</p><button class="ep-pick press" @click="pick">Wybierz</button></div>
    </div>
  </ion-modal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { IonModal, IonIcon } from '@ionic/vue'
import { close, chevronBack, chevronForward, add, trashOutline } from 'ionicons/icons'
import { BASES, GROUPS, AXES, axesOf, fullSel, compose, catalogEN, byName } from '../catalog'
import { MUSCLE_NAMES } from '../muscles'
import { lang, addPhrases } from '../i18n'
import BodyMap from './BodyMap.vue'
import { ask } from '../dialog'

const props = defineProps({ open: Boolean, color: String, current: { type: String, default: '' },
  own: { type: /** @type {import('vue').PropType<any[]>} */ (Array), default: () => [] }, usedNames: { type: /** @type {import('vue').PropType<string[]>} */ (Array), default: () => [] } })
const emit = defineEmits(['close', 'pick', 'delOwn'])
addPhrases(catalogEN())

const UNIT_TEXT = { kg: 'Ciężar (kg)', reps: 'Powtórzenia', s: 'Czas (s)' }
const q = ref(''), grp = ref('')
/** @type {import('vue').Ref<any>} */
const base = ref(null)
/** @type {Record<string, string>} */
const sel = reactive({})
// opening for an exercise from the catalogue starts on its own options, so it can be tweaked
watch(() => props.open, o => {
  if (!o) return
  q.value = ''; grp.value = ''; making.value = false
  const c = props.current && byName(props.current.trim())
  if (c) { choose(c.base); for (const k of Object.keys(sel)) delete sel[k]; Object.assign(sel, fullSel(c.base, c.sel)) } else base.value = null
})

// search ignores Polish letters and case; matches the Polish and English names
const fold = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l')
const shown = computed(() => {
  const words = fold(q.value.trim()).split(/\s+/).filter(Boolean)
  const hit = b => words.every(w => fold(b.pl + ' ' + b.en + ' ' + (b.aka || '') + ' ' + (b.akaEn || '') + ' ' + (b.k || '')).includes(w))
  return GROUPS.filter(g => !grp.value || g.k === grp.value)
    .map(g => ({ ...g, items: BASES.filter(b => b.g === g.k && hit(b)) }))
    .filter(g => g.items.length)
})
/** @type {import('vue').ComputedRef<any[]>} */
const ownShown = computed(() => {
  const words = fold(q.value.trim()).split(/\s+/).filter(Boolean)
  return props.own.filter(o => (!grp.value || o.g === grp.value) && words.every(w => fold(o.name).includes(w)))
})
function pickOwn(o) { emit('pick', { name: o.name, unit: o.unit, main: o.main || [], help: o.help || [], range: o.range || [8, 12] }); emit('close') }
async function delOwn(o) {
  const { role } = await ask({ icon: trashOutline, color: props.color, title: 'Usunąć własne ćwiczenie?', message: `„${o.name}” zniknie z katalogu po zapisaniu planu. Zrobione serie zostają w historii.`, buttons: [{ text: 'Usuń', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'del') emit('delOwn', o.id)
}

// creating an own exercise
const making = ref(false), mkErr = ref('')
const mk = reactive({ name: '', g: 'chest', unit: 'kg', lo: 8, hi: 12, m: /** @type {Record<string, number>} */ ({}) })
const mkMain = computed(() => Object.keys(mk.m).filter(k => mk.m[k] === 1))
const mkHelp = computed(() => Object.keys(mk.m).filter(k => mk.m[k] === 2))
function startMake() { Object.assign(mk, { name: q.value.trim(), g: grp.value || 'chest', unit: 'kg', lo: 8, hi: 12, m: {} }); mkErr.value = ''; making.value = true }
function cycleM(id) { const v = ((mk.m[id] || 0) + 1) % 3; const m = { ...mk.m, [id]: v }; if (!v) delete m[id]; mk.m = m }
function makeOwn() {
  const name = mk.name.trim().replace(/\s+/g, ' ')
  const err = !name ? 'Wpisz nazwę ćwiczenia.' : name.includes('·') ? 'Nazwa nie może zawierać znaku „·”.'
    : props.own.some(o => o.name.toLowerCase() === name.toLowerCase()) ? 'Masz już własne ćwiczenie o tej nazwie.'
    : byName(name) ? 'Takie ćwiczenie jest już w katalogu – wybierz je z listy.'
    : !mkMain.value.length ? 'Wybierz choć jeden główny mięsień.' : ''
  mkErr.value = err
  if (err) return
  let lo = Math.max(1, Math.round(+mk.lo || 1)), hi = Math.max(1, Math.round(+mk.hi || lo))
  if (hi < lo) [lo, hi] = [hi, lo]
  const rec = { id: 'u-' + Math.random().toString(36).slice(2, 10), name, g: mk.g, unit: mk.unit, main: mkMain.value, help: mkHelp.value, range: [lo, hi] }
  emit('pick', { name, unit: rec.unit, main: rec.main, help: rec.help, range: rec.range, own: rec })
  making.value = false
  emit('close')
}
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
.ex-sheet .ep-foot { padding: 8px 16px calc(12px + env(safe-area-inset-bottom, 0px)); border-top: .5px solid var(--app-line, rgba(0,0,0,.08)); background: var(--app-bg); }
.ex-sheet .ep-sum { margin: 0 2px 8px; font-size: 13px; color: var(--app-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ex-sheet .ep-new { display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; margin: 4px 0 6px; padding: 11px; border: 0; border-radius: 12px;
  font-size: 15px; font-weight: 600; color: var(--c); background: color-mix(in srgb, var(--c) 13%, var(--app-card)); }
.ex-sheet .ep-row.own { padding: 0; }
.ex-sheet .own-pick { flex: 1; min-width: 0; border: 0; background: none; color: inherit; text-align: left; padding: 11px 14px; }
.ex-sheet .own-del { flex: none; width: 44px; align-self: stretch; border: 0; background: none; color: var(--app-bad); font-size: 18px; }
.ex-sheet .ep-make .lbl { display: block; font-size: 13px; color: var(--app-muted); margin: 12px 4px 6px; }
.ex-sheet .mk-in { display: block; width: 100%; margin: 6px 0 0; }
.ex-sheet .mk-rng { display: flex; align-items: center; gap: 8px; width: 160px; height: 40px; padding: 0 10px; border-radius: 12px; background: var(--app-field); }
.ex-sheet .mk-rng input { width: 50px; border: 0; background: none; text-align: center; font: inherit; font-size: 17px; font-weight: 700; color: var(--ion-text-color); outline: none; }
.ex-sheet .ochip.half { background: color-mix(in srgb, var(--c) 25%, transparent); color: var(--c); }
.ex-sheet .mk-err { color: var(--app-bad); font-size: 14px; margin: 10px 4px; }
.ex-sheet .ep-pick { width: 100%; height: 50px; border: 0; border-radius: 14px; background: var(--c); color: #fff; font-size: 16px; font-weight: 600; }
</style>
