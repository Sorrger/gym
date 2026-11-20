<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade"><ion-toolbar><ion-title>Postępy</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar><ion-title size="large">Postępy</ion-title></ion-toolbar>
        <p class="sub">Ostatnie 4 tygodnie</p>
      </ion-header>
      <div class="page">

        <!-- all plans together -->
        <div class="card stats4 num">
          <div><small>Treningi</small><b>{{ ov.workouts }}</b></div>
          <div><small>Serie</small><b>{{ ov.sets }}</b></div>
          <div><small>Rekordy</small><b>{{ ov.prs }}<span v-if="ov.prs"> 🏆</span></b></div>
          <div><small>Siła</small><b>{{ avgGain == null ? '–' : (avgGain > 0 ? '+' : avgGain < 0 ? '−' : '±') + Math.abs(avgGain) + '%' }}</b></div>
        </div>

        <!-- per plan -->
        <h3 class="section-title">Treningi</h3>
        <div class="plans">
          <button v-for="(p, i) in plans" :key="p.key" class="pcard press" :style="{ '--c': COLORS[p.key] }" @click="router.push('/progress/' + i)">
            <div class="pc-top">
              <span class="pc-name">{{ p.name }}</span>
              <ion-icon :icon="chevronForward" class="pc-chev" />
            </div>
            <span class="pc-last">{{ p.s.last ? ago(p.s.last.date) : 'jeszcze nie było' }}</span>
            <div class="pc-bars" aria-hidden="true">
              <span v-for="(h, j) in p.s.sbars" :key="j" :style="{ height: h + '%' }" :class="{ last: j === p.s.sbars.length - 1 }"></span>
              <span v-if="!p.s.sbars.length" class="ghost" style="height: 30%"></span>
            </div>
            <div class="pc-foot num">
              <b>{{ p.s.gain == null ? '–' : (p.s.gain > 0 ? '+' : p.s.gain < 0 ? '−' : '±') + Math.abs(p.s.gain) + '%' }}</b>
              <small>siły</small>
              <em v-if="p.s.tracked">↑ {{ p.s.up }}/{{ p.s.tracked }}</em>
            </div>
          </button>
        </div>
        <p class="section-foot">Siła = średni postęp ćwiczeń od pierwszego treningu (ciężar i powtórzenia razem). ↑ = ile ćwiczeń poszło w górę ostatnio. Kliknij, żeby zobaczyć ćwiczenia.</p>

        <!-- per body part -->
        <h3 class="section-title">Partie ciała · serie na tydzień</h3>
        <div class="card muscles">
          <div class="mm-map">
            <BodyMap :main="mapMain" :help="mapHelp" labels :style="{ '--c': 'var(--accent)' }" />
          </div>
          <div class="mm-legend">
            <span><i class="lg main"></i>10+ serii</span>
            <span><i class="lg help"></i>4–10</span>
            <span><i class="lg none"></i>mniej</span>
          </div>
          <div class="mm-list">
            <div v-for="m in muscleRows" :key="m.id" class="mrow">
              <span class="m-name">{{ m.name }}</span>
              <div class="m-bar"><span :class="m.level" :style="{ width: m.pct + '%' }"></span><i class="zone"></i></div>
              <span class="m-val num">{{ fmtSets(m.v) }}</span>
            </div>
          </div>
        </div>
        <p class="section-foot">Średnio na tydzień z 4 tygodni. Główna praca mięśnia = 1 seria, pomocnicza = ½. Badania: najwięcej daje ok. 10–20 serii na partię tygodniowo, pole w tle to ten zakres.</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { PLAN, COLORS } from '../plan'
import { state, ago } from '../store'
import { overview, planSummary, muscleWeek } from '../stats'
import { MUSCLE_NAMES } from '../muscles'
import BodyMap from './BodyMap.vue'

const router = useIonRouter()
const ov = computed(() => { void state.sessions; return overview(28) })
const plans = computed(() => { void state.sessions; return PLAN.map((p, i) => ({ ...p, s: planSummary(i) })) })
const avgGain = computed(() => { const g = plans.value.map(p => p.s.gain).filter(x => x != null); return g.length ? Math.round(g.reduce((a, b) => a + b, 0) / g.length) : null })
const mw = computed(() => { void state.sessions; return muscleWeek(28) })

const ORDER = ['chest', 'shoulders', 'reardelts', 'triceps', 'biceps', 'lats', 'upperback', 'quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques']
const SCALE = 24 // bar = 0..24 sets/week; the 10–20 zone is drawn behind
const muscleRows = computed(() => ORDER.map(id => {
  const v = mw.value[id] || 0
  return { id, name: MUSCLE_NAMES[id], v, pct: Math.min(100, v / SCALE * 100), level: v >= 10 ? 'main' : v >= 4 ? 'help' : 'low' }
}))
const mapMain = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 10))
const mapHelp = computed(() => Object.keys(mw.value).filter(k => mw.value[k] >= 4 && mw.value[k] < 10))
const fmtSets = v => String(Math.round(v * 2) / 2).replace('.', ',')
</script>

<style scoped>
.stats4 { margin: 0 16px; display: grid; grid-template-columns: repeat(4, 1fr); padding: 14px 6px; }
.stats4 div { display: flex; flex-direction: column; align-items: center; gap: 2px; border-left: 1px solid var(--app-line); }
.stats4 div:first-child { border-left: 0; }
.stats4 small { font-size: 12px; color: var(--app-muted); }
.stats4 b { font-size: 20px; font-weight: 700; letter-spacing: -.4px; white-space: nowrap; }
.stats4 b span { font-size: 14px; }

.plans { margin: 0 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.pcard { text-align: left; border: 0; border-radius: var(--r-lg); padding: 14px; color: #fff; font: inherit; display: flex; flex-direction: column; min-height: 168px;
  background: linear-gradient(150deg, color-mix(in srgb, var(--c) 80%, #fff) 0%, var(--c) 55%, color-mix(in srgb, var(--c) 82%, #000) 100%);
  box-shadow: 0 8px 22px color-mix(in srgb, var(--c) 28%, transparent); }
.pc-top { display: flex; justify-content: space-between; align-items: center; }
.pc-name { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }
.pc-chev { font-size: 18px; opacity: .8; }
.pc-last { font-size: 12px; opacity: .85; }
.pc-bars { display: flex; align-items: flex-end; gap: 4px; height: 48px; margin-top: auto; padding-top: 10px; }
.pc-bars span { flex: 1; max-width: 16px; border-radius: 4px 4px 2px 2px; background: rgba(255,255,255,.35); }
.pc-bars span.last { background: #fff; }
.pc-bars span.ghost { background: rgba(255,255,255,.18); max-width: none; }
.pc-foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; }
.pc-foot b { font-size: 17px; font-weight: 700; }
.pc-foot small { font-size: 13px; opacity: .85; margin-left: -2px; }
.pc-foot em { margin-left: auto; font-style: normal; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; background: rgba(255,255,255,.25); }

.muscles { margin: 0 16px; padding: 16px; }
.mm-map { height: 170px; display: flex; justify-content: center; }
.mm-legend { display: flex; justify-content: center; gap: 14px; margin: 8px 0 12px; font-size: 12px; color: var(--app-muted); }
.mm-legend span { display: flex; align-items: center; gap: 5px; }
.lg { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.lg.main { background: var(--accent); }
.lg.help { background: color-mix(in srgb, var(--accent) 40%, transparent); }
.lg.none { background: color-mix(in srgb, var(--ion-text-color) 12%, transparent); }
.mm-list { display: flex; flex-direction: column; gap: 9px; }
.mrow { display: grid; grid-template-columns: 118px 1fr 34px; align-items: center; gap: 10px; font-size: 14px; }
.m-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.m-bar { position: relative; height: 10px; border-radius: 999px; background: var(--app-field); overflow: hidden; }
.m-bar .zone { position: absolute; left: calc(10 / 24 * 100%); width: calc(10 / 24 * 100%); top: 0; bottom: 0; background: color-mix(in srgb, var(--app-ok) 16%, transparent); }
.m-bar span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px; z-index: 1; transition: width .5s cubic-bezier(.2,.8,.2,1); }
.m-bar span.main { background: var(--accent); }
.m-bar span.help { background: color-mix(in srgb, var(--accent) 55%, transparent); }
.m-bar span.low { background: var(--app-bad); }
.m-val { text-align: right; font-weight: 600; color: var(--app-muted); }
</style>
