<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade"><ion-toolbar><ion-title>Postępy</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar><ion-title size="large">Postępy</ion-title></ion-toolbar>
        <p class="sub">{{ plan.name }} · najlepsza seria w każdym ćwiczeniu</p>
      </ion-header>
      <div class="page">

        <ion-segment class="seg" :value="String(day)" @ionChange="e => (ui.progressDay = +e.detail.value)">
          <ion-segment-button v-for="(d, i) in PLAN" :key="d.key" :value="String(i)"><ion-label>{{ d.key === 'chestback' ? 'K + P' : d.name }}</ion-label></ion-segment-button>
        </ion-segment>

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
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSegment, IonSegmentButton, IonLabel, useIonRouter } from '@ionic/vue'
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
.seg { margin: 4px 16px 16px; width: auto; --background: var(--app-field); }
.seg ion-segment-button { --indicator-color: var(--app-card); --color: var(--ion-text-color); --color-checked: var(--ion-text-color); font-size: 13px; font-weight: 600; min-height: 32px; }

.tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 16px; }
.tile { position: relative; text-align: left; border: 0; border-radius: var(--r-lg); background: var(--app-card); padding: 14px 14px 12px;
  color: var(--ion-text-color); font: inherit; display: flex; flex-direction: column; min-height: 172px; overflow: hidden; box-shadow: var(--app-shadow);
  transition: transform .15s cubic-bezier(.2,.8,.2,1); }
.tile:active { transform: scale(.97); }
.t-head { display: flex; justify-content: space-between; gap: 4px; min-height: 38px; }
.t-name { font-size: 15px; font-weight: 600; line-height: 1.25; letter-spacing: -.2px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.chev { flex: none; color: var(--app-faint); font-size: 16px; margin-top: 1px; }
.t-val { display: flex; align-items: baseline; gap: 3px; margin-top: 8px; }
.t-val b { font-size: 30px; font-weight: 700; letter-spacing: -.6px; }
.t-val small { color: var(--app-muted); font-size: 15px; }
.t-val.empty { color: var(--app-faint); font-size: 15px; height: 36px; align-items: center; }
.delta { margin-left: auto; font-size: 12px; font-weight: 600; border-radius: 999px; padding: 2px 7px; align-self: center; }
.delta.up { color: var(--app-ok); background: color-mix(in srgb, var(--app-ok) 14%, transparent); }
.delta.down { color: var(--app-bad); background: color-mix(in srgb, var(--app-bad) 12%, transparent); }
.delta.flat { color: var(--app-muted); background: var(--app-field); }
.spark { width: 100%; height: 40px; margin-top: 6px; overflow: visible; }
.spark .line { fill: none; stroke: var(--c); stroke-width: 2.2; vector-effect: non-scaling-stroke; stroke-linejoin: round; stroke-linecap: round; }
.spark .area { fill: color-mix(in srgb, var(--c) 14%, transparent); stroke: none; }
.spark .end { fill: var(--c); }
.spark-empty { height: 40px; margin-top: 6px; border-bottom: 2px dashed var(--app-line); }
.t-foot { display: flex; justify-content: space-between; margin-top: auto; padding-top: 8px; font-size: 12px; color: var(--app-muted); }
</style>
