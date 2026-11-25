<!-- end-of-workout screen: counts, records of this workout, every exercise with its best set -->
<template>
  <div class="done-screen">
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
    <div v-if="prs.length" class="rec-card">
      <div class="rec-head"><Ico name="trophy" /> {{ prs.length === 1 ? 'Nowy rekord' : 'Nowe rekordy' }}</div>
      <div v-for="r in prs" :key="r.key" class="rec-row">
        <span class="rn">{{ r.name }}<template v-if="r.label"> · {{ r.label }}</template></span>
        <span class="rv num"><b>{{ fmtVal(r.max, r.unit) }}</b><small>{{ r.as ? 'pomoc było ' : 'było ' }}{{ fmtVal(r.prev, r.unit) }}</small></span>
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
      <button class="save-btn" @click="emit('save')">{{ c.n ? 'Zapisz trening' : 'Wyjdź bez zapisu' }}</button>
      <button class="back-btn" @click="emit('back')">Wróć do treningu</button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { trophy, heart } from 'ionicons/icons'
import Ico from '../Ico.vue'
import { LOC } from '../../i18n'
import { stravaFor, svText } from '../../strava'
import { entriesOf, fmtVal } from '../../plan'
import { counts } from '../../store'
import { sessionRecords } from './records'

const props = defineProps({ s: { type: Object, required: true }, plan: { type: Object, required: true } })
const emit = defineEmits(['save', 'back'])
const c = computed(() => counts(props.s))
const sv = computed(() => stravaFor(props.s.id))
const niceDate = computed(() => new Date(props.s.date + 'T12:00:00').toLocaleDateString(LOC(), { day: 'numeric', month: 'long' }))
const rows = computed(() => sessionRecords(props.s, entriesOf(props.s.day, props.s)))
const prs = computed(() => rows.value.filter(r => r.pr))
const exDone = computed(() => new Set(rows.value.filter(r => r.done).map(r => r.ex)).size)
</script>

<style scoped>
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
.rec-card { flex: none; margin: 14px 16px 0; border-radius: var(--r-md); padding: 12px 14px 6px; color: #3b2a00;
  background: linear-gradient(135deg, #ffe58a, #ffc93c); box-shadow: 0 8px 24px rgba(0,0,0,.18); animation: pop .5s ease-out .15s both; }
.rec-head { display: flex; align-items: center; gap: 7px; font-weight: 800; font-size: 16px; margin-bottom: 4px; }
.rec-head .ico { font-size: 20px; }
.rec-row { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 0; border-top: 0.5px solid rgba(59,42,0,.15); font-size: 15px; }
.rec-row:first-of-type { border-top: 0; }
.rn { min-width: 0; font-weight: 600; }
.rv { flex: none; text-align: right; display: flex; flex-direction: column; }
.rv b { font-size: 17px; }
.rv small { font-size: 12px; opacity: .7; }
.back-btn { height: 44px; border: 0; background: none; color: rgba(255,255,255,.9); font-size: 17px; }
.done-foot { flex: none; margin-top: auto; padding: 14px 16px calc(12px + env(safe-area-inset-bottom, 0px)); display: grid; gap: 4px; }
.save-btn { height: 54px; border: 0; border-radius: 16px; background: #fff; color: var(--c); box-shadow: 0 8px 24px rgba(0,0,0,.18);
  font-size: 17px; font-weight: 600; }
.save-btn:active { transform: scale(.98); }
@media (prefers-reduced-motion: reduce) { .done-badge, .rec-card { animation: none; } }
</style>
