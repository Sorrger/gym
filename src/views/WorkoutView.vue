<template>
  <ion-page :style="{ '--c': color }">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" text="Start" :style="{ color }" /></ion-buttons>
        <ion-title>{{ plan?.name }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="askDelete" aria-label="Usuń trening" :style="{ '--color': '#e8453c' }"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-button><ion-button :strong="true" :style="{ '--color': color }" @click="finish">{{ s?.finished ? 'Gotowe' : 'Zakończ' }}</ion-button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="s" class="dots-bar">
        <div class="dots">
          <button v-for="(ex, i) in plan.ex" :key="ex[0]" class="dot" :class="{ on: i === idx, done: isComplete(i) }"
            @click="go(i)" :aria-label="'Ćwiczenie ' + (i + 1)">
            <ion-icon v-if="isComplete(i)" :icon="checkmark" /><span v-else>{{ i + 1 }}</span>
          </button>
        </div>
        <div class="prog"><div :style="{ width: progPct + '%' }"></div></div>
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false" v-if="s">
      <div class="swipe" @touchstart.passive="tStart" @touchend.passive="tEnd">
        <Transition :name="dir" mode="out-in">
          <div class="ex" :key="exName">
            <div class="ex-meta">
              <span>Ćwiczenie {{ idx + 1 }} z {{ plan.ex.length }}</span>
              <span v-if="s.finished" class="edit-chip"><ion-icon :icon="createOutline" /> Edycja · {{ fmtDate(s.date) }}</span>
            </div>
            <h1>{{ exName }}</h1>
            <div class="ex-sub">
              <span class="target">{{ exTarget }}</span>
              <span v-if="exTag" class="tag">{{ exTag }}</span>
            </div>
            <div class="groups" :class="{ multi: groups.length > 1 }">
              <div class="group" v-for="g in groups" :key="g.key">
                <div v-if="g.label" class="g-head">
                  <b>{{ g.label }}</b><span class="g-target">{{ g.target }}</span>
                </div>
                <div class="last num">
                  <ion-icon :icon="timeOutline" />
                  {{ lastText(g) }}
                </div>
                <div class="sets">
                  <div class="set" v-for="(x, si) in sets(g.key)" :key="si" :class="{ d: x.d }">
                    <span class="idx">{{ si + 1 }}</span>
                    <button class="step num" @click="step(g, si, -1)" :aria-label="'Minus ' + fmtNum(UNITS[g.unit].step)">−{{ fmtNum(UNITS[g.unit].step) }}</button>
                    <button class="weight num" @click="openPicker(g, si)">
                      <b>{{ x.w == null ? '—' : fmtNum(x.w) }}</b><small>{{ UNITS[g.unit].short }}</small>
                    </button>
                    <button class="step num" @click="step(g, si, 1)" :aria-label="'Plus ' + fmtNum(UNITS[g.unit].step)">+{{ fmtNum(UNITS[g.unit].step) }}</button>
                    <button class="check" @click="toggle(g, si)" :aria-pressed="x.d" aria-label="Seria zrobiona">
                      <ion-icon :icon="checkmark" />
                    </button>
                  </div>
                </div>
                <div class="ex-foot">
                  <button class="link" @click="addSet(g)">+ Dodaj serię</button>
                  <button class="link" v-if="sets(g.key).length > 1" @click="popSet(g)">− Usuń serię</button>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <!-- weight wheel -->
      <ion-modal :is-open="pickerOpen" :initial-breakpoint="1" :breakpoints="[0, 1]" class="wheel-sheet" :style="{ '--c': color }" @didDismiss="pickerOpen = false">
        <div class="sheet">
          <div class="sheet-head">
            <span>{{ pickG?.label ? pickG.label + ' · ' : '' }}Seria {{ pickSet + 1 }}</span>
            <b class="num">{{ fmtVal(pickVal, pickUnit) }}</b>
            <ion-button fill="clear" :strong="true" :style="{ '--color': color }" @click="applyPick(false)">Gotowe</ion-button>
          </div>
          <ion-picker>
            <ion-picker-column :value="pickInt" @ionChange="e => (pickInt = +e.detail.value)">
              <ion-picker-column-option v-for="n in ints" :key="n" :value="n">{{ n }}</ion-picker-column-option>
            </ion-picker-column>
            <ion-picker-column v-if="UNITS[pickUnit].frac" :value="pickFrac" @ionChange="e => (pickFrac = +e.detail.value)">
              <ion-picker-column-option v-for="f in fracs" :key="f" :value="f">,{{ f === 0 ? '0' : String(f * 100).padStart(2, '0') }}</ion-picker-column-option>
            </ion-picker-column>
            <ion-picker-column value="u" :disabled="true">
              <ion-picker-column-option value="u">{{ UNITS[pickUnit].short }}</ion-picker-column-option>
            </ion-picker-column>
          </ion-picker>
          <div class="quick">
            <button v-for="q in quickSteps" :key="q" @click="bump(q)" class="num">{{ q > 0 ? '+' : '−' }}{{ fmtNum(Math.abs(q)) }}</button>
          </div>
          <button class="apply-all" v-if="pickG && sets(pickG.key).length - pickSet > 1" @click="applyPick(true)">Ustaw {{ fmtVal(pickVal, pickUnit) }} dla tej i kolejnych serii</button>
        </div>
      </ion-modal>
    </ion-content>

    <ion-footer v-if="s" class="ion-no-border">
      <div class="nav">
        <button class="nav-btn ghost" :disabled="idx === 0" @click="go(idx - 1)"><ion-icon :icon="chevronBack" /> Wstecz</button>
        <button class="nav-btn" v-if="idx < plan.ex.length - 1" @click="go(idx + 1)">Dalej <ion-icon :icon="chevronForward" /></button>
        <button class="nav-btn" v-else @click="finish">{{ s.finished ? 'Gotowe' : 'Zakończ trening' }}</button>
      </div>
    </ion-footer>

    <!-- end-of-workout screen -->
    <Transition name="rise">
      <div v-if="summary && s" class="done-screen">
        <div class="done-hero">
          <div class="done-badge"><ion-icon :icon="trophy" /></div>
          <h1>{{ c.n ? 'Trening zrobiony!' : 'Nic nie odhaczone' }}</h1>
          <p>{{ plan.name }} · {{ niceDate }}</p>
          <div class="done-stats">
            <div><b class="num">{{ c.n }}<small>/{{ c.t }}</small></b><span>serii</span></div>
            <div><b class="num">{{ exDone }}<small>/{{ plan.ex.length }}</small></b><span>ćwiczeń</span></div>
            <div><b class="num">{{ prs.length }}</b><span>{{ prs.length === 1 ? 'rekord' : 'rekordy' }}</span></div>
          </div>
        </div>
        <div class="done-list">
          <div class="done-row" v-for="r in rows" :key="r.key" :class="{ skip: !r.done }">
            <span class="dn">{{ r.name }}<template v-if="r.label"> · {{ r.label }}</template></span>
            <span class="dw num">
              <span v-if="r.pr" class="pr">REKORD</span>
              {{ !r.done ? 'pominięte' : r.max == null ? 'zrobione' : fmtVal(r.max, r.unit) }}
            </span>
          </div>
        </div>
        <div class="done-foot">
          <button class="save-btn" @click="save">{{ c.n ? 'Zapisz trening' : 'Wyjdź bez zapisu' }}</button>
          <button class="back-btn" @click="summary = false">Wróć do treningu</button>
        </div>
      </div>
    </Transition>
  </ion-page>
</template>

<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonBackButton, IonIcon, IonFooter,
  IonModal, IonPicker, IonPickerColumn, IonPickerColumnOption, useIonRouter, alertController } from '@ionic/vue'
import { checkmark, trophy, trashOutline, createOutline, timeOutline, chevronBack, chevronForward } from 'ionicons/icons'
import { PLAN, COLORS, UNITS, groupsOf, entriesOf, fmtNum, fmtVal } from '../plan'
import { state, lastFor, finishSession, remove, fmtShort, fmtDate, counts, ago, sorted } from '../store'

const route = useRoute()
const router = useIonRouter()
const s = computed(() => state.sessions[route.params.id])
// workout gone (deleted, or auto-closed after 12 h): leave once, after Ionic has finished setting up this page,
// navigating during page setup corrupts the router and can freeze the tab bar
let leaving = false
watchEffect(() => {
  if (leaving || !state.ready || !route.params.id || s.value || !route.path.startsWith('/workout')) return
  leaving = true
  setTimeout(() => router.navigate('/tabs/home', 'back', 'replace'), 300)
})
const plan = computed(() => (s.value ? PLAN[s.value.day] : null))
const color = computed(() => COLORS[plan.value?.key] || '#2f4bd8')
const progPct = computed(() => { const k = counts(s.value); return k.t ? k.n / k.t * 100 : 0 })

const idx = computed(() => Math.min(s.value?.cur || 0, plan.value.ex.length - 1))
const exName = computed(() => plan.value.ex[idx.value][0])
const exTarget = computed(() => plan.value.ex[idx.value][1])
const exTag = computed(() => plan.value.ex[idx.value][2])
const groups = computed(() => groupsOf(plan.value.ex[idx.value]))
function sets(key) {
  if (!s.value.ex[key]) s.value.ex[key] = [{ w: null, d: false }]
  return s.value.ex[key]
}
const isComplete = i => groupsOf(plan.value.ex[i]).every(g => (s.value.ex[g.key] || []).length > 0 && s.value.ex[g.key].every(x => x.d))
const touch = () => { s.value.updated = Date.now() }

const dir = ref('next')
function go(i) {
  if (i < 0 || i >= plan.value.ex.length || i === idx.value) return
  dir.value = i > idx.value ? 'next' : 'prev'
  s.value.cur = i
}
let tx = 0, ty = 0
function tStart(e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY }
function tEnd(e) {
  const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty
  if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.5) go(idx.value + (dx < 0 ? 1 : -1))
}

function lastText(g) {
  const p = lastFor(g.key, s.value)
  if (!p) return g.unit === 'kg' ? 'Pierwszy raz. Ustaw ciężar dla serii.' : 'Pierwszy raz. Ustaw wartość dla serii.'
  return 'Ostatnio ' + fmtShort(p.date) + ' (' + ago(p.date) + '): ' + p.ex[g.key].filter(x => x.d && x.w != null).map(x => fmtNum(x.w)).join(' · ') + ' ' + UNITS[g.unit].short
}

function toggle(g, si) {
  const x = sets(g.key)[si]
  x.d = !x.d; touch()
  if (x.d && isComplete(idx.value) && idx.value < plan.value.ex.length - 1) {
    const at = idx.value
    setTimeout(() => { if (idx.value === at && !summary.value && isComplete(at)) go(at + 1) }, 650)
  }
}
function step(g, si, dirn) {
  const a = sets(g.key), x = a[si], u = UNITS[g.unit]
  const base = x.w ?? [...a].slice(0, si).reverse().find(y => y.w != null)?.w ?? 0
  x.w = Math.max(0, Math.min(u.max, Math.round((base + dirn * u.step) * 4) / 4)); touch()
}
function addSet(g) { const a = sets(g.key); a.push({ w: a.length ? a[a.length - 1].w : null, d: false }); touch() }
function popSet(g) { sets(g.key).pop(); touch() }

// value picker (kg with quarter steps; seconds and reps as whole numbers)
const fracs = [0, 0.25, 0.5, 0.75]
const pickerOpen = ref(false), pickSet = ref(0), pickInt = ref(0), pickFrac = ref(0), pickG = ref(null)
const pickUnit = computed(() => pickG.value?.unit || 'kg')
const ints = computed(() => Array.from({ length: UNITS[pickUnit.value].max + 1 }, (_, i) => i))
const quickSteps = computed(() => { const st = UNITS[pickUnit.value].step; return [-2 * st, -st, st, 2 * st] })
const pickVal = computed(() => pickInt.value + (UNITS[pickUnit.value].frac ? pickFrac.value : 0))
function setPick(v) {
  const u = UNITS[pickUnit.value]
  v = Math.max(0, Math.min(u.max, u.frac ? Math.round(v * 4) / 4 : Math.round(v)))
  pickInt.value = Math.floor(v); pickFrac.value = Math.round((v - Math.floor(v)) * 4) / 4
}
function openPicker(g, si) {
  pickG.value = g; pickSet.value = si
  const a = sets(g.key)
  let w = a[si].w
  if (w == null) w = [...a].slice(0, si).reverse().find(x => x.w != null)?.w ?? lastFor(g.key, s.value)?.ex[g.key]?.[0]?.w ?? (g.unit === 'reps' ? 3 : 20)
  setPick(w)
  pickerOpen.value = true
}
function bump(q) { setPick(pickVal.value + q) }
function applyPick(all) {
  const v = pickVal.value
  sets(pickG.value.key).forEach((x, i) => { if (i === pickSet.value || (all && i > pickSet.value)) x.w = v })
  touch(); pickerOpen.value = false
}

// finishing shows the summary screen; "Zapisz trening" saves and returns to the main menu
const summary = ref(false)
function finish() {
  if (s.value.finished) { router.back(); return }
  summary.value = true
}
const c = computed(() => counts(s.value))
const niceDate = computed(() => new Date(s.value.date + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }))
const rows = computed(() => entriesOf(s.value.day).map(g => {
  const arr = s.value.ex[g.key] || []
  const done = arr.filter(x => x.d && x.w != null)
  const max = done.length ? Math.max(...done.map(x => x.w)) : null
  const before = sorted().filter(o => o.id !== s.value.id && (o.date < s.value.date || (o.date === s.value.date && o.started < s.value.started)))
    .flatMap(o => (o.ex?.[g.key] || []).filter(x => x.d && x.w != null).map(x => x.w))
  return { ...g, done: arr.some(x => x.d), max, pr: max != null && before.length > 0 && max > Math.max(...before) }
}))
const prs = computed(() => rows.value.filter(r => r.pr))
const exDone = computed(() => new Set(rows.value.filter(r => r.done).map(r => r.ex)).size)
async function askDelete() {
  const k = counts(s.value)
  const a = await alertController.create({
    header: 'Usunąć ten trening?',
    message: `${plan.value.name}, ${k.n}/${k.t} serii. Tego nie da się cofnąć.`,
    buttons: [{ text: 'Anuluj', role: 'cancel' }, { text: 'Usuń', role: 'destructive' }]
  })
  await a.present()
  const { role } = await a.onDidDismiss()
  if (role !== 'destructive') return
  const id = s.value.id
  state.flash = 'Trening usunięty'
  router.navigate('/tabs/home', 'back', 'replace')
  setTimeout(() => remove(id), 350) // after leaving, so this page doesn't render a missing workout
}
function save() {
  const name = plan.value.name, n = c.value.n, t = c.value.t
  const kept = finishSession(s.value.id)
  state.flash = kept ? `Zapisano: ${name}, ${n}/${t} serii` : ''
  summary.value = false
  router.navigate('/tabs/home', 'root', 'replace')
}

</script>

<style scoped>
.prog { height: 3px; background: var(--app-line); border-radius: 2px; margin: 10px 4px 0; overflow: hidden; }
.prog div { height: 100%; background: var(--c); border-radius: 2px; transition: width .3s; }
.dots-bar { --padding-start: 12px; --padding-end: 12px; --padding-bottom: 8px; --min-height: 44px; }
.dots { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; }
.dot { width: 34px; height: 34px; border-radius: 50%; border: 0; background: var(--app-field); color: var(--app-muted);
  font-weight: 700; font-size: 14px; display: grid; place-items: center; transition: background .15s, transform .15s; }
.dot.done { background: color-mix(in srgb, var(--c) 13%, var(--app-field)); color: var(--c); font-size: 18px; }
.dot.on { background: var(--c); color: #fff; transform: scale(1.08); box-shadow: 0 4px 12px color-mix(in srgb, var(--c) 35%, transparent); }

.swipe { height: 100%; overflow: hidden; }
.ex { height: 100%; display: flex; flex-direction: column; padding: 14px 20px 8px; }
.edit-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border-radius: 999px; padding: 4px 10px; }
.ex-meta { display: flex; justify-content: space-between; align-items: center; color: var(--app-muted); font-size: 14px; font-weight: 500; }
h1 { margin: 8px 0 4px; font-size: 28px; font-weight: 800; line-height: 1.12; letter-spacing: -.4px; text-wrap: balance; }
.ex-sub { display: flex; gap: 8px; align-items: center; }
.target { color: var(--c); font-weight: 700; font-size: 18px; }
.tag { font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--app-muted); background: var(--app-field);
  border-radius: 5px; padding: 2px 7px; }
.last { display: flex; gap: 6px; align-items: center; color: var(--app-muted); font-size: 14px;
  background: var(--app-card); border-radius: 12px; padding: 9px 12px; }
.last ion-icon { flex: none; font-size: 17px; }

.groups { min-height: 0; overflow-y: auto; overscroll-behavior: contain; flex: 0 1 auto; margin-top: 12px; display: flex; flex-direction: column; gap: 12px; }
.group { display: flex; flex-direction: column; }
.g-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px 6px; }
.g-head b { font-size: 18px; font-weight: 800; }
.g-target { color: var(--c); font-weight: 700; font-size: 15px; }
.groups .last { margin: 0 0 8px; }
.multi .last { padding: 6px 10px; font-size: 13px; }
.multi .set { padding: 5px 0; }
.multi .step, .multi .weight, .multi .check { height: 46px; }
.multi .weight { padding-top: 7px; }
.multi .ex-foot { padding-top: 6px; }
.sets { background: var(--app-card); border-radius: 18px; padding: 2px 14px; }
.set { display: grid; grid-template-columns: 18px 50px 1fr 50px 52px; gap: 7px; align-items: center; padding: 7px 0;
  border-top: 0.5px solid var(--app-line); }
.set:first-child { border-top: 0; }
.idx { color: var(--app-muted); font-weight: 700; font-size: 15px; text-align: center; }
.step { height: 52px; border: 0; border-radius: 14px; background: var(--app-field); color: var(--c);
  font-size: 15px; font-weight: 700; padding: 0; transition: transform .1s; }
.step:active { transform: scale(.92); }
.set.d .step { background: color-mix(in srgb, var(--c) 13%, var(--app-field)); }
.weight { height: 52px; border: 0; border-radius: 14px; background: var(--app-field); color: var(--ion-text-color);
  display: flex; align-items: baseline; justify-content: center; gap: 4px; padding-top: 10px; transition: background .15s, transform .1s; }
.weight:active { transform: scale(.97); }
.weight b { font-size: 24px; font-weight: 700; }
.weight small { color: var(--app-muted); font-size: 13px; }
.check { height: 52px; border-radius: 14px; border: 0; background: var(--app-field); color: var(--app-muted); font-size: 28px;
  display: grid; place-items: center; transition: background .15s, transform .1s; }
.check:active { transform: scale(.92); }
.set.d .check { background: var(--c); color: #fff; }
.set.d .weight { background: color-mix(in srgb, var(--c) 13%, var(--app-field)); }
.ex-foot { display: flex; gap: 20px; padding: 10px 4px 0; flex: none; }
.link { border: 0; background: none; color: var(--c); font-size: 15px; padding: 4px 0; }

ion-footer { background: var(--app-bg); }
.nav { display: grid; grid-template-columns: 1fr 1.4fr; gap: 10px; padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px)); }
.nav-btn { height: 54px; box-shadow: 0 6px 18px color-mix(in srgb, var(--c) 30%, transparent); border: 0; border-radius: 14px; background: var(--c); color: #fff;
  font-size: 17px; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 4px; }
.nav-btn.ghost { background: var(--app-card); color: var(--c); box-shadow: none; }
.nav-btn:disabled { opacity: .4; }

.done-screen { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; color: #fff;
  background: linear-gradient(170deg, color-mix(in srgb, var(--c) 72%, #fff) 0%, var(--c) 45%, color-mix(in srgb, var(--c) 70%, #000) 100%); }
.done-hero { flex: none; text-align: center; padding: calc(env(safe-area-inset-top, 0px) + 28px) 20px 6px; }
.done-badge { width: 76px; height: 76px; margin: 0 auto 10px; border-radius: 50%; background: rgba(255,255,255,.18);
  display: grid; place-items: center; font-size: 40px; color: #ffd257; animation: pop .45s ease-out; }
@keyframes pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
.done-hero h1 { margin: 0; font-size: 30px; font-weight: 800; color: #fff; }
.done-hero p { margin: 4px 0 18px; opacity: .85; font-size: 16px; }
.done-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.done-stats div { background: rgba(255,255,255,.14); border-radius: 14px; padding: 10px 6px; }
.done-stats b { display: block; font-size: 24px; font-weight: 800; }
.done-stats small { font-size: 14px; opacity: .7; font-weight: 600; }
.done-stats span { font-size: 12px; opacity: .85; }
.done-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin: 14px 16px 0; background: rgba(255,255,255,.12);
  border-radius: 18px; padding: 2px 14px; align-self: stretch; max-height: max-content; }
.done-row { display: flex; justify-content: space-between; gap: 12px; padding: 11px 0; border-top: 0.5px solid rgba(255,255,255,.18); font-size: 15px; }
.done-row:first-child { border-top: 0; }
.done-row.skip { color: rgba(255,255,255,.55); }
.dn { min-width: 0; }
.dw { flex: none; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.pr { font-size: 10px; font-weight: 800; letter-spacing: .4px; background: #ffd257; color: #5a3d00; border-radius: 6px; padding: 2px 6px; }
.done-foot { flex: none; margin-top: auto; padding: 14px 16px calc(12px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 4px; }
.save-btn { height: 56px; border: 0; border-radius: 16px; background: #fff; color: var(--c); box-shadow: 0 8px 24px rgba(0,0,0,.18);
  font-size: 18px; font-weight: 700; }
.save-btn:active { transform: scale(.98); }
.back-btn { height: 44px; border: 0; background: none; color: rgba(255,255,255,.9); font-size: 16px; }
.rise-enter-active, .rise-leave-active { transition: transform .3s ease, opacity .3s ease; }
.rise-enter-from, .rise-leave-to { transform: translateY(30px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .rise-enter-active, .rise-leave-active { transition: none; } .done-badge { animation: none; } }

.next-enter-active, .next-leave-active, .prev-enter-active, .prev-leave-active { transition: transform .22s ease, opacity .22s ease; }
.next-enter-from, .prev-leave-to { transform: translateX(40px); opacity: 0; }
.next-leave-to, .prev-enter-from { transform: translateX(-40px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .next-enter-active, .next-leave-active, .prev-enter-active, .prev-leave-active { transition: none; } }
</style>

<style>
/* the sheet is moved out of the page when opened, so these must not be scoped */
.wheel-sheet { --height: auto; --background: var(--app-card); }
.wheel-sheet .sheet { padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }
.wheel-sheet .sheet-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 4px 0 4px; }
.wheel-sheet .sheet-head span { color: var(--app-muted); font-size: 15px; }
.wheel-sheet .sheet-head b { font-size: 20px; }
.wheel-sheet .sheet-head ion-button { justify-self: end; margin: 0; }
.wheel-sheet ion-picker { --highlight-background: var(--app-field); }
.wheel-sheet ion-picker-column-option { font-size: 22px; }
.wheel-sheet .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
.wheel-sheet .quick button { height: 44px; border: 0; border-radius: 12px; background: var(--app-field); color: var(--c); font-size: 17px; font-weight: 600; }
.wheel-sheet .apply-all { width: 100%; margin-top: 10px; height: 46px; border: 0; border-radius: 12px; background: color-mix(in srgb, var(--c) 13%, var(--app-field));
  color: var(--c); font-size: 15px; font-weight: 600; }
</style>
