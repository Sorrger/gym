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
              <div class="ex-body"><BodyMap v-bind="exMuscles" /></div>
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
                <!-- warm-up: a note only, nothing is saved, so it never counts in stats -->
                <div v-if="warm(g)" class="warm">
                  <div class="warm-h"><ion-icon :icon="flameOutline" /><b>Rozgrzewka</b><span>nie liczy się do statystyk</span></div>
                  <div class="warm-row num" v-for="(w, wi) in warm(g).sets" :key="wi">
                    <b>{{ wi === 0 ? 'Gryf ' + fmtNum(w.w) : fmtNum(w.w) }} kg × {{ w.r }}</b>
                    <span>{{ w.plates.length ? 'na stronę: ' + w.plates.map(fmtNum).join(' + ') : 'pusty gryf' }}</span>
                  </div>
                  <div class="warm-row work num"><b>Robocze {{ fmtNum(warm(g).W) }} kg</b><span>{{ warm(g).plates.length ? 'na stronę: ' + warm(g).plates.map(fmtNum).join(' + ') : '' }}</span></div>
                  <p>Spokojnie, bez zmęczenia, ok. 1 min przerwy między seriami.</p>
                </div>
                <div class="sets">
                  <div class="set" v-for="(x, si) in sets(g.key)" :key="si" :class="{ d: x.d }">
                    <span class="idx num">{{ si + 1 }}</span>
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
                      <button v-for="q in [0, 1, 2, 3]" :key="q" class="rir-b num press" :class="{ on: x.q === q }"
                        @click="setRir(g, si, q)" :aria-label="'Zostało ' + q + (q === 3 ? ' lub więcej' : '') + ' powtórzeń do upadku'">{{ q === 3 ? '3+' : q }}</button>
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

      <!-- weight wheel -->
      <ion-modal :is-open="pickerOpen" :initial-breakpoint="1" :breakpoints="[0, 1]" class="wheel-sheet" :style="{ '--c': color }" @didDismiss="pickerOpen = false">
        <div class="sheet">
          <div class="sheet-head">
            <span>{{ pickG?.label ? pickG.label + ' · ' : '' }}Seria {{ pickSet + 1 }}{{ pickField === 'r' ? ' · powt.' : '' }}</span>
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
        <button class="nav-btn ghost" :disabled="idx === 0" @click="go(idx - 1)" aria-label="Poprzednie ćwiczenie"><ion-icon :icon="chevronBack" /></button>
        <button class="nav-btn" v-if="idx < plan.ex.length - 1" @click="go(idx + 1)">Dalej <ion-icon :icon="chevronForward" /></button>
        <button class="nav-btn" v-else @click="finish">{{ s.finished ? 'Gotowe' : 'Zakończ trening' }}</button>
      </div>
    </ion-footer>

    <!-- hang timer: set seconds on a dial, 5-4-3-2-1, then count down to 0 -->
    <Transition name="rise">
      <div v-if="timer" class="timer-screen">
        <div class="tm-head">{{ timer.g.label || timer.g.name }} · seria {{ timer.si + 1 }}</div>

        <div class="tm-ring" :class="['ph-' + tPhase, { dragging: tDial != null }]" ref="dialEl"
          @pointerdown="dialDown" @pointermove="dialMove" @pointerup="dialUp" @pointercancel="dialUp">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="50" class="bg" />
            <circle cx="60" cy="60" r="50" class="fg" :style="{ strokeDashoffset: 314.16 * (1 - tRing) }" />
            <g v-if="tPhase === 'setup'" class="knob-g" :style="{ transform: `rotate(${(tDial ?? tSet) / DIAL_MAX * 360}deg)` }">
              <circle cx="110" cy="60" r="8.5" class="knob" />
            </g>
          </svg>
          <div class="tm-val num">
            <b>{{ tPhase === 'setup' ? tSet : tPhase === 'prep' ? tPrepLeft : tLeft }}</b>
            <span>{{ tPhase === 'setup' ? 'sekund · kręć palcem' : tPhase === 'prep' ? 'przygotuj się' : tPhase === 'done' ? 'brawo!' : 'zostało sekund' }}</span>
          </div>
        </div>

        <div class="tm-adj" v-if="tPhase === 'setup'">
          <button @click="tSet = Math.max(DIAL_MIN, tSet - 5)">−5 s</button>
          <button @click="tSet = Math.max(DIAL_MIN, tSet - 1)">−1</button>
          <button @click="tSet = Math.min(DIAL_MAX, tSet + 1)">+1</button>
          <button @click="tSet = Math.min(DIAL_MAX, tSet + 5)">+5 s</button>
        </div>
        <p class="tm-goal num" v-else>{{ tPhase === 'run' ? 'Wiszenie ' + tSet + ' s' : tPhase === 'done' ? 'Zapisano ' + tSet + ' s' : 'Start za chwilę' }}</p>

        <div class="tm-btns">
          <button class="tm-cancel" @click="closeTimer">Anuluj</button>
          <button class="tm-stop" v-if="tPhase === 'setup'" @click="startTimer">Start</button>
          <button class="tm-stop" v-else-if="tPhase === 'prep'" @click="skipPrep">Start teraz</button>
          <button class="tm-stop" v-else-if="tPhase === 'run'" @click="stopTimer">Stop i zapisz</button>
          <button class="tm-stop" v-else @click="closeTimer">Gotowe</button>
        </div>
      </div>
    </Transition>

    <!-- end-of-workout screen -->
    <Transition name="rise">
      <div v-if="summary && s" class="done-screen">
        <div class="done-hero">
          <div class="done-badge"><ion-icon :icon="trophy" /></div>
          <h1>{{ c.n ? 'Trening zrobiony!' : 'Nic nie odhaczone' }}</h1>
          <p>{{ plan.name }} · {{ niceDate }}</p>
          <p v-if="sv" class="done-sv num"><ion-icon :icon="heart" /> {{ svText(sv) }}</p>
          <div class="done-stats">
            <div><b class="num">{{ c.n }}<small>/{{ c.t }}</small></b><span>serii</span></div>
            <div><b class="num">{{ exDone }}<small>/{{ plan.ex.length }}</small></b><span>ćwiczeń</span></div>
            <div><b class="num">{{ prs.length }}</b><span>{{ prs.length === 1 ? 'rekord' : prs.length >= 2 && prs.length <= 4 ? 'rekordy' : 'rekordów' }}</span></div>
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
import { ask } from '../dialog'
import BodyMap from './BodyMap.vue'
import { stravaFor, svText } from '../strava'
import { suggest, applySuggestion, live } from '../coach'
import { musclesOf } from '../muscles'
import { computed, ref, watch, watchEffect, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButtons, IonButton, IonBackButton, IonIcon, IonFooter,
  IonModal, IonPicker, IonPickerColumn, IonPickerColumnOption, useIonRouter  } from '@ionic/vue'
import { checkmark, trophy, trashOutline, createOutline, timeOutline, chevronBack, chevronForward, add, remove as removeIcon, stopwatchOutline, checkmarkCircle, cloudDoneOutline, heart, trendingUp, trendingDown, bulbOutline, trophyOutline, flameOutline, swapHorizontal } from 'ionicons/icons'
import { prefs } from '../prefs'
import { PLAN, COLORS, UNITS, DEF_REPS, groupsOf, entriesOf, fmtNum, fmtVal, rangeOf, targetOf, isAssisted, WARMUP, warmupSets, platesPerSide, altOf, nameIn } from '../plan'
import { cloud } from '../cloud'
import { state, lastFor, finishSession, remove, fmtShort, fmtDate, counts, ago, sorted, cancelDeload, swapExercise, dropEmptyManual } from '../store'

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
const sv = computed(() => s.value && stravaFor(s.value.id))
const exMuscles = computed(() => musclesOf(exName.value))
const groups = computed(() => (plan.value ? groupsOf(plan.value.ex[idx.value], s.value) : []))
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
  const bar = WARMUP[g.name]
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
    message: 'Co kilka tygodni apka sama robi lżejszy tydzień: te same ćwiczenia, połowa serii, ok. 10% lżej i 3-4 powtórzenia w zapasie. Zmęczenie schodzi, stawy odpoczywają, a po nim wracasz do normalnych ciężarów – zwykle z nową siłą.',
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

function toggle(g, si) {
  const x = sets(g.key)[si]
  x.d = !x.d
  if (!x.d) delete x.q
  touch()
  // exercise finished → jump to the next one not done yet (order can change, e.g. a busy machine);
  // when the reps-in-reserve chips are shown, give time to tap one first (jumps right after the tap, or after 5 s)
  if (x.d) autoNext(g.unit !== 's' && prefs.rir ? 5000 : 650)
}
let nextT = 0
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

// value picker (kg with quarter steps; seconds and reps as whole numbers)
const fracs = [0, 0.25, 0.5, 0.75]
const pickerOpen = ref(false), pickSet = ref(0), pickInt = ref(0), pickFrac = ref(0), pickG = ref(null), pickField = ref('w')
const pickUnit = computed(() => (pickField.value === 'r' ? 'reps' : pickG.value?.unit || 'kg'))
const ints = computed(() => Array.from({ length: UNITS[pickUnit.value].max + 1 }, (_, i) => i))
const quickSteps = computed(() => { const st = UNITS[pickUnit.value].step; return [-2 * st, -st, st, 2 * st] })
const pickVal = computed(() => pickInt.value + (UNITS[pickUnit.value].frac ? pickFrac.value : 0))
function setPick(v) {
  const u = UNITS[pickUnit.value]
  v = Math.max(0, Math.min(u.max, u.frac ? Math.round(v * 4) / 4 : Math.round(v)))
  pickInt.value = Math.floor(v); pickFrac.value = Math.round((v - Math.floor(v)) * 4) / 4
}
function openPicker(g, si, field = 'w') {
  pickG.value = g; pickSet.value = si; pickField.value = field
  const a = sets(g.key)
  if (field === 'r') { setPick(a[si].r ?? DEF_REPS); pickerOpen.value = true; return }
  let w = a[si].w
  if (w == null) w = [...a].slice(0, si).reverse().find(x => x.w != null)?.w ?? lastFor(g.key, s.value)?.ex[g.key]?.[0]?.w ?? (g.unit === 'reps' ? 3 : 20)
  setPick(w)
  pickerOpen.value = true
}
function bump(q) { setPick(pickVal.value + q) }
function applyPick(all) {
  const v = pickVal.value
  const f = pickField.value
  sets(pickG.value.key).forEach((x, i) => { if (i === pickSet.value || (all && i > pickSet.value)) x[f] = f === 'r' ? Math.max(1, v) : v })
  touch(); pickerOpen.value = false
}

// ---------- hang timer ----------
// setup: pick seconds on a dial (knob position = value, 0..120 s) -> prep: 5-4-3-2-1 -> run: counts down to 0 -> done: saved.
// Stop during the run saves the seconds actually held. Based on timestamps, so it stays right if the screen sleeps.
const PREP = 5, DIAL_MIN = 5, DIAL_MAX = 120
const timer = ref(null) // { g, si, go (hang start), end (hang end) }
const tPhase = ref('setup'), tSet = ref(30), tNow = ref(Date.now()), dialEl = ref(null)
const tDial = ref(null) // exact (fractional) dial position while the finger moves – ring and knob follow it smoothly
let tRaf = 0
let tInt = null, audio = null, wake = null, beeped = new Set(), doneTimer = null
const nextSet = g => { const a = sets(g.key); const i = a.findIndex(x => !x.d); return i < 0 ? a.length - 1 : i }
const tPrepLeft = computed(() => (timer.value?.go ? Math.max(1, Math.ceil((timer.value.go - tNow.value) / 1000)) : PREP))
const tLeft = computed(() => (timer.value?.end ? Math.max(0, Math.ceil((timer.value.end - tNow.value) / 1000)) : tSet.value))
const tRing = computed(() => {
  if (tPhase.value === 'setup') return (tDial.value ?? tSet.value) / DIAL_MAX
  if (tPhase.value === 'prep') return (timer.value.go - tNow.value) / (PREP * 1000)
  if (tPhase.value === 'run') return Math.max(0, (timer.value.end - tNow.value) / (tSet.value * 1000))
  return 1
})
function defaultSecs(g, si) {
  const w = sets(g.key)[si]?.w
  if (w) return Math.min(DIAL_MAX, Math.max(DIAL_MIN, w))
  const r = String(g.target).match(/(\d+)-(\d+)\s*s/), m = String(g.target).match(/(\d+)\s*s/)
  return r ? +r[2] : m ? +m[1] : 30
}
function beep(freq = 880, ms = 140) {
  try {
    if (!audio) return
    const o = audio.createOscillator(), gn = audio.createGain()
    o.frequency.value = freq; o.connect(gn); gn.connect(audio.destination)
    gn.gain.setValueAtTime(0.3, audio.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000)
    o.start(); o.stop(audio.currentTime + ms / 1000)
  } catch {}
}
const once = (k, fn) => { if (!beeped.has(k)) { beeped.add(k); fn() } }
function tick() {
  tNow.value = Date.now()
  const tm = timer.value; if (!tm) return
  if (tPhase.value === 'prep') {
    if (tNow.value >= tm.go) { tPhase.value = 'run'; once('go', () => beep(1320, 300)) }
    else once('p' + tPrepLeft.value, () => beep(880, 110))
  }
  if (tPhase.value === 'run') {
    if (tNow.value >= tm.end) { finishHang(tSet.value); return }
    if (tLeft.value <= 3) once('l' + tLeft.value, () => beep(1100, 90))
    // every 10 s of hanging: a low "ding" – 1 at 10 s, 2 at 20 s, 3 at 30 s… (count without looking); not during the last 3 s
    const held = Math.floor((tNow.value - tm.go) / 1000)
    if (held > 0 && held % 10 === 0 && tLeft.value > 3) once('h' + held, () => {
      const n = Math.min(5, held / 10)
      for (let i = 0; i < n; i++) setTimeout(() => beep(660, 160), i * 230)
    })
  }
}
async function openTimer(g) {
  // sound must be unlocked by this tap (iOS)
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); await audio.resume() } catch {}
  const si = nextSet(g)
  timer.value = { g, si, go: 0, end: 0 }
  tSet.value = defaultSecs(g, si)
  tPhase.value = 'setup'
}
async function startTimer() {
  try { wake = await navigator.wakeLock?.request('screen') } catch {}
  const now = Date.now()
  beeped = new Set()
  timer.value.go = now + PREP * 1000
  timer.value.end = timer.value.go + tSet.value * 1000
  tPhase.value = 'prep'; tNow.value = now
  clearInterval(tInt); tInt = setInterval(tick, 100); tick()
  cancelAnimationFrame(tRaf)
  const frame = () => { if (!timer.value || tPhase.value === 'setup' || tPhase.value === 'done') return; tNow.value = Date.now(); tRaf = requestAnimationFrame(frame) }
  tRaf = requestAnimationFrame(frame)
}
function skipPrep() {
  const now = Date.now()
  timer.value.go = now; timer.value.end = now + tSet.value * 1000
  beeped.add('p1'); tick()
}
function finishHang(secs) {
  const tm = timer.value; if (!tm) return
  clearInterval(tInt); tInt = null; cancelAnimationFrame(tRaf)
  const x = sets(tm.g.key)[tm.si]
  if (secs >= 1) {
    x.w = Math.min(UNITS.s.max, secs); touch()
    if (!x.d) toggle(tm.g, tm.si)
  }
  if (secs >= tSet.value) {
    tPhase.value = 'done'
    once('end', () => { beep(1320, 160); setTimeout(() => beep(1760, 320), 200) })
    clearTimeout(doneTimer); doneTimer = setTimeout(closeTimer, 1600)
  } else closeTimer()
}
function stopTimer() {
  const tm = timer.value; if (!tm) return
  finishHang(Math.max(0, Math.floor((Date.now() - tm.go) / 1000)))
}
function closeTimer() {
  clearInterval(tInt); tInt = null; clearTimeout(doneTimer); cancelAnimationFrame(tRaf); tDial.value = null
  timer.value = null; tPhase.value = 'setup'
  try { wake?.release() } catch {}
  wake = null
}
// dial: the knob follows the finger; it can't jump across the top from 120 to 0 (or back)
let dragging = false
function dialRaw(e) { // exact position 0..DIAL_MAX (fractional); can't jump across the top
  const r = dialEl.value.getBoundingClientRect()
  const a = Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) // 0 at top, clockwise
  const v = ((a + 2 * Math.PI) % (2 * Math.PI)) / (2 * Math.PI) * DIAL_MAX
  const prev = tDial.value ?? tSet.value
  if (Math.abs(v - prev) > DIAL_MAX / 2) return prev > DIAL_MAX / 2 ? DIAL_MAX : DIAL_MIN
  return Math.min(DIAL_MAX, Math.max(DIAL_MIN, v))
}
function dialSet(e) { const v = dialRaw(e); tDial.value = v; tSet.value = Math.round(v) }
function dialDown(e) { if (tPhase.value !== 'setup') return; dragging = true; e.target.setPointerCapture?.(e.pointerId); dialSet(e) }
function dialMove(e) { if (!dragging) return; e.preventDefault(); dialSet(e) }
function dialUp() { dragging = false; tDial.value = null } // knob settles on the whole second
onUnmounted(closeTimer)

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
const niceDate = computed(() => new Date(s.value.date + 'T12:00:00').toLocaleDateString('pl-PL', { day: 'numeric', month: 'long' }))
const rows = computed(() => entriesOf(s.value.day, s.value).map(g => {
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
.tb-finish { height: 32px; margin: 0 8px 0 2px; padding: 0 14px; border: 0; border-radius: 999px; background: var(--c); color: #fff;
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
  text-transform: uppercase; letter-spacing: .3px; padding: 0 4px; }
h1.long { font-size: 24px; }
h1.xlong { font-size: 21px; }
h1 { margin: 6px 4px 4px; font-size: 28px; font-weight: 700; line-height: 1.15; letter-spacing: -.3px; text-wrap: balance; }
.ex-title { display: flex; gap: 8px; align-items: center; }
.ex-tt { flex: 1; min-width: 0; }
.ex-body { flex: none; height: 112px; }
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
.warm { margin: 8px 4px 2px; padding: 10px 12px; border-radius: 14px; background: color-mix(in srgb, #ff9f0a 10%, var(--app-card, transparent)); }
.warm-h { display: flex; align-items: center; gap: 6px; color: #ff9f0a; font-size: 14px; }
.warm-h span { margin-left: auto; font-size: 11.5px; color: var(--app-muted); }
.warm-row { display: flex; justify-content: space-between; gap: 8px; padding: 4px 0; font-size: 14.5px; border-top: 0.5px solid var(--app-line); }
.warm-h + .warm-row { border-top: 0; margin-top: 4px; }
.warm-row span { color: var(--app-muted); font-size: 13px; }
.warm-row.work b { color: var(--c); }
.warm p { margin: 4px 0 0; font-size: 12px; color: var(--app-muted); }
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

.timer-screen { position: absolute; inset: 0; z-index: 110; display: flex; flex-direction: column; align-items: center; background: var(--app-bg);
  padding: calc(env(safe-area-inset-top, 0px) + 28px) 24px calc(20px + env(safe-area-inset-bottom, 0px)); }
.tm-head { color: var(--app-muted); font-size: 15px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; }
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
.tm-adj button { height: 44px; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--c);
  font-size: 16px; font-weight: 600; }
.tm-adj button:active { opacity: .6; }
.tm-goal { min-height: 44px; margin: 22px 0 auto; font-size: 17px; font-weight: 600; color: var(--app-muted); display: grid; place-items: center; }
.tm-btns { width: 100%; display: grid; grid-template-columns: 1fr 1.6fr; gap: 10px; }
.tm-btns button { height: 56px; border: 0; border-radius: 16px; font-size: 17px; font-weight: 600; }
.tm-cancel { background: var(--app-field); color: var(--ion-text-color); }
.tm-stop { background: var(--c); color: #fff; }
.tm-btns button:active { transform: scale(.97); }
.set + .set::before { content: ''; position: absolute; top: 0; left: 28px; right: 0; border-top: 0.5px solid var(--app-line); }
.idx { color: var(--app-faint); font-weight: 600; font-size: 15px; text-align: center; }
.step { width: 44px; height: 44px; border: 0; border-radius: 50%; background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--c);
  font-size: 22px; display: grid; place-items: center; padding: 0; transition: transform .1s; }
.step:active { transform: scale(.88); }
.weight { height: 50px; border: 0; border-radius: var(--r-sm); background: none; color: var(--ion-text-color);
  display: flex; align-items: baseline; justify-content: center; gap: 4px; padding-top: 8px; transition: background .15s; }
.weight:active { background: var(--app-field); }
.weight b { font-size: 28px; font-weight: 600; letter-spacing: -.5px; }
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

.done-sv { display: inline-flex; align-items: center; gap: 5px; background: rgba(255,255,255,.18); border-radius: 999px; padding: 4px 12px; font-weight: 600; margin-top: 8px !important; }
.done-screen { position: absolute; inset: 0; z-index: 100; display: flex; flex-direction: column; color: #fff;
  background: linear-gradient(170deg, color-mix(in srgb, var(--c) 72%, #fff) 0%, var(--c) 42%, color-mix(in srgb, var(--c) 60%, #000) 100%); }
.done-hero { flex: none; text-align: center; padding: calc(env(safe-area-inset-top, 0px) + 32px) 20px 6px; }
.done-badge { width: 80px; height: 80px; margin: 0 auto 14px; border-radius: 50%; background: rgba(255,255,255,.2);
  display: grid; place-items: center; font-size: 40px; color: #ffd257; animation: pop .45s ease-out; box-shadow: 0 0 0 10px rgba(255,255,255,.08); }
@keyframes pop { 0% { transform: scale(.4); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
.done-hero h1 { margin: 0; font-size: 30px; font-weight: 700; color: #fff; }
.done-hero p { margin: 4px 0 20px; opacity: .85; font-size: 17px; }
.done-stats { display: grid; grid-template-columns: repeat(3, 1fr); background: rgba(255,255,255,.14); border-radius: var(--r-md); padding: 12px 0; }
.done-stats div + div { border-left: 0.5px solid rgba(255,255,255,.25); }
.done-stats b { display: block; font-size: 26px; font-weight: 700; }
.done-stats small { font-size: 15px; opacity: .7; font-weight: 500; }
.done-stats span { font-size: 13px; opacity: .85; }
.done-list { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior: contain; margin: 14px 16px 0; background: rgba(0,0,0,.12);
  border-radius: var(--r-md); padding: 2px 14px; align-self: stretch; max-height: max-content; }
.done-row { display: flex; justify-content: space-between; gap: 12px; padding: 12px 0; border-top: 0.5px solid rgba(255,255,255,.16); font-size: 15px; }
.done-row:first-child { border-top: 0; }
.done-row.skip { color: rgba(255,255,255,.5); }
.dn { min-width: 0; }
.dw { flex: none; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.pr { font-size: 10px; font-weight: 700; letter-spacing: .5px; background: #ffd257; color: #3b2a00; border-radius: 6px; padding: 2px 6px; }
.done-foot { flex: none; margin-top: auto; padding: 14px 16px calc(12px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 4px; }
.save-btn { height: 54px; border: 0; border-radius: 16px; background: #fff; color: var(--c); box-shadow: 0 8px 24px rgba(0,0,0,.18);
  font-size: 17px; font-weight: 600; }
.save-btn:active { transform: scale(.98); }
.back-btn { height: 44px; border: 0; background: none; color: rgba(255,255,255,.9); font-size: 17px; }
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
.wheel-sheet { --height: auto; --background: var(--app-card); --border-radius: 22px; }
.wheel-sheet .sheet { padding: 8px 16px calc(16px + env(safe-area-inset-bottom, 0px)); }
.wheel-sheet .sheet-head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 4px 0 4px; }
.wheel-sheet .sheet-head span { color: var(--app-muted); font-size: 15px; }
.wheel-sheet .sheet-head b { font-size: 20px; font-weight: 700; }
.wheel-sheet .sheet-head ion-button { justify-self: end; margin: 0; }
.wheel-sheet ion-picker { --highlight-background: var(--app-field); }
.wheel-sheet ion-picker-column-option { font-size: 22px; }
.wheel-sheet .quick { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 8px; }
.wheel-sheet .quick button { height: 44px; border: 0; border-radius: 999px; background: color-mix(in srgb, var(--c) 12%, transparent); color: var(--c); font-size: 17px; font-weight: 600; }
.wheel-sheet .quick button:active { opacity: .6; }
.wheel-sheet .apply-all { width: 100%; margin-top: 10px; height: 50px; border: 0; border-radius: 14px; background: var(--c); color: #fff !important;
  color: var(--c); font-size: 15px; font-weight: 600; }
</style>
