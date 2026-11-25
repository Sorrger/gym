<template>
  <ion-page>
    <ion-header class="sh-header">
      <ion-toolbar>
        <div class="sh-bar" :style="{ '--c': color }">
          <button class="rb press" @click="cancel" aria-label="Anuluj"><ion-icon :icon="close" /></button>
          <div class="sh-title"><b>{{ isNew ? 'Nowy trening' : 'Edytuj trening' }}</b><span>{{ name || 'Plan' }}</span></div>
          <div class="sh-right"><button class="save press" @click="save">Zapisz</button></div>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="page" :style="{ '--c': color }">
        <p class="info">Zmiany są tylko na tym telefonie (i w Twojej kopii na GitHubie). Ćwiczenie z nową nazwą zaczyna własną historię – stare treningi zostają.</p>
        <p v-if="openHere" class="info warn">Masz otwarty trening tego planu. Zaliczone serie zostaną, ale ćwiczenia usunięte z planu znikną z ekranu treningu.</p>

        <div class="card fields">
          <label>Nazwa planu<input v-model="name" maxlength="20" /></label>
          <label>Notatka<textarea v-model="note" rows="2" placeholder="np. kolejność, wskazówki" /></label>
          <span class="lbl">Kolor</span>
          <div class="cols">
            <button v-for="c in PALETTE" :key="c" class="col press" :class="{ on: color === c }" :style="{ background: c }" @click="pickColor(c)" :aria-label="'Kolor ' + c"></button>
          </div>
          <span class="lbl">Dni tygodnia (apka podpowie ten trening w te dni)</span>
          <div class="wds">
            <button v-for="w in WDS" :key="w.js" class="wd press" :class="{ on: wdSel.includes(w.js) }" @click="toggleWd(w.js)">
              <b>{{ w.t }}</b><small>{{ wdOwner(w.js) }}</small>
            </button>
          </div>
        </div>

        <div v-for="(e, i) in list" :key="e.id" class="card ex">
          <div class="ex-top">
            <span class="n num">{{ i + 1 }}</span>
            <b v-if="e.special" class="fixed">{{ e.name }}</b>
            <div class="ord">
              <button class="ib press" :disabled="i === 0" @click="move(i, -1)" aria-label="W górę"><ion-icon :icon="chevronUp" /></button>
              <button class="ib press" :disabled="i === list.length - 1" @click="move(i, 1)" aria-label="W dół"><ion-icon :icon="chevronDown" /></button>
              <button class="ib del press" @click="removeAt(i)" aria-label="Usuń"><ion-icon :icon="trashOutline" /></button>
            </div>
          </div>
          <input v-if="!e.special" v-model="e.name" class="name" :list="'known'" placeholder="Nazwa ćwiczenia (wpisz albo wybierz)" @change="nameChanged(e)" />
          <button v-if="!e.special" class="cat press" @click="pickFor = e"><ion-icon :icon="libraryOutline" /> Wybierz z katalogu</button>
          <p v-if="e.special" class="spec">{{ e.specialText }} – można tylko przesunąć albo usunąć.</p>
          <template v-else>
            <div class="row3">
              <div class="stp"><small>Serie</small>
                <div class="st"><button class="press" @click="e.sets = Math.max(1, e.sets - 1)">−</button><b class="num">{{ e.sets }}</b><button class="press" @click="e.sets = Math.min(8, e.sets + 1)">+</button></div>
              </div>
              <div class="stp"><small>{{ e.unit === 's' ? 'Sekundy' : 'Powtórzenia' }}</small>
                <div class="rng num"><input v-model.number="e.lo" inputmode="numeric" /><span>–</span><input v-model.number="e.hi" inputmode="numeric" /></div>
              </div>
            </div>
            <div class="seg">
              <button v-for="u in UNITS_ED" :key="u.v" class="press" :class="{ on: e.unit === u.v }" @click="e.unit = u.v">{{ u.t }}</button>
            </div>
            <div class="alts">
              <span class="lbl">Zamienniki (gdy maszyna zajęta)</span>
              <div class="alt-chips">
                <span v-for="(a, k) in e.alts" :key="a" class="alt-chip">{{ a }}<button class="press" @click="e.alts.splice(k, 1)" aria-label="Usuń zamiennik">×</button></span>
              </div>
              <div class="alt-add">
                <input v-model="e.altNew" list="known" placeholder="Dodaj zamiennik…" @keyup.enter="addAlt(e)" />
                <button class="press" :disabled="!e.altNew.trim()" @click="addAlt(e)">Dodaj</button>
              </div>
            </div>
            <button class="mus press" @click="e.open = !e.open">
              <span>Mięśnie: <b>{{ musText(e) }}</b></span><ion-icon :icon="e.open ? chevronUp : chevronDown" />
            </button>
            <div v-if="e.open" class="chips">
              <button v-for="(lbl, id) in MUSCLE_NAMES" :key="id" class="chip press" :class="{ m: e.m[id] === 1, h: e.m[id] === 2 }" @click="cycle(e, id)">{{ lbl }}</button>
              <p class="legend">Dotknij: <i class="m">główny</i> → <i class="h">pomocniczy</i> → brak</p>
            </div>
          </template>
        </div>

        <button class="add press" @click="addEx(); pickFor = list[list.length - 1]"><ion-icon :icon="add" /> Dodaj ćwiczenie</button>
        <button v-if="isCustom && DEFAULT_PLAN[day]" class="reset press" @click="reset">Przywróć wersję podstawową „{{ DEFAULT_PLAN[day].name }}”</button>
        <button v-if="!isNew" class="reset press" @click="removePlan">Usuń ten trening</button>
        <ExercisePicker :open="!!pickFor" :color="color" @close="pickFor = null" @pick="picked" />
        <datalist id="known"><option v-for="k in known" :key="k" :value="k" /></datalist>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { close, chevronUp, chevronDown, trashOutline, add, libraryOutline } from 'ionicons/icons'
import ExercisePicker from './ExercisePicker.vue'
import { PLAN, COLORS, PALETTE, DEFAULT_PLAN, rangeOf, nSets, ALT, altOf, WEEKDAY_TO_DAY, visiblePlans } from '../plan'
import { MUSCLES, MUSCLE_NAMES } from '../muscles'
import { custom, savePlan } from '../customPlan'
import { activeSession } from '../store'
import { ask } from '../dialog'

const route = useRoute(), router = useIonRouter()
const isNew = route.params.day === 'new'
const day = isNew ? PLAN.length : +route.params.day
const plan = PLAN[day]
const ownColor = ref(custom.data?.days?.[day]?.color || '')
const color = computed(() => ownColor.value || COLORS[plan?.key] || PALETTE[day % PALETTE.length])
const pickColor = c => { ownColor.value = c }
const fromPlans = route.query.from === 'plans' || isNew
const back = () => (fromPlans ? '#/plans' : '#/plan/' + day)
const WDS = [1, 2, 3, 4, 5, 6, 0].map(js => ({ js, t: ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb'][js] }))
const wdSel = ref(Object.keys(WEEKDAY_TO_DAY).filter(k => WEEKDAY_TO_DAY[k] === day).map(Number))
const toggleWd = js => { const i = wdSel.value.indexOf(js); if (i >= 0) wdSel.value.splice(i, 1); else wdSel.value.push(js) }
// which other training this weekday belongs to now (picking it here moves it)
const wdOwner = js => { const o = WEEKDAY_TO_DAY[js]; return wdSel.value.includes(js) ? '✓' : o != null && o !== day && PLAN[o] ? PLAN[o].name : '' }
const UNITS_ED = [{ v: 'kg', t: 'Ciężar (kg)' }, { v: 'reps', t: 'Powtórzenia' }, { v: 's', t: 'Czas (s)' }]
const known = [...new Set([...Object.keys(MUSCLES), ...Object.values(ALT).flat()])].sort((a, b) => a.localeCompare(b, 'pl'))
const openHere = activeSession()?.day === day
const isCustom = !!custom.data?.days?.[day]

let uid = 0
function musOf(name) { const [m = [], h = []] = MUSCLES[name] || []; const o = {}; h.forEach(x => (o[x] = 2)); m.forEach(x => (o[x] = 1)); return o }
// one editable row per plan entry; multi-part ones (pull-up stages etc.) are kept as they are
function toRow(ex) {
  const [nm, target, tag, parts] = ex
  if (parts && typeof parts !== 'string' || parts === 'stages') return { id: ++uid, special: true, raw: ex, name: nm, specialText: parts === 'stages' ? 'Etapy zmieniają się same' : 'Ćwiczenie z kilku części' }
  const r = rangeOf(target) || { lo: 8, hi: 12 }
  const rest = String(target || '').replace(/^\s*\d+(?:-\d+)?\s*×\s*\d+(?:\s*-\s*\d+)?\s*s?/, '') // e.g. " / stronę"
  return { id: ++uid, alts: [...altOf(nm)], altNew: '', name: nm, orig: nm, tag, sets: nSets(target || '3'), lo: r.lo, hi: r.hi, unit: typeof parts === 'string' ? parts : 'kg', rest, m: musOf(nm), mTouched: false, open: !MUSCLES[nm] }
}
const name = ref(plan?.name || ''), note = ref(plan?.note || '')
/** @type {import('vue').Ref<any[]>} */
const list = ref(plan ? plan.ex.map(toRow) : [])
if (!list.value.length) addEx()

/** @type {import('vue').Ref<any>} */
const pickFor = ref(null)
function picked(r) {
  const e = pickFor.value
  if (!e) return
  const o = {}; r.help.forEach(x => (o[x] = 2)); r.main.forEach(x => (o[x] = 1))
  Object.assign(e, { name: r.name, unit: r.unit, lo: r.range[0], hi: r.range[1], m: MUSCLES[r.name] ? musOf(r.name) : o, mTouched: !MUSCLES[r.name], open: false })
}
function nameChanged(e) { if (!e.mTouched) { e.m = musOf(e.name.trim()); if (!MUSCLES[e.name.trim()]) e.open = true } }
function cycle(e, id) { e.mTouched = true; e.m = { ...e.m, [id]: ((e.m[id] || 0) + 1) % 3 }; if (!e.m[id]) delete e.m[id] }
const musText = e => { const m = Object.keys(e.m).filter(k => e.m[k] === 1).map(k => MUSCLE_NAMES[k]); return m.length ? m.join(', ') : 'wybierz' }
function move(i, d) { const a = list.value; [a[i], a[i + d]] = [a[i + d], a[i]] }
async function removeAt(i) {
  const e = list.value[i]
  const { role } = await ask({ icon: trashOutline, color: color.value, title: 'Usunąć z planu?', message: `${e.name || 'To ćwiczenie'} zniknie z planu. Historia zostaje.`, buttons: [{ text: 'Usuń', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'del') list.value.splice(i, 1)
}
function addAlt(e) { const n = e.altNew.trim().replace(/\s+/g, ' ').replace(/·/g, '-'); if (n && n !== e.name.trim() && !e.alts.includes(n)) e.alts.push(n); e.altNew = '' }
function addEx() { list.value.push({ id: ++uid, alts: [], altNew: '', name: '', sets: 3, lo: 8, hi: 12, unit: 'kg', rest: '', m: {}, mTouched: false, open: true }) }

function build() {
  const names = new Set(), muscles = { ...(custom.data?.muscles || {}) }, alts = JSON.parse(JSON.stringify(ALT))
  const ex = []
  for (const e of list.value) {
    if (e.special) { ex.push(e.raw); names.add(e.name); continue }
    const nm = e.name.trim().replace(/\s+/g, ' ')
    if (!nm) throw new Error('Każde ćwiczenie musi mieć nazwę.')
    if (nm.includes('·')) throw new Error('Nazwa nie może zawierać znaku „·”.')
    if (names.has(nm)) throw new Error(`„${nm}” jest w planie dwa razy.`)
    names.add(nm)
    let lo = Math.max(1, Math.round(+e.lo || 1)), hi = Math.max(1, Math.round(+e.hi || lo))
    if (hi < lo) [lo, hi] = [hi, lo] // typed 12–8
    const target = `${e.sets} × ${lo}${hi > lo ? '-' + hi : ''}${e.unit === 's' ? ' s' : ''}${e.rest || ''}`
    const row = [nm, target, nm === e.orig ? e.tag ?? null : null]
    if (e.unit !== 'kg') row.push(e.unit)
    ex.push(row)
    const m = Object.keys(e.m).filter(k => e.m[k] === 1), h = Object.keys(e.m).filter(k => e.m[k] === 2)
    const def = MUSCLES[nm]
    if (e.mTouched || !def) { if (m.length || h.length || def) muscles[nm] = [m, h] }
    alts[nm] = e.alts.filter(a => a !== nm)
  }
  if (!ex.length) throw new Error('Trening musi mieć choć jedno ćwiczenie.')
  return { ex, muscles, alts }
}

async function save() {
  let b
  try { b = build() } catch (err) { await ask({ icon: close, color: color.value, title: 'Popraw plan', message: err.message, buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] }); return }
  const days = Array.from({ length: Math.max(PLAN.length, day + 1) }, (_, i) => custom.data?.days?.[i] || null)
  days[day] = { name: name.value.trim() || DEFAULT_PLAN[day]?.name || 'Trening ' + (day + 1), note: note.value.trim(), ex: b.ex, ...(ownColor.value ? { color: ownColor.value } : {}) }
  await savePlan({ ...(custom.data || {}), days, muscles: b.muscles, alts: b.alts, wd: wdMap() }, back())
}
function wdMap(without = false) {
  const wd = { ...WEEKDAY_TO_DAY }
  for (const k of Object.keys(wd)) if (wd[k] === day) delete wd[k]
  if (!without) for (const js of wdSel.value) wd[js] = day
  return wd
}
async function removePlan() {
  if (visiblePlans().length <= 1) { await ask({ icon: close, color: color.value, title: 'To jedyny trening', message: 'Musi zostać choć jeden trening. Dodaj inny, zanim usuniesz ten.', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] }); return }
  const { role } = await ask({ icon: trashOutline, color: color.value, title: `Usunąć trening „${plan.name}”?`, message: 'Zniknie ze Startu i z planu. Zrobione treningi zostają w historii.', buttons: [{ text: 'Usuń trening', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role !== 'del') return
  const days = Array.from({ length: PLAN.length }, (_, i) => custom.data?.days?.[i] || null)
  days[day] = { name: plan.name, note: plan.note, ex: plan.ex, hidden: true }
  await savePlan({ ...(custom.data || {}), days, wd: wdMap(true) }, '#/plans')
}
async function reset() {
  const { role } = await ask({ icon: trashOutline, color: color.value, title: 'Przywrócić wersję podstawową?', message: `Plan „${DEFAULT_PLAN[day].name}” wróci do wersji z planu podstawowego. Historia treningów zostaje.`, buttons: [{ text: 'Przywróć', role: 'ok', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role !== 'ok') return
  const days = Array.from({ length: PLAN.length }, (_, i) => (i === day ? null : custom.data?.days?.[i] || null))
  await savePlan({ ...(custom.data || {}), days }, back())
}
function cancel() { if (router.canGoBack()) router.back(); else router.navigate(back().slice(1), 'back', 'replace') }
</script>

<style scoped>
.sh-header ion-toolbar { --background: var(--app-bg); --border-width: 0 !important; --min-height: 56px; }
.sh-header::after { display: none; }
.sh-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 6px 14px; }
.sh-title { text-align: center; display: flex; flex-direction: column; line-height: 1.15; }
.sh-title b { font-size: 17px; font-weight: 700; }
.sh-title span { font-size: 12.5px; color: var(--app-muted); }
.sh-right { display: flex; justify-content: flex-end; }
.rb { width: 38px; height: 38px; border-radius: 50%; border: 0; display: grid; place-items: center; padding: 0; background: var(--app-card); color: var(--ion-text-color); }
.rb ion-icon { font-size: 21px; }
.save { border: 0; border-radius: 999px; padding: 9px 16px; font: inherit; font-weight: 700; color: #fff; background: var(--c); }
.page { padding-bottom: 40px; }
.info { margin: 4px 20px 12px; font-size: 13.5px; color: var(--app-muted); line-height: 1.35; }
.info.warn { color: #ff9f0a; }
.fields label { display: block; font-size: 13px; color: var(--app-muted); margin-bottom: 10px; }
.fields input, .fields textarea, .name { display: block; width: 100%; margin-top: 4px; border: 0; border-radius: 10px; padding: 9px 11px; font: inherit; font-size: 16px; color: var(--ion-text-color); background: var(--app-field); outline: none; resize: none; }
.ex { padding: 12px; }
.ex-top { display: flex; align-items: center; gap: 8px; }
.n { width: 24px; height: 24px; flex: none; border-radius: 50%; display: grid; place-items: center; font-size: 12.5px; font-weight: 700; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
.name { margin-top: 10px; font-weight: 600; }
.cat { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; border: 0; border-radius: 999px; padding: 7px 12px; font-size: 14px; font-weight: 600;
  color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.fixed { flex: 1; min-width: 0; font-size: 16px; }
.ord { display: flex; gap: 4px; flex: none; margin-left: auto; }
.ib { width: 34px; height: 34px; border: 0; border-radius: 10px; display: grid; place-items: center; background: var(--app-field); color: var(--ion-text-color); font-size: 17px; padding: 0; }
.ib:disabled { opacity: .3; }
.ib.del { color: var(--app-bad); }
.spec { margin: 8px 2px 0 32px; font-size: 13px; color: var(--app-muted); }
.row3 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.stp small { display: block; font-size: 12px; color: var(--app-muted); margin-bottom: 4px; }
.st, .rng { display: flex; align-items: center; justify-content: space-between; height: 40px; border-radius: 10px; background: var(--app-field); padding: 0 4px; }
.st button { width: 34px; height: 32px; border: 0; border-radius: 8px; font-size: 20px; background: var(--app-card); color: var(--c); }
.st b { font-size: 17px; }
.rng input { width: 44%; border: 0; background: none; text-align: center; font: inherit; font-size: 17px; font-weight: 700; color: var(--ion-text-color); outline: none; }
.rng span { color: var(--app-muted); }
.seg { display: flex; gap: 4px; margin-top: 10px; padding: 3px; border-radius: 10px; background: var(--app-field); }
.seg button { flex: 1; border: 0; border-radius: 8px; padding: 7px 2px; font: inherit; font-size: 13px; font-weight: 600; background: none; color: var(--ion-text-color); }
.seg button.on { background: var(--app-card); color: var(--c); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.mus { display: flex; justify-content: space-between; align-items: center; width: 100%; margin-top: 10px; padding: 4px 2px; border: 0; background: none; font: inherit; font-size: 13.5px; color: var(--app-muted); text-align: left; }
.mus b { color: var(--ion-text-color); font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.chip { border: 0; border-radius: 999px; padding: 6px 11px; font: inherit; font-size: 13px; background: var(--app-field); color: var(--ion-text-color); }
.chip.m { background: var(--c); color: #fff; }
.chip.h { background: color-mix(in srgb, var(--c) 25%, transparent); color: var(--c); }
.legend { width: 100%; margin: 4px 2px 0; font-size: 12px; color: var(--app-muted); }
.legend i { font-style: normal; font-weight: 600; }
.legend .m, .legend .h { color: var(--c); }
.lbl { display: block; font-size: 13px; color: var(--app-muted); margin: 2px 0 6px; }
.wds { display: flex; gap: 4px; }
.wd { flex: 1 1 0; min-width: 0; min-height: 46px; border: 0; border-radius: 10px; padding: 4px 1px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  font: inherit; background: var(--app-field); color: var(--ion-text-color); }
.wd b { font-size: 14px; }
.wd small { font-size: 9.5px; color: var(--app-muted); max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.wd.on { background: var(--c); color: #fff; }
.wd.on small { color: rgba(255,255,255,.85); }
.alts { margin-top: 12px; }
.alt-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.alt-chip { display: inline-flex; align-items: center; gap: 4px; padding: 5px 6px 5px 11px; border-radius: 999px; font-size: 13px; background: color-mix(in srgb, var(--c) 13%, transparent); }
.alt-chip button { border: 0; background: none; font-size: 17px; line-height: 1; color: var(--app-muted); padding: 0 4px; }
.alt-add { display: flex; gap: 6px; margin-top: 6px; }
.alt-add input { flex: 1; min-width: 0; border: 0; border-radius: 10px; padding: 8px 10px; font: inherit; font-size: 15px; color: var(--ion-text-color); background: var(--app-field); outline: none; }
.alt-add button { border: 0; border-radius: 10px; padding: 0 14px; font: inherit; font-weight: 600; color: var(--c); background: color-mix(in srgb, var(--c) 13%, var(--app-card)); }
.alt-add button:disabled { opacity: .4; }
.add, .reset { display: flex; align-items: center; justify-content: center; gap: 6px; width: calc(100% - 32px); margin: 4px 16px 10px; padding: 13px; border: 0; border-radius: 14px; font: inherit; font-size: 16px; font-weight: 600; color: var(--c); background: color-mix(in srgb, var(--c) 13%, var(--app-card)); }
.reset { color: var(--app-bad); background: none; font-size: 14.5px; }
.cols { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 14px; }
.col { width: 32px; height: 32px; border-radius: 50%; border: 0; box-shadow: inset 0 0 0 2px rgba(255,255,255,.25); transition: transform .15s; }
.col.on { transform: scale(1.12); box-shadow: 0 0 0 3px var(--app-card), 0 0 0 5px currentColor; color: var(--ion-text-color); }
</style>
