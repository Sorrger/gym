<template>
  <ion-page :style="{ '--c': color }">
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/home" text="" :style="{ '--color': color }" /></ion-buttons>
        <ion-title>{{ plan?.name }}</ion-title>
        <ion-buttons slot="end"><ion-button @click="askDelete" aria-label="Usuń trening" class="tb-trash"><ion-icon slot="icon-only" :icon="trashOutline" /></ion-button><button class="tb-finish" @click="finish">{{ s?.finished ? 'Gotowe' : 'Zakończ' }}</button></ion-buttons>
      </ion-toolbar>
      <ion-toolbar v-if="s" class="dots-bar">
        <div class="dots">
          <button v-for="(ex, i) in plan.ex" :key="ex[0]" class="dot" :class="{ on: i === idx, done: isComplete(i) }"
            @click="go(i)" :aria-label="'Ćwiczenie ' + (i + 1)">
            <ion-icon v-if="isComplete(i)" :icon="checkmark" /><span v-else>{{ i + 1 }}</span>
          </button>
        </div>
        
      </ion-toolbar>
    </ion-header>

    <ion-content :scroll-y="false" v-if="s">
      <div class="swipe" @touchstart.passive="tStart" @touchend.passive="tEnd">
        <Transition :name="dir" mode="out-in">
          <div class="ex" :key="exName">
            <div class="ex-meta">
              <span>Ćwiczenie {{ idx + 1 }} z {{ plan.ex.length }}</span>
              <span v-if="s.finished" class="edit-chip"><ion-icon :icon="createOutline" /> {{ s.manual && !c.n ? 'Odhacz zrobione serie' : 'Edycja' }} · {{ fmtDate(s.date) }}</span>
              <span v-else class="saved" :class="{ cloudok: cloud.token && !cloud.dirty && !cloud.error }">
                <ion-icon :icon="cloud.token && !cloud.dirty && !cloud.error ? cloudDoneOutline : checkmarkCircle" />
                {{ cloud.token ? (cloud.dirty || cloud.error ? 'Zapisano · kopia gdy będzie internet' : 'Zapisano · kopia na GitHub') : 'Zapisano w telefonie' }}
              </span>
            </div>
            <div class="ex-title">
              <div class="ex-tt">
                <h1 :class="{ long: exName.length > 24, xlong: exName.length > 36 }">{{ exName }}</h1>
                <div class="ex-sub">
                  <span class="target">{{ exTarget }}</span>
                  <span v-if="exTag" class="tag">{{ exTag }}</span>
                  <button v-if="s.deload" class="tag dl press" @click="deloadInfo">Tydzień lżejszy</button>
                </div>
                <button v-if="swapOpts.length > 1" class="swap press" @click="swapAsk">
                  <ion-icon :icon="swapHorizontal" /> {{ planName !== exName ? 'Zamiennik · zmień' : 'Zajęte? Zamień ćwiczenie' }}
                </button>
              </div>
              <button class="ex-body press" @click="howOpen = true" aria-label="Jak to zrobić"><BodyMap v-bind="exMuscles" /><span class="how-q" aria-hidden="true">?</span></button>
              <HowToSheet :open="howOpen" :name="exName" :color="color" :muscles="exMuscles" @close="howOpen = false" />
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
                <button v-if="prefs.coach !== 'off' && sugOf(g)" class="tip-chip press" :class="sugOf(g).kind" @click="showTip(sugList())">
                  <ion-icon :icon="kindIcon(sugOf(g).kind)" />
                  <span>{{ { up: 'Dodaj', down: 'Lżej', deload: 'Lżej', stage: 'Nowy' }[sugOf(g).kind] || 'Cel' }}: <b>{{ sugOf(g).short }}</b></span>
                </button>
                <WarmupCard v-if="warm(g)" :info="warm(g)" />
                <div class="sets">
                  <div class="set" v-for="(x, si) in sets(g.key)" :key="si" :class="{ d: x.d }">
                    <button v-if="prefs.setTypes" class="idx num ty press" :class="'t-' + (x.t || 'n')" @click="cycleType(g, si)" :aria-label="'Rodzaj serii: ' + typeName(x.t)">{{ x.t ? SET_TYPE_LABEL[x.t] : si + 1 }}</button>
                    <span v-else class="idx num">{{ si + 1 }}</span>
                    <div class="ctl">
                      <div class="line">
                        <button class="step num" @click="step(g, si, -1)" :aria-label="'Minus ' + fmtNum(UNITS[g.unit].step)"><ion-icon :icon="removeIcon" /></button>
                        <button class="weight num" @click="openPicker(g, si)">
                          <b>{{ x.w == null ? '—' : fmtNum(x.w) }}</b><small>{{ UNITS[g.unit].short }}</small>
                        </button>
                        <button class="step num" @click="step(g, si, 1)" :aria-label="'Plus ' + fmtNum(UNITS[g.unit].step)"><ion-icon :icon="add" /></button>
                      </div>
                      <div class="line reps" v-if="g.unit === 'kg'">
                        <button class="rstep" @click="stepReps(g, si, -1)" aria-label="Minus 1 powtórzenie"><ion-icon :icon="removeIcon" /></button>
                        <button class="reps-val num" @click="openPicker(g, si, 'r')"><b>× {{ x.r ?? DEF_REPS }}</b><small>powt.</small></button>
                        <button class="rstep" @click="stepReps(g, si, 1)" aria-label="Plus 1 powtórzenie"><ion-icon :icon="add" /></button>
                      </div>
                    </div>
                    <button class="check" @click="toggle(g, si)" :aria-pressed="x.d" aria-label="Seria zrobiona">
                      <ion-icon :icon="checkmark" />
                    </button>
                    <!-- reps in reserve: optional, shown once the set is ticked; the coach uses it -->
                    <div v-if="x.d && g.unit !== 's' && prefs.rir" class="rir">
                      <span>Zapas</span>
                      <button v-for="q in rirTop() + 1" :key="q" class="rir-b num press" :class="{ on: x.q === q - 1 || (q - 1 === rirTop() && x.q > q - 1) }"
                        @click="setRir(g, si, q - 1)" :aria-label="'Zostało ' + (q - 1) + (q - 1 === rirTop() ? ' lub więcej' : '') + ' powtórzeń do upadku'">{{ rirLabel(q - 1) }}</button>
                    </div>
                    <!-- advice for the sets still to do, right under the set that was clearly too heavy / too light -->
                        <div v-if="liveOf(g) && si === lastDone(g)" class="live-tip" :class="liveOf(g).kind">
                          <ion-icon :icon="liveOf(g).kind === 'up' ? trendingUp : trendingDown" />
                          <span>{{ liveOf(g).text }}</span>
                          <button class="press" @click="applyLive(g)">Ustaw</button>
                        </div>
                  </div>
                </div>
                <button v-if="g.unit === 's'" class="timer-btn" @click="openTimer(g)">
                  <ion-icon :icon="stopwatchOutline" /> Minutnik · seria {{ nextSet(g) + 1 }}
                </button>
                <div class="ex-foot">
                  <button class="link" @click="addSet(g)"><ion-icon :icon="add" /> Seria</button>
                  <button class="link muted" v-if="sets(g.key).length > 1" @click="popSet(g)"><ion-icon :icon="removeIcon" /> Seria</button>
                  <span class="step-note num">krok {{ fmtVal(UNITS[g.unit].step, g.unit) }}</span>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>

      <ValuePicker :open="pickerOpen" :color="color" :g="pickG" :si="pickSet" :field="pickField" :arr="pickG ? sets(pickG.key) : []" :initial="pickInit"
        @close="pickerOpen = false" @done="touch" />
    </ion-content>

    <ion-footer v-if="s" class="ion-no-border">
      <div class="nav">
        <button class="nav-btn ghost" :disabled="idx === 0" @click="go(idx - 1)" aria-label="Poprzednie ćwiczenie"><ion-icon :icon="chevronBack" /></button>
        <button class="nav-btn" v-if="idx < plan.ex.length - 1" @click="go(idx + 1)">Dalej <ion-icon :icon="chevronForward" /></button>
        <button class="nav-btn" v-else @click="finish">{{ s.finished ? 'Gotowe' : 'Zakończ trening' }}</button>
      </div>
    </ion-footer>

    <!-- hang timer -->
    <Transition name="rise">
      <HangTimer v-if="timer" :title="(timer.g.label || timer.g.name) + ' · seria ' + (timer.si + 1)" :initial="timer.secs" @save="hangSaved" @close="timer = null" />
    </Transition>

    <!-- rest timer -->
    <Transition name="recpop">
      <RestBar v-if="rest.end.value && !summary" :rest="rest" />
    </Transition>

    <!-- new record while training -->
    <Transition name="recpop">
      <div v-if="recPop" class="rec-pop" @click="recPop = null" role="status">
        <span class="rp-ico"><Ico name="trophy" /></span>
        <div><b>Nowy rekord!</b><span>{{ recPop.name }} · <b class="num">{{ recPop.val }}</b> <small>({{ recPop.as ? 'pomoc było ' : 'było ' }}{{ recPop.prev }})</small></span></div>
      </div>
    </Transition>

    <!-- end-of-workout screen -->
    <Transition name="rise">
      <WorkoutSummary v-if="summary && s" :s="s" :plan="plan" @save="save" @back="summary = false" />
    </Transition>
  </ion-page>
</template>

<script setup>
import Ico from './Ico.vue'
import WarmupCard from './workout/WarmupCard.vue'
import ValuePicker from './workout/ValuePicker.vue'
import HangTimer from './workout/HangTimer.vue'
import RestBar from './workout/RestBar.vue'
import WorkoutSummary from './workout/WorkoutSummary.vue'
import { useRest } from './workout/useRest'
import { unlockAudio, vibrate } from './workout/beep'
import { bestBefore } from './workout/records'
import { ask } from '../dialog'
import BodyMap from './BodyMap.vue'
import HowToSheet from './HowToSheet.vue'
import { suggest, applySuggestion, live } from '../coach'
import { musclesOf } from '../muscles'
import { computed, ref, watch, watchEffect, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonBackButton, IonIcon, IonFooter, useIonRouter  } from '@ionic/vue'
import { checkmark, trashOutline, createOutline, timeOutline, chevronBack, chevronForward, add, remove as removeIcon, stopwatchOutline, checkmarkCircle, cloudDoneOutline, trendingUp, trendingDown, bulbOutline, trophyOutline, swapHorizontal } from 'ionicons/icons'
import { prefs, rirTop, rirLabel, deloadWords, SET_TYPES, SET_TYPE_LABEL } from '../prefs'
import { PLAN, COLORS, UNITS, DEF_REPS, groupsOf, fmtNum, fmtVal, rangeOf, targetOf, isAssisted, WARMUP, warmupSets, platesPerSide, altOf, nameIn, canon } from '../plan'
import { cloud } from '../cloud'
import { state, lastFor, finishSession, remove, fmtShort, fmtDate, counts, ago, cancelDeload, swapExercise, dropEmptyManual } from '../store'

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

const idx = computed(() => (plan.value ? Math.min(s.value?.cur || 0, plan.value.ex.length - 1) : 0))
const planName = computed(() => plan.value?.ex[idx.value][0] || '')
const exName = computed(() => (plan.value ? nameIn(plan.value.ex[idx.value], s.value) : ''))
// alternatives for a busy machine (ALT in plan.js): the plan's exercise first
// alternatives already done at another place of this workout are left out (two places can't share one exercise)
const swapOpts = computed(() => {
  if (!planName.value) return []
  const taken = new Set(plan.value.ex.filter((e, i) => i !== idx.value).flatMap(e => [e[0], nameIn(e, s.value)]))
  return [planName.value, ...altOf(planName.value).filter(n => !taken.has(n))]
})
async function swapAsk() {
  const sess = s.value, cur = exName.value
  if (groups.value.some(g => (sess.ex[g.key] || []).some(x => x.d))) {
    await ask({ icon: swapHorizontal, color: color.value, title: 'Masz już zaliczone serie', message: `Żeby zamienić ćwiczenie, najpierw odznacz serie ${cur}.`, buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] })
    return
  }
  const { role } = await ask({ icon: swapHorizontal, color: color.value, title: 'Zamień ćwiczenie',
    message: 'Zrób to, co jest wolne. Każde ćwiczenie ma swoją historię i swoje podpowiedzi ciężaru.',
    buttons: [...swapOpts.value.map((n, k) => ({ text: (n === cur ? '✓ ' : '') + n + (k === 0 ? ' (z planu)' : ''), role: n, kind: n === cur ? 'soft' : 'primary' })), { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'cancel' || role === cur || !swapOpts.value.includes(role)) return
  swapExercise(sess, planName.value, role)
  state.flash = 'Dziś: ' + role
  await nextTick(); const l = sugList(); if (l.length && prefs.coach === 'auto') showTip(l)
}
const exTarget = computed(() => (plan.value ? targetOf(plan.value.ex[idx.value], s.value) || '' : ''))
const exTag = computed(() => plan.value?.ex[idx.value][2])
const exMuscles = computed(() => musclesOf(exName.value))
const howOpen = ref(false)
const groups = computed(() => (plan.value ? groupsOf(plan.value.ex[idx.value], s.value) : []))
/** @returns {SetRow[]} */
function sets(key) {
  if (!s.value.ex[key]) s.value.ex[key] = [{ w: null, d: false }]
  return s.value.ex[key]
}
const isComplete = i => groupsOf(plan.value.ex[i], s.value).every(g => (s.value.ex[g.key] || []).length > 0 && s.value.ex[g.key].every(x => x.d))
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

// progression hint: shown in a dialog the first time an exercise is opened in a workout (nothing ticked yet), and as a chip
const sugs = computed(() => { void state.sessions; return s.value ? groups.value.map(g => ({ g, sug: suggest(g, s.value) })) : [] })
const sugOf = g => { const x = sugs.value.find(y => y.g.key === g.key)?.sug; return x && x.kind !== 'first' ? x : null }
const sugList = () => sugs.value.filter(x => x.sug && x.sug.kind !== 'first')
const tipsShown = new Set()
async function showTip(list) {
  if (!list.length) return
  const multi = list.length > 1
  const main = list.find(x => x.sug.kind === 'stage') || list.find(x => x.sug.kind === 'up') || list.find(x => x.sug.kind === 'down') || list[0]
  const can = list.some(x => x.sug.sets)
  const { role } = await ask({ icon: kindIcon(main.sug.kind), color: main.sug.kind === 'deload' ? '#0a84ff' : main.sug.kind === 'stage' ? '#ff9f0a' : color.value,
    title: multi ? (main.sug.kind === 'stage' || main.sug.kind === 'deload' ? main.sug.title : 'Podpowiedź na dziś') : main.sug.title,
    message: [...new Set(list.map(x => x.sug.note).filter(Boolean)), ...list.map(x => (multi ? x.g.label + ': ' : '') + x.sug.text)].join('\n\n'),
    buttons: can ? [{ text: multi ? 'Ustaw w seriach' : 'Ustaw: ' + main.sug.short, role: 'apply', kind: 'primary' }, { text: 'Zostaw jak jest', role: 'cancel' }]
      : [{ text: 'OK', role: 'cancel', kind: 'primary' }] })
  if (role === 'apply') { list.forEach(x => applySuggestion(sets(x.g.key), x.sug, x.g.unit)); touch() }
}

function warm(g) {
  if (!prefs.warmup) return null
  const bar = WARMUP[g.name] ?? WARMUP[canon(g.name)]
  if (bar == null || g.label) return null
  const arr = sets(g.key)
  if (arr.some(x => x.d)) return null // hidden once the first working set is done
  const W = arr.find(x => x.w != null)?.w
  const list = warmupSets(W, bar)
  return list.length ? { W, sets: list, plates: platesPerSide(W, bar) } : null
}
const lastDone = g => sets(g.key).reduce((k, x, i) => (x.d ? i : k), -1)
const liveOf = g => (s.value && prefs.live ? live(g, s.value) : null)
function applyLive(g) {
  const t = liveOf(g)
  if (!t) return
  sets(g.key).forEach(x => { if (!x.d) { x.w = t.w; x.r = t.r } })
  touch()
}
function kindIcon(k) { return k === 'up' ? trendingUp : k === 'down' || k === 'deload' ? trendingDown : k === 'stage' ? trophyOutline : bulbOutline }
async function deloadInfo() {
  const { role } = await ask({ icon: trendingDown, color: '#0a84ff', title: 'Tydzień lżejszy (deload)',
    message: 'Co kilka tygodni apka sama robi lżejszy tydzień: te same ćwiczenia, ' + deloadWords() + ' i 3-4 powtórzenia w zapasie. Zmęczenie schodzi, stawy odpoczywają, a po nim wracasz do normalnych ciężarów – zwykle z nową siłą.',
    buttons: s.value.finished ? [{ text: 'OK', role: 'ok', kind: 'primary' }]
      : [{ text: 'OK', role: 'ok', kind: 'primary' }, { text: 'Dziś trenuj normalnie', role: 'normal', kind: 'soft' }] })
  if (role === 'normal') { cancelDeload(s.value); state.flash = 'Normalny trening – lżejszy tydzień za tydzień' }
}
function lastText(g) {
  const p = lastFor(g.key, s.value)
  const rg = rangeOf(g.target)
  if (!p && isAssisted(g)) return `Pierwszy raz. Dobierz wspomaganie (kg pomocy) na ${rg.lo}-${rg.hi} powtórzeń.`
  if (!p) return g.unit === 'kg' ? (rg ? `Pierwszy raz. Dobierz ciężar na ${rg.lo}-${rg.hi} powtórzeń.` : 'Pierwszy raz. Ustaw ciężar dla serii.') : 'Pierwszy raz. Ustaw wartość dla serii.'
  const done = p.ex[g.key].filter(x => x.d && x.w != null)
  const txt = g.unit === 'kg' && done.some(x => x.r)
    ? done.map(x => fmtNum(x.w) + (x.r ? '×' + x.r : '')).join(' · ') + ' kg'
    : done.map(x => fmtNum(x.w)).join(' · ') + ' ' + UNITS[g.unit].short
  return 'Ostatnio ' + fmtShort(p.date) + ' (' + ago(p.date) + '): ' + txt
}

const recPop = ref(null)
let recT = 0
function toggle(g, si) {
  const x = sets(g.key)[si]
  x.d = !x.d
  if (!x.d) delete x.q
  touch()
  if (x.d && x.w != null && x.t !== 'w' && !s.value.deload) {
    const b = bestBefore(s.value, g, si), as = isAssisted(g)
    if (b != null && (as ? x.w < b : x.w > b)) {
      recPop.value = { name: g.label || g.name, val: fmtVal(x.w, g.unit) + (g.unit === 'kg' && x.r ? ' × ' + x.r : ''), prev: fmtVal(b, g.unit), as }
      vibrate([30, 40, 60])
      clearTimeout(recT); recT = setTimeout(() => { recPop.value = null }, 3200)
    }
  }
  // exercise finished → jump to the next one not done yet (order can change, e.g. a busy machine);
  // when the reps-in-reserve chips are shown, give time to tap one first (jumps right after the tap, or after 5 s)
  if (x.d) autoNext(g.unit !== 's' && prefs.rir ? 5000 : 650)
  if (x.d && prefs.restTimer && g.unit !== 's' && c.value.n < c.value.t) { unlockAudio(); rest.start() }
  if (!x.d) rest.stop()
}
let nextT = 0
// set types (Ustawienia → Trening → Rodzaje serii): tap the set number to cycle
const TYPE_NAMES = { w: 'rozgrzewkowa', d: 'drop set', f: 'do upadku' }
const typeName = t => TYPE_NAMES[t] || 'robocza'
function cycleType(g, si) {
  const x = sets(g.key)[si], i = SET_TYPES.indexOf(x.t)
  const nt = SET_TYPES[(i + 1) % SET_TYPES.length]
  if (nt) x.t = /** @type {'w' | 'd' | 'f'} */ (nt); else delete x.t
  touch()
}
const rest = useRest()
function autoNext(ms) {
  clearTimeout(nextT)
  if (!prefs.autoNext || !isComplete(idx.value)) return
  const at = idx.value, n = plan.value.ex.length
  const to = [...Array(n - 1)].map((_, k) => (at + 1 + k) % n).find(i => !isComplete(i))
  if (to != null) nextT = setTimeout(() => { if (idx.value === at && !summary.value && isComplete(at)) go(to) }, ms)
}
function setRir(g, si, q) {
  const x = sets(g.key)[si]
  if (x.q === q) delete x.q; else x.q = q
  touch()
  if (x.q != null) autoNext(600)
}
function step(g, si, dirn) {
  const a = sets(g.key), x = a[si], u = UNITS[g.unit]
  const base = x.w ?? [...a].slice(0, si).reverse().find(y => y.w != null)?.w ?? 0
  x.w = Math.max(0, Math.min(u.max, Math.round((base + dirn * u.step) * 4) / 4)); touch()
}
function addSet(g) {
  const a = sets(g.key), last = a[a.length - 1]
  a.push(g.unit === 'kg' ? { w: last?.w ?? null, r: last?.r ?? DEF_REPS, d: false } : { w: last?.w ?? null, d: false }); touch()
}
function stepReps(g, si, d) { const x = sets(g.key)[si]; x.r = Math.max(1, Math.min(50, (x.r ?? DEF_REPS) + d)); touch() }
function popSet(g) { sets(g.key).pop(); touch() }

// value picker (ValuePicker.vue): which set and field, and the value it opens with
const pickerOpen = ref(false), pickSet = ref(0), pickG = ref(null), pickField = ref('w'), pickInit = ref(0)
function openPicker(g, si, field = 'w') {
  const a = sets(g.key)
  let v = field === 'r' ? a[si].r ?? DEF_REPS : a[si].w
  if (v == null) v = [...a].slice(0, si).reverse().find(x => x.w != null)?.w ?? lastFor(g.key, s.value)?.ex[g.key]?.[0]?.w ?? (g.unit === 'reps' ? 3 : 20)
  pickG.value = g; pickSet.value = si; pickField.value = field; pickInit.value = v
  pickerOpen.value = true
}

// hang timer (HangTimer.vue): opens on the next set not done; the held seconds are saved and the set ticked
const timer = ref(null) // { g, si, secs }
const nextSet = g => { const a = sets(g.key); const i = a.findIndex(x => !x.d); return i < 0 ? a.length - 1 : i }
function defaultSecs(g, si) {
  const w = sets(g.key)[si]?.w
  if (w) return Math.min(120, Math.max(5, w))
  const r = String(g.target).match(/(\d+)-(\d+)\s*s/), m = String(g.target).match(/(\d+)\s*s/)
  return r ? +r[2] : m ? +m[1] : 30
}
function openTimer(g) {
  unlockAudio() // sound must be unlocked by this tap (iOS)
  const si = nextSet(g)
  timer.value = { g, si, secs: defaultSecs(g, si) }
}
function hangSaved(secs) {
  const { g, si } = timer.value, x = sets(g.key)[si]
  x.w = Math.min(UNITS.s.max, secs); touch()
  if (!x.d) toggle(g, si)
}

// finishing shows the summary screen; "Zapisz trening" saves and returns to the main menu
const summary = ref(false)
watch(() => [s.value?.id, idx.value, summary.value], () => {
  const sess = s.value
  if (!sess || sess.finished || summary.value || !route.path.startsWith('/workout') || prefs.coach !== 'auto') return
  const k = sess.id + ':' + idx.value
  if (tipsShown.has(k)) return
  tipsShown.add(k)
  if (groups.value.some(g => (sess.ex[g.key] || []).some(x => x.d))) return
  // light week: the numbers are already set, so explain it once per workout (the chip stays on every exercise)
  if (sess.deload && sugList().every(x => x.sug.kind === 'deload')) { if (tipsShown.has(sess.id + ':dl')) return; tipsShown.add(sess.id + ':dl') }
  const list = sugList()
  if (list.length) setTimeout(() => { if (s.value?.id === sess.id && idx.value === +k.split(':')[1]) showTip(list) }, 450)
}, { immediate: true })
function finish() {
  if (s.value.finished) { if (s.value.manual) dropEmptyManual(); router.back(); return }
  summary.value = true
}
const c = computed(() => counts(s.value))
async function askDelete() {
  const k = counts(s.value)
  const { role } = await ask({ icon: trashOutline, title: 'Usunąć ten trening?',
    message: `${plan.value.name}, ${k.n}/${k.t} serii. Tego nie da się cofnąć.`,
    buttons: [{ text: 'Usuń trening', role: 'destructive', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
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
.tb-trash { --color: var(--app-muted); }
.tb-finish { height: 32px; margin: 0 8px 0 2px; padding: 0 14px; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--c) 15%, transparent); color: var(--c);
  font-size: 15px; font-weight: 600; }
.tb-finish:active { opacity: .7; }
.dots-bar { --padding-start: 12px; --padding-end: 12px; --padding-bottom: 10px; --min-height: 40px; }
.dots { display: flex; gap: 6px; justify-content: center; }
.dot { flex: 1; max-width: 52px; height: 30px; border-radius: 10px; border: 0; background: var(--app-field); color: var(--app-muted);
  font-weight: 600; font-size: 14px; display: grid; place-items: center; transition: background .2s, color .2s; }
.dot.done { background: color-mix(in srgb, var(--c) 18%, transparent); color: var(--c); font-size: 17px; }
.dot.on { background: var(--c); color: #fff; }

.swipe { height: 100%; overflow: hidden; }
.ex { height: 100%; display: flex; flex-direction: column; padding: 16px 16px 8px; }
.edit-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border-radius: 999px; padding: 4px 10px; }
.saved { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 500; text-transform: none; letter-spacing: 0; color: var(--app-faint); }
.saved ion-icon { font-size: 14px; }
.saved.cloudok { color: var(--app-ok); }
.ex-meta { display: flex; justify-content: space-between; align-items: center; color: var(--app-muted); font-size: 13px; font-weight: 600;
  padding: 0 4px; }
h1.long { font-size: 24px; }
h1.xlong { font-size: 21px; }
h1 { margin: 6px 4px 4px; font-size: 28px; font-weight: 700; line-height: 1.15; letter-spacing: -.3px; text-wrap: balance; }
.ex-title { display: flex; gap: 8px; align-items: center; }
.ex-tt { flex: 1; min-width: 0; }
.ex-body { flex: none; height: 112px; position: relative; border: 0; padding: 0; background: none; font: inherit; }
.how-q { position: absolute; top: -2px; right: -6px; width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; font-weight: 800; color: #fff; background: var(--c, var(--accent)); box-shadow: 0 0 0 2px var(--app-bg); }
.swap { display: inline-flex; align-items: center; gap: 6px; margin: 8px 4px 0; padding: 6px 11px; border: 0; border-radius: 999px; font: inherit; font-size: 13px; font-weight: 600;
  color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.swap ion-icon { font-size: 15px; }
.ex-sub { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; padding: 0 4px; }
.target { color: var(--c); font-weight: 600; font-size: 17px; }
.tag { font-size: 12px; font-weight: 600; color: var(--app-muted); background: var(--app-field); border-radius: 6px; padding: 2px 7px; }
.last { display: flex; gap: 6px; align-items: center; color: var(--app-muted); font-size: 13px; padding: 0 4px; }
.tip-chip { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; margin: 6px 4px 0; padding: 5px 11px; border: 0; border-radius: 999px;
  font: inherit; font-size: 13px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); }
.tip-chip b { font-weight: 700; }
.tip-chip ion-icon { font-size: 15px; }
.tip-chip.down { color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 12%, transparent); }
.live-tip { grid-column: 1 / 4; display: flex; align-items: center; gap: 8px; margin: 2px 0 0; padding: 9px 10px 9px 12px; border-radius: 14px; font-size: 13.5px; line-height: 1.3;
  color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 11%, transparent); }
.live-tip.up { color: var(--app-ok); background: color-mix(in srgb, var(--app-ok) 12%, transparent); }
.live-tip ion-icon { font-size: 18px; flex: none; }
.live-tip span { flex: 1; color: var(--ion-text-color); }
.live-tip button { flex: none; border: 0; border-radius: 999px; padding: 7px 13px; font: inherit; font-weight: 700; color: #fff; background: var(--app-bad); }
.live-tip.up button { background: var(--app-ok); }
.tip-chip.deload { color: #0a84ff; background: color-mix(in srgb, #0a84ff 12%, transparent); }
.tip-chip.stage { color: #ff9f0a; background: color-mix(in srgb, #ff9f0a 14%, transparent); }
.tag.dl { border: 0; font-family: inherit; color: #0a84ff; background: color-mix(in srgb, #0a84ff 13%, transparent); }
.last ion-icon { flex: none; font-size: 15px; }

.groups { min-height: 0; overflow-y: auto; overscroll-behavior: contain; flex: 0 1 auto; margin-top: 14px; display: flex; flex-direction: column; gap: 14px; }
.group { display: flex; flex-direction: column; }
.g-head { display: flex; align-items: baseline; justify-content: space-between; padding: 0 4px 6px; }
.g-head b { font-size: 17px; font-weight: 600; }
.g-target { color: var(--c); font-weight: 600; font-size: 15px; }
.groups .last { margin: 0 0 8px; }
.multi .set { padding: 4px 0; }
.multi .step, .multi .check { width: 40px; height: 40px; }
.multi .weight { height: 44px; }
.multi .line { grid-template-columns: 40px 1fr 40px; }
.sets { background: var(--app-card); border-radius: var(--r-lg); padding: 2px 12px; box-shadow: var(--app-shadow); }
.set { display: grid; grid-template-columns: 20px 1fr 46px; gap: 8px; align-items: center; padding: 8px 0; position: relative; }
.ctl { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.line { display: grid; grid-template-columns: 44px 1fr 44px; gap: 8px; align-items: center; }
.line.reps { grid-template-columns: 44px 1fr 44px; }
.rstep { width: 32px; height: 32px; justify-self: center; border: 0; border-radius: 50%; background: var(--app-field); color: var(--app-muted);
  font-size: 17px; display: grid; place-items: center; padding: 0; transition: transform .1s; }
.rstep:active { transform: scale(.88); }
.reps-val { height: 34px; border: 0; border-radius: 10px; background: none; color: var(--app-muted); display: flex; align-items: baseline;
  justify-content: center; gap: 4px; padding-top: 4px; }
.reps-val:active { background: var(--app-field); }
.reps-val b { font-size: 18px; font-weight: 600; color: var(--ion-text-color); }
.reps-val small { font-size: 13px; }
.set.d .reps-val b { color: var(--c); }
.timer-btn { margin-top: 10px; height: 46px; border: 0; border-radius: 14px; display: flex; align-items: center; justify-content: center; gap: 6px;
  background: color-mix(in srgb, var(--c) 13%, transparent); color: var(--c); font-size: 16px; font-weight: 600; }
.timer-btn ion-icon { font-size: 20px; }
.timer-btn:active { opacity: .7; }

.set + .set::before { content: ''; position: absolute; top: 0; left: 28px; right: 0; border-top: 0.5px solid var(--app-line); }
.idx { color: var(--app-faint); font-weight: 600; font-size: 15px; text-align: center; }
.step { width: 44px; height: 44px; border: 0; border-radius: 50%; background: var(--app-field); color: var(--ion-text-color);
  font-size: 22px; display: grid; place-items: center; padding: 0; transition: transform .1s; }
.step:active { transform: scale(.88); }
.weight { height: 50px; border: 0; border-radius: var(--r-sm); background: none; color: var(--ion-text-color);
  display: flex; align-items: baseline; justify-content: center; gap: 4px; padding-top: 8px; transition: background .15s; }
.weight:active { background: var(--app-field); }
.weight b { font-size: 30px; font-weight: 700; letter-spacing: -.4px; font-family: var(--num-font); }
.weight small { color: var(--app-muted); font-size: 15px; }
.check { width: 46px; height: 46px; border-radius: 50%; border: 2px solid var(--app-faint); background: none; color: transparent; font-size: 26px;
  display: grid; place-items: center; transition: background .15s, border-color .15s, transform .15s; justify-self: end; padding: 0; }
.check:active { transform: scale(.9); }
.set.d .check { background: var(--c); border-color: var(--c); color: #fff; }
.set.d .weight b { color: var(--c); }
.rir { grid-column: 2 / 4; display: flex; align-items: center; gap: 6px; margin-top: -2px; }
.rir span { font-size: 12.5px; color: var(--app-muted); font-weight: 600; margin-right: 2px; }
.rir-b { flex: 1; max-width: 56px; height: 30px; border-radius: 9px; border: 0; font: inherit; font-size: 14px; font-weight: 700;
  background: color-mix(in srgb, var(--c) 10%, var(--app-card)); color: var(--ion-text-color); }
.rir-b.on { background: var(--c); color: #fff; }
.ex-foot { display: flex; gap: 18px; align-items: center; padding: 10px 6px 0; flex: none; }
.link { border: 0; background: none; color: var(--c); font-size: 15px; font-weight: 600; padding: 4px 0; display: inline-flex; align-items: center; gap: 3px; }
.link.muted { color: var(--app-muted); }
.step-note { margin-left: auto; font-size: 13px; color: var(--app-faint); }

ion-footer { background: color-mix(in srgb, var(--app-bg) 80%, transparent); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); }
.nav { display: grid; grid-template-columns: 54px 1fr; gap: 10px; padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px)); }
.nav-btn { height: 52px; border: 0; border-radius: 16px; background: var(--c); color: #fff; font-size: 17px; font-weight: 600;
  display: flex; align-items: center; justify-content: center; gap: 4px; transition: transform .12s, opacity .12s; }
.nav-btn:active { transform: scale(.97); opacity: .85; }
.nav-btn.ghost { background: color-mix(in srgb, var(--c) 13%, transparent); color: var(--c); font-size: 22px; }
.nav-btn:disabled { opacity: .35; }

@keyframes pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
.rec-pop { position: absolute; z-index: 90; left: 14px; right: 14px; top: calc(env(safe-area-inset-top, 0px) + 58px); display: flex; align-items: center; gap: 12px;
  padding: 12px 14px; border-radius: 18px; color: #3b2a00; background: linear-gradient(135deg, #ffe58a, #ffc93c); box-shadow: 0 12px 30px rgba(0,0,0,.25); }
.rec-pop .rp-ico { width: 42px; height: 42px; border-radius: 50%; background: rgba(255,255,255,.55); display: grid; place-items: center; font-size: 24px; flex: none; animation: pop .5s ease-out; }
.rec-pop div { display: flex; flex-direction: column; min-width: 0; }
.rec-pop div > b { font-size: 17px; font-weight: 800; }
.rec-pop span { font-size: 14px; }
.rec-pop small { opacity: .7; }
.recpop-enter-active { transition: transform .35s cubic-bezier(.2,1.4,.4,1), opacity .25s; }
.recpop-leave-active { transition: transform .25s, opacity .25s; }
.recpop-enter-from, .recpop-leave-to { transform: translateY(-20px) scale(.95); opacity: 0; }
.idx.ty { border: 0; background: var(--app-field); border-radius: 8px; min-width: 26px; height: 26px; padding: 0 4px; font-weight: 800; color: var(--ion-text-color); }
.idx.ty.t-w { background: #ffd60a; color: #3b2a00; }
.idx.ty.t-d { background: #5e5ce6; color: #fff; }
.idx.ty.t-f { background: #ff3b30; color: #fff; }
.rise-enter-active, .rise-leave-active { transition: transform .3s ease, opacity .3s ease; }
.rise-enter-from, .rise-leave-to { transform: translateY(30px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .rise-enter-active, .rise-leave-active { transition: none; } }

.next-enter-active, .next-leave-active, .prev-enter-active, .prev-leave-active { transition: transform .22s ease, opacity .22s ease; }
.next-enter-from, .prev-leave-to { transform: translateX(40px); opacity: 0; }
.next-leave-to, .prev-enter-from { transform: translateX(-40px); opacity: 0; }
@media (prefers-reduced-motion: reduce) { .next-enter-active, .next-leave-active, .prev-enter-active, .prev-leave-active { transition: none; } }
</style>

