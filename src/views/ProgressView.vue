<template>
  <ion-page>
    <ion-content>
      <div class="page">
        <header class="page-head">
          <h1>Postępy</h1>
          <p>{{ plan.name }} · najlepsza seria w każdym ćwiczeniu</p>
        </header>

        <div class="plans" role="tablist">
          <button v-for="(d, i) in PLAN" :key="d.key" role="tab" :aria-selected="i === day" class="plan-tab"
            :class="{ on: i === day }" :style="{ '--c': COLORS[d.key] }" @click="ui.progressDay = i">
            <span class="ico">{{ d.abbr }}</span>
            <span class="pn">{{ d.name }}</span>
          </button>
        </div>

        <div class="tiles">
          <button v-for="(t, i) in tiles" :key="t.key" class="tile" :style="{ '--c': COLORS[plan.key] }" @click="open(i)">
            <div class="t-head">
              <span class="t-name">{{ t.name }}<template v-if="t.label"> · {{ t.label }}</template></span>
              <ion-icon :icon="chevronForward" class="chev" />
            </div>
            <div class="t-val num" v-if="t.pts.length">
              <b>{{ fmtNum(t.last) }}</b><small>{{ UNITS[t.unit].short }}</small>
              <span class="delta" v-if="t.pts.length > 1" :class="t.diff > 0 ? 'up' : t.diff < 0 ? 'down' : 'flat'">
                {{ t.diff > 0 ? '+' : t.diff < 0 ? '−' : '±' }}{{ fmtNum(Math.abs(t.diff)) }}
              </span>
            </div>
            <div class="t-val empty" v-else>Brak zapisów</div>
            <svg class="spark" viewBox="0 0 100 32" preserveAspectRatio="none" v-if="t.pts.length > 1" aria-hidden="true">
              <path :d="t.area" class="area" />
              <path :d="t.line" class="line" />
              <circle :cx="t.endX" :cy="t.endY" r="2.6" class="end" />
            </svg>
            <div class="spark-empty" v-else></div>
            <div class="t-foot">
              <span v-if="t.pts.length">Rekord {{ fmtVal(t.best, t.unit) }}</span>
              <span v-else>&nbsp;</span>
              <span v-if="t.pts.length" class="num">{{ t.pts.length }}×</span>
            </div>
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
import { computed } from 'vue'
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { chevronForward } from 'ionicons/icons'
import { PLAN, COLORS, UNITS, entriesOf, fmtNum, fmtVal } from '../plan'
import { state, ui, series } from '../store'

const router = useIonRouter()
const day = computed(() => ui.progressDay)
const plan = computed(() => PLAN[day.value])

const tiles = computed(() => {
  void state.sessions
  return entriesOf(day.value).map(g => {
    const pts = series(g.key)
    const ws = pts.map(p => p.w)
    const t = { ...g, pts, last: ws[ws.length - 1], best: ws.length ? Math.max(...ws) : null, diff: ws.length ? ws[ws.length - 1] - ws[0] : 0 }
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

function open(i) { router.push(`/exercise/${day.value}/${i}`) }
</script>

<style scoped>

.plans { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 0 16px 14px; }
.plan-tab { border: 0; background: var(--app-card); border-radius: 18px; padding: 10px 4px 8px; display: flex; flex-direction: column;
  align-items: center; gap: 6px; color: var(--ion-text-color); font: inherit; transition: background .15s, transform .1s; }
.plan-tab:active { transform: scale(.96); }
.plan-tab .ico { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; font-weight: 800; font-size: 14px;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); transition: background .15s, color .15s; }
.plan-tab .pn { font-size: 12px; font-weight: 600; line-height: 1.15; text-align: center; color: var(--app-muted); }
.plan-tab.on { background: linear-gradient(140deg, color-mix(in srgb, var(--c) 75%, #fff), var(--c) 75%); box-shadow: 0 6px 16px color-mix(in srgb, var(--c) 30%, transparent); }
.plan-tab.on .ico { background: rgba(255,255,255,.22); color: #fff; }
.plan-tab.on .pn { color: #fff; }

.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 16px; }
.tile { position: relative; text-align: left; border: 0; border-radius: 20px;
  background: linear-gradient(170deg, color-mix(in srgb, var(--c) 7%, var(--app-card)), var(--app-card) 60%); padding: 12px 12px 10px;
  color: var(--ion-text-color); font: inherit; display: flex; flex-direction: column; min-height: 168px; overflow: hidden; transition: transform .1s; }
.tile:active { transform: scale(.97); }
.t-head { display: flex; justify-content: space-between; gap: 4px; min-height: 38px; }
.t-name { font-size: 14px; font-weight: 600; line-height: 1.2; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.chev { flex: none; color: var(--app-muted); font-size: 16px; margin-top: 1px; }
.t-val { display: flex; align-items: baseline; gap: 3px; margin-top: 6px; }
.t-val b { font-size: 28px; font-weight: 800; letter-spacing: -.5px; }
.t-val small { color: var(--app-muted); font-size: 14px; }
.t-val.empty { color: var(--app-muted); font-size: 14px; height: 34px; align-items: center; }
.delta { margin-left: auto; font-size: 12px; font-weight: 700; border-radius: 8px; padding: 2px 6px; align-self: center; }
.delta.up { color: var(--app-ok); background: color-mix(in srgb, var(--app-ok) 14%, transparent); }
.delta.down { color: #e8453c; background: rgba(232,69,60,.12); }
.delta.flat { color: var(--app-muted); background: var(--app-field); }
.spark { width: 100%; height: 40px; margin-top: 6px; overflow: visible; }
.spark .line { fill: none; stroke: var(--c); stroke-width: 2; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
.spark .area { fill: color-mix(in srgb, var(--c) 16%, transparent); stroke: none; }
.spark .end { fill: var(--c); }
.spark-empty { height: 40px; margin-top: 6px; border-bottom: 2px dashed var(--app-line); }
.t-foot { display: flex; justify-content: space-between; margin-top: auto; padding-top: 6px; font-size: 12px; color: var(--app-muted); }
</style>
