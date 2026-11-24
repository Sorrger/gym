<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start"><ion-back-button default-href="/tabs/progress" text="Postępy" /></ion-buttons>
        <ion-title>{{ plan.name }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content :fullscreen="true">
      <div class="page pp">


        <!-- summary of the chosen plan -->
        <div class="sum" :style="{ '--c': COLORS[plan.key] }">
          <div class="sum-top">
            <span class="plan-ico sm">{{ plan.abbr }}</span>
            <div class="sum-t">
              <b>{{ plan.name }}</b>
              <span>{{ summary.last ? 'Ostatnio ' + fmtShort(summary.last.date) + ' · ' + ago(summary.last.date) : 'Jeszcze bez treningów' }}</span>
            </div>
          </div>
          <div class="sum-stats num">
            <div><small>Siła od startu</small><b>{{ summary.gain == null ? '–' : (summary.gain > 0 ? '+' : summary.gain < 0 ? '−' : '±') + Math.abs(summary.gain) + '%' }}</b></div>
            <div><small>W górę</small><b>{{ summary.tracked ? summary.up + '/' + summary.tracked : '–' }}</b></div>
            <div><small>Rekordy</small><b>{{ summary.prs }}</b></div>
            <div><small>Treningi</small><b>{{ summary.count }}</b></div>
          </div>
          <div class="bars" v-if="summary.sbars.length > 1" aria-hidden="true">
            <span v-for="(h, i) in summary.sbars" :key="i" :style="{ height: h + '%' }" :class="{ last: i === summary.sbars.length - 1 }"></span>
          </div>
          <p class="bars-cap">Siła z ostatnich treningów (średnio ze wszystkich ćwiczeń) · rekordy z 30 dni</p>
        </div>

        <h3 class="section-title">Ćwiczenia</h3>
        <div class="list">
          <template v-for="(t, i) in tiles" :key="t.key">
          <button v-if="!t.alt || t.pts.length" class="row-card press" :class="{ empty: !t.pts.length }" :style="{ '--c': COLORS[plan.key] }" @click="open(i)">
            <div class="rc-main">
              <span class="rc-name"><small v-if="t.label || t.alt" class="rc-parent">{{ t.alt ? 'Zamiennik' : t.name }}</small>{{ t.label || t.name }}</span>
              <div class="rc-val num" v-if="t.pts.length">
                <b>{{ fmtNum(t.last) }}</b><small>{{ UNITS[t.unit].short }}<template v-if="t.lastR"> × {{ t.lastR }}</template></small>
                <span v-if="t.pr" class="pr" title="Nowy rekord"><Ico name="trophy" /></span>
              </div>
              <div class="rc-val none" v-else>Jeszcze nie robione</div>
              <div class="rc-meta" v-if="t.pts.length">
                <span class="status" :class="t.status.kind">{{ t.status.text }}</span>
                <span class="num">Rekord {{ fmtVal(t.best, t.unit) }}</span>
              </div>
            </div>
            <div class="rc-side">
              <span class="delta num" v-if="t.pts.length > 1" :class="t.diff > 0 ? 'up' : t.diff < 0 ? 'down' : 'flat'">
                {{ t.diff > 0 ? '+' : t.diff < 0 ? '−' : '±' }}{{ fmtNum(Math.abs(t.diff)) }}
              </span>
              <svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none" v-if="t.pts.length > 1" aria-hidden="true">
                <path :d="t.area" class="area" /><path :d="t.line" class="line" />
                <circle :cx="t.endX" :cy="t.endY" r="3" class="end" />
              </svg>
              <ion-icon :icon="chevronForward" class="chev" />
            </div>
          </button>
          </template>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import Ico from './Ico.vue'
import { computed } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonButtons, IonBackButton, useIonRouter } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { PLAN, COLORS, UNITS, isAssisted, entriesOf, groupsOf, fmtNum, fmtVal } from '../plan'
import { useRoute } from 'vue-router'
import { state, series, fmtShort, ago } from '../store'
import { planSummary } from '../stats'
import { suggest } from '../coach'

const router = useIonRouter()
const ASS = { has: (g) => isAssisted(g) }
const route = useRoute()
const day = computed(() => Math.min(PLAN.length - 1, Math.max(0, +route.params.day || 0)))
const plan = computed(() => PLAN[day.value])

const tiles = computed(() => {
  void state.sessions
  const now = new Set(entriesOf(day.value).map(g => g.key)) // parts of the current pull-up stage
  return entriesOf(day.value, 'all').map(g => {
    const pts = series(g.key)
    const ws = pts.map(p => p.w)
    const prevBest = ws.length > 1 ? (ASS.has(g) ? Math.min(...ws.slice(0, -1)) : Math.max(...ws.slice(0, -1))) : null
    const t = { ...g, pts, pr: prevBest != null && (ASS.has(g) ? ws[ws.length - 1] < prevBest : ws[ws.length - 1] > prevBest), status: now.has(g.key) || g.alt ? statusOf(g) : { kind: 'up', text: '✓ Etap zaliczony' },
      last: ws[ws.length - 1], lastR: pts.length ? pts[pts.length - 1].r : null, best: ws.length ? (ASS.has(g) ? Math.min(...ws) : Math.max(...ws)) : null, diff: ws.length ? ws[ws.length - 1] - ws[0] : 0 }
    if (pts.length > 1) {
      const lo = Math.min(...ws), hi = Math.max(...ws), span = hi - lo || 1
      const xy = ws.map((w, i) => [i * 100 / (ws.length - 1), 28 - ((w - lo) / span) * 24])
      t.line = 'M' + xy.map(([x, y]) => x.toFixed(1) + ' ' + y.toFixed(1)).join(' L')
      t.area = t.line + ' L100 32 L0 32 Z'
      ;[t.endX, t.endY] = xy[xy.length - 1]
    }
    return t
  })
})

// what to do next time, from the coach (same logic as the hint on the workout screen)
const FUTURE = { id: '_progress', date: '9999-12-31', started: Infinity }
function statusOf(g) {
  const x = suggest(g, FUTURE)
  if (!x || x.kind === 'first') return { kind: 'none', text: '' }
  if (x.kind === 'stage') return { kind: 'up', text: 'Nowy etap' }
  if (x.kind === 'up') return { kind: 'up', text: g.unit === 'kg' ? (ASS.has(g) ? '↑ Mniej wspomagania' : '↑ Gotowe na więcej') : '↑ Utrudnij' }
  if (x.kind === 'down') return { kind: 'down', text: '↓ Zejdź z ciężaru' }
  return { kind: 'same', text: 'Dobijaj powtórzenia' }
}

const summary = computed(() => { void state.sessions; return planSummary(day.value) })

function open(i) { router.push(`/exercise/${day.value}/${i}`) }
</script>

<style scoped>

.pp { padding-top: 12px; }
.sum { margin: 0 16px; border-radius: var(--r-lg); padding: 16px; color: #fff; box-shadow: 0 10px 28px color-mix(in srgb, var(--c) 30%, transparent);
  background: linear-gradient(140deg, color-mix(in srgb, var(--c) 82%, #fff) 0%, var(--c) 55%, color-mix(in srgb, var(--c) 82%, #000) 100%); }
.sum-top { display: flex; align-items: center; gap: 12px; }
.plan-ico.sm { --s: 40px; background: rgba(255,255,255,.22) !important; box-shadow: none; color: #fff; }
.sum-t { display: flex; flex-direction: column; }
.sum-t b { font-size: 20px; font-weight: 700; letter-spacing: -.3px; }
.sum-t span { font-size: 13px; opacity: .85; }
.sum-stats { display: grid; grid-template-columns: 1.25fr 1fr .9fr .9fr; gap: 8px; margin-top: 14px; }
.sum-stats div { display: flex; flex-direction: column; background: rgba(255,255,255,.16); border-radius: 14px; padding: 8px 10px; }
.sum-stats small { font-size: 11px; white-space: nowrap; opacity: .85; font-weight: 500; }
.sum-stats b { font-size: 18px; font-weight: 700; letter-spacing: -.3px; }
.sum-stats em { font-style: normal; font-size: 11px; font-weight: 700; border-radius: 999px; padding: 1px 7px; align-self: flex-start; margin-top: 2px; background: rgba(255,255,255,.25); }
.bars { display: flex; align-items: flex-end; gap: 6px; height: 56px; margin-top: 14px; }
.bars span { flex: 1; max-width: 30px; border-radius: 6px 6px 3px 3px; background: rgba(255,255,255,.35); min-height: 4px; transition: height .4s cubic-bezier(.2,.8,.2,1); }
.bars span.last { background: #fff; }
.bars-cap { margin: 6px 0 0; font-size: 11px; opacity: .8; }

.list { margin: 0 16px; display: flex; flex-direction: column; gap: 10px; }
.row-card { display: flex; gap: 10px; text-align: left; border: 0; border-radius: 20px; background: var(--app-card); padding: 14px 10px 14px 16px; color: var(--ion-text-color);
  font: inherit; box-shadow: var(--app-shadow); align-items: stretch; position: relative; overflow: hidden; }
.row-card::before { content: ''; position: absolute; left: 0; top: 14px; bottom: 14px; width: 4px; border-radius: 0 4px 4px 0; background: var(--c); }
.row-card.empty::before { background: var(--app-line); }
.rc-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rc-name { font-size: 15px; font-weight: 600; line-height: 1.25; letter-spacing: -.2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.rc-val { display: flex; align-items: baseline; gap: 3px; }
.rc-val b { font-size: 28px; font-weight: 700; letter-spacing: -.6px; }
.rc-val small { color: var(--app-muted); font-size: 15px; }
.rc-val .pr { font-size: 16px; margin-left: 4px; }
.rc-val.none { color: var(--app-faint); font-size: 14px; }
.rc-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; font-size: 12px; color: var(--app-muted); }
.status { font-weight: 600; border-radius: 999px; padding: 2px 8px; }
.status.none { display: none; }
.status.up { color: var(--app-ok); background: color-mix(in srgb, var(--app-ok) 14%, transparent); }
.status.same { color: var(--ion-text-color); background: var(--app-field); }
.status.down { color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 12%, transparent); }
.rc-side { flex: none; width: 104px; display: flex; flex-direction: column; align-items: flex-end; justify-content: space-between; gap: 6px; position: relative; padding-right: 18px; }
.rc-side .chev { position: absolute; right: 0; top: 50%; transform: translateY(-50%); color: var(--app-faint); font-size: 16px; }
.delta { font-size: 12px; font-weight: 700; border-radius: 999px; padding: 2px 8px; }
.delta.up { color: var(--app-ok); background: color-mix(in srgb, var(--app-ok) 14%, transparent); }
.delta.down { color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 12%, transparent); }
.delta.flat { color: var(--app-muted); background: var(--app-field); }
.spark { width: 86px; height: 40px; overflow: visible; margin-top: auto; }
.spark .line { fill: none; stroke: var(--c); stroke-width: 2.4; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
.spark .area { fill: color-mix(in srgb, var(--c) 16%, transparent); stroke: none; }
.spark .end { fill: var(--c); stroke: var(--app-card); stroke-width: 1.5; vector-effect: non-scaling-stroke; }
.rc-parent { display: block; font-size: 12px; font-weight: 500; color: var(--app-muted); margin-bottom: 1px; }
</style>
