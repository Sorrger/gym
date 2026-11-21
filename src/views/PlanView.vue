<template>
  <ion-page>
    <ion-header class="sh-header">
      <ion-toolbar>
        <div class="sh-bar" :style="{ '--c': color }">
          <button class="rb press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button>
          <div class="sh-title"><b>Plan treningu</b><span v-if="plan">{{ plan.ex.length }} ćwiczeń · ok. {{ minutes }} min</span></div>
          <div class="sh-right">
            <button v-if="plan" class="rb tint press" @click="router.push('/progress/' + day)" aria-label="Postępy planu"><ion-icon :icon="statsChart" /></button>
          </div>
        </div>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div v-if="plan" class="page" :style="{ '--c': color }">
        <div class="hero card">
          <span class="plan-ico big">{{ plan.abbr }}</span>
          <div class="hero-txt">
            <h1>{{ plan.name }}</h1>
            <p>{{ lastTxt }}</p>
          </div>
          <BodyMap class="hero-map" v-bind="dayMuscles(day)" />
        </div>
        <div v-if="dl.active || dl.due" class="dl-box"><ion-icon :icon="trendingDown" /><div><b>Tydzień lżejszy (deload)</b><span>Połowa serii, ok. 10% lżej, zostaw 3-4 powtórzenia w zapasie. Apka sama ustawi ciężary.</span></div></div>
        <p v-if="plan.note" class="tip"><ion-icon :icon="informationCircle" /> {{ plan.note }}</p>

        <div class="card exs">
          <div v-for="(ex, i) in rows" :key="ex.name" class="ex">
            <span class="n num">{{ i + 1 }}</span>
            <div class="ex-body">
              <b>{{ ex.name }}</b>
              <span v-if="ex.stage" class="stage num">{{ ex.stage.t }}<small v-if="ex.stage.goal">Następny etap: {{ ex.stage.goal }}</small></span>
              <div v-for="g in ex.groups" :key="g.key" class="g">
                <span class="tgt num">{{ g.label ? g.label + ': ' : '' }}{{ g.target }}</span>
                <span class="last num" v-if="g.last">ostatnio {{ g.last }}</span>
                <span class="last none" v-else>jeszcze nie robione</span>
              </div>
            </div>
          </div>
        </div>
        <div class="spacer"></div>
      </div>
      <div v-else class="page"><div class="card empty">Nie ma takiego planu.</div></div>
    </ion-content>
    <ion-footer v-if="plan" class="go-foot">
      <button class="go press" :style="{ '--c': color }" @click="go">
        <ion-icon :icon="play" /> {{ active && active.day === day ? 'Kontynuuj trening' : 'Rozpocznij trening' }}
      </button>
    </ion-footer>
  </ion-page>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IonPage, IonHeader, IonToolbar, IonContent, IonFooter, IonIcon, useIonRouter } from '@ionic/vue'
import { chevronBack, statsChart, play, informationCircle, trendingDown } from 'ionicons/icons'
import { PLAN, COLORS, UNITS, groupsOf, fmtNum, targetOf, PULLUP_STAGES, stageOf } from '../plan'
import { dayMuscles } from '../muscles'
import { state, sorted, lastDoneOf, activeSession, ago, deloadState, deloadSets } from '../store'
import { startPlan } from '../startFlow'
import BodyMap from './BodyMap.vue'

const route = useRoute(), router = useIonRouter()
// Ionic keeps this page alive under the next one: keep the last valid day
const day = ref(+route.params.day)
watch(() => route.params.day, d => { if (d != null && PLAN[+d]) day.value = +d })
const plan = computed(() => PLAN[day.value] || null)
const color = computed(() => (plan.value ? COLORS[plan.value.key] : 'var(--accent)'))
const active = computed(() => { void state.sessions; return activeSession() })
const lastTxt = computed(() => { void state.sessions; const l = lastDoneOf(day.value); return l ? 'Ostatnio ' + ago(l.date) : 'Jeszcze nie robiony' })
// rough time: ~2,5 min per set incl. rest
const dl = computed(() => { void state.sessions; return deloadState() })
const minutes = computed(() => { void state.sessions; const half = dl.value.active || dl.value.due; return Math.round(plan.value.ex.flatMap(e => groupsOf(e)).reduce((a, g) => a + (half ? deloadSets(g.sets) : g.sets), 0) * 2.5 / 5) * 5 })

function lastOf(g) {
  const s = sorted().find(o => (o.ex?.[g.key] || []).some(x => x.d))
  if (!s) return ''
  const done = s.ex[g.key].filter(x => x.d)
  if (done.every(x => x.w == null)) return done.length + ' serie'
  if (g.unit !== 'kg') return done.map(x => fmtNum(x.w)).join(' · ') + ' ' + UNITS[g.unit].short
  const ws = new Set(done.map(x => x.w))
  return ws.size === 1 ? `${fmtNum(done[0].w)} kg × ${done.map(x => x.r ?? '–').join(', ')}` : done.map(x => `${fmtNum(x.w)}×${x.r ?? '–'}`).join(' · ')
}
const rows = computed(() => { void state.sessions; return plan.value ? plan.value.ex.map(e => ({ name: e[0], stage: e[3] === 'stages' ? stageText() : '', groups: groupsOf(e).map(g => ({ ...g, last: lastOf(g) })) })) : [] })

function stageText() { const st = PULLUP_STAGES[stageOf() - 1]; return { t: targetOf(['', '', '', 'stages']), goal: st.goal } }
function goBack() { if (router.canGoBack()) router.back(); else router.navigate('/tabs/home', 'back', 'replace') }
const go = () => startPlan(day.value, router)
</script>

<style scoped>
.sh-header ion-toolbar { --background: var(--app-bg); --border-width: 0 !important; --min-height: 56px; }
.sh-header::after { display: none; }
.sh-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 6px 14px; }
.sh-title { text-align: center; display: flex; flex-direction: column; line-height: 1.15; }
.sh-title b { font-size: 17px; font-weight: 700; letter-spacing: -.3px; }
.sh-title span { font-size: 12.5px; color: var(--app-muted); font-weight: 500; margin-top: 1px; }
.sh-right { display: flex; justify-content: flex-end; gap: 10px; }
.rb { width: 38px; height: 38px; border-radius: 50%; border: 0; display: grid; place-items: center; padding: 0; background: var(--app-card); color: var(--ion-text-color); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.rb ion-icon { font-size: 21px; }
.rb.tint { background: color-mix(in srgb, var(--c) 18%, var(--app-card)); color: var(--c); }
.hero { display: flex; align-items: center; gap: 14px; background: color-mix(in srgb, var(--c) 14%, var(--app-card)); }
.plan-ico.big { width: 52px; height: 52px; font-size: 18px; border-radius: 15px; flex: none; }
.hero-txt { flex: 1; min-width: 0; }
.hero h1 { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -.4px; }
.hero p { margin: 2px 0 0; color: var(--app-muted); font-size: 14px; }
.hero-map { width: 74px; flex: none; }
.tip { display: flex; gap: 8px; align-items: flex-start; margin: 0 20px 12px; color: var(--app-muted); font-size: 14px; line-height: 1.35; }
.tip ion-icon { color: var(--c); font-size: 19px; flex: none; margin-top: 1px; }
.exs { padding-top: 4px; padding-bottom: 4px; }
.ex { display: flex; gap: 12px; padding: 12px 0; }
.ex + .ex { border-top: 0.5px solid var(--app-line); }
.n { width: 26px; height: 26px; border-radius: 50%; flex: none; display: grid; place-items: center; font-size: 13px; font-weight: 700;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); margin-top: 1px; }
.ex-body { min-width: 0; flex: 1; }
.ex-body b { font-size: 15.5px; font-weight: 600; line-height: 1.3; display: block; }
.g { display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 10px; margin-top: 4px; }
.tgt { font-size: 14px; font-weight: 600; color: var(--c); }
.last { font-size: 13.5px; color: var(--app-muted); }
.last.none { color: var(--app-faint, var(--app-muted)); }
.spacer { height: 100px; }
.empty { color: var(--app-muted); text-align: center; padding: 28px; }
.go-foot { padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px)); background: linear-gradient(to top, var(--app-bg) 70%, transparent); }
.go-foot::before { display: none; }
.go { width: 100%; height: 56px; border: 0; border-radius: 18px; background: var(--c); color: #fff; font: inherit; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 8px 22px color-mix(in srgb, var(--c) 35%, transparent); }
.go ion-icon { font-size: 22px; }
.stage { display: block; font-size: 13px; color: var(--c); font-weight: 600; margin: 1px 0 2px; }
.stage small { display: block; font-size: 12px; font-weight: 400; color: var(--app-muted); margin-top: 1px; }
.dl-box { display: flex; gap: 12px; align-items: flex-start; margin: 0 16px 14px; padding: 12px 14px; border-radius: 16px; color: #0a84ff; background: color-mix(in srgb, #0a84ff 9%, var(--app-card)); }
.dl-box ion-icon { font-size: 20px; padding: 7px; border-radius: 10px; flex: none; background: color-mix(in srgb, #0a84ff 16%, transparent); }
.dl-box b { display: block; font-size: 15px; font-weight: 600; }
.dl-box span { display: block; margin-top: 2px; font-size: 13.5px; line-height: 1.35; color: var(--app-muted); }
</style>
