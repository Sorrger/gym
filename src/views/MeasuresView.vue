<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>Obwody</span></div>
    <ion-content ref="content" :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Postępy</button>
        <h1 class="t-large">Obwody</h1>
        <p class="sub">{{ measures.length ? 'Ostatnio mierzone ' + ago(measures.at(-1).date) : 'Mierz co 2–4 tygodnie, rano, w tym samym miejscu' }}</p>
      </header>
      <div class="page">

        <!-- editor for one day -->
        <div v-if="form" class="card editor">
          <div class="ed-top">
            <b>{{ editing ? 'Popraw pomiar' : 'Nowy pomiar' }}</b>
            <input class="ed-date" type="date" v-model="form.date" :max="today" aria-label="Data pomiaru" />
          </div>
          <label v-for="p in PARTS" :key="p.id" class="ed-row">
            <span class="ed-name"><b>{{ p.name }}</b><small>{{ p.how }}</small></span>
            <span class="ed-in"><input inputmode="decimal" :placeholder="byPart[p.id] ? fmt(byPart[p.id].last.cm) : '–'" v-model="form.v[p.id]" :class="{ bad: isNaN(parseCm(form.v[p.id])) }" /><i>cm</i></span>
          </label>
          <p v-if="err" class="ed-err">{{ err }}</p>
          <div class="ed-btns">
            <button class="btn block primary-btn press" @click="saveForm">Zapisz</button>
            <button v-if="editing" class="btn block danger-btn press" @click="removeDay">Usuń pomiar</button>
            <button class="btn block plain press" @click="form = null">Anuluj</button>
          </div>
        </div>

        <template v-else>
          <div class="btns">
            <button class="btn block primary-btn press" @click="open()"><ion-icon :icon="add" /> Dodaj obwody</button>
          </div>

          <div v-if="!measures.length" class="card empty">
            Wpisz tylko to, co chcesz śledzić – np. talię i ramię.<br>Talia mówi o tłuszczu, ramię i klatka o mięśniach.
          </div>

          <div v-else class="card parts">
            <div v-for="p in shownParts" :key="p.id" class="part">
              <div class="pt-l">
                <b>{{ p.name }}</b>
                <small class="num">{{ p.d.pts.length > 1 ? 'od ' + fmtShort(p.d.first.date) : fmtShort(p.d.last.date) }}</small>
              </div>
              <svg v-if="p.line" class="spark" viewBox="0 0 80 30" preserveAspectRatio="none" aria-hidden="true"><path :d="p.line" /></svg>
              <div class="pt-r num">
                <b>{{ fmt(p.d.last.cm) }}<i> cm</i></b>
                <small v-if="p.d.pts.length > 1" :class="toneOf(p.id, p.d.change)">{{ sign(p.d.change) }}</small>
              </div>
            </div>
          </div>
          <p v-if="measures.length" class="note">Zielone = w dobrą stronę dla większości (talia i brzuch w dół, mięśnie w górę). Na redukcji ramię może lekko spaść – ważne, żeby talia spadała szybciej.</p>

          <div v-if="measures.length" class="card">
            <div class="card-title">Pomiary</div>
            <button v-for="m in rows" :key="m.date" class="row press" @click="open(m)">
              <div class="r-left"><b class="num">{{ fmtDate(m.date) }}</b><span class="pl"><em v-for="t in partsList(m.v)" :key="t">{{ t }}</em></span></div>
              <ion-icon :icon="chevronForward" class="chev" />
            </button>
          </div>
          <p class="note">Mierz miękką taśmą, przy skórze, bez ściskania. Ten sam dzień nadpisze stary pomiar.
            <template v-if="cloud.token"> Pomiary idą też do kopii na GitHubie.</template></p>
        </template>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup>
// Body measurements: per part last value, change since the first and a sparkline; one editor per day
import { computed, ref } from 'vue'
import { IonPage, IonContent, IonIcon, useIonRouter } from '@ionic/vue'
import { chevronBack, chevronForward, add } from 'ionicons/icons'
import { useScrolled } from '../useScrolled'
import { iso, fmtDate, fmtShort, ago } from '../store'
import { cloud } from '../cloud'
import { ask } from '../dialog'
import { PARTS, PART, measures, byPart, mstate, setMeasures, delMeasures, parseCm } from '../measures'

const ionRouter = useIonRouter()
const goBack = () => (ionRouter.canGoBack() ? ionRouter.back() : ionRouter.navigate('/tabs/progress', 'back', 'replace'))
const { scrolled, onScroll } = useScrolled()
const content = ref(null)
const today = iso(new Date())

const fmt = v => String(Math.round(v * 10) / 10).replace('.', ',')
const sign = v => { const r = Math.round(v * 10) / 10; return (r > 0 ? '+' : r < 0 ? '−' : '±') + fmt(Math.abs(r)) }
const toneOf = (id, d) => { const up = PART[id]?.up; if (up == null || Math.abs(d) < 0.25) return ''; return (up ? d > 0 : d < 0) ? 'ok' : 'bad' }

const shownParts = computed(() => PARTS.filter(p => byPart.value[p.id]).map(p => {
  const d = byPart.value[p.id], v = d.pts.map(x => x.cm)
  let line = ''
  if (v.length > 1) {
    const lo = Math.min(...v), hi = Math.max(...v), span = hi - lo || 1
    line = v.map((y, i) => (i ? 'L' : 'M') + (i / (v.length - 1) * 78 + 1).toFixed(1) + ' ' + (27 - (y - lo) / span * 24).toFixed(1)).join(' ')
  }
  return { ...p, d, line }
}))
const rows = computed(() => [...measures.value].reverse())
const partsList = v => PARTS.filter(p => v[p.id] != null).map(p => p.name + ' ' + fmt(v[p.id]))

const form = ref(null)
const editing = ref(false)
const err = ref('')
function open(m) {
  editing.value = !!m
  err.value = ''
  const v = {}
  for (const p of PARTS) v[p.id] = m?.v[p.id] != null ? fmt(m.v[p.id]) : ''
  form.value = { date: m?.date || today, v, from: m?.date || null }
  content.value?.$el?.scrollToTop?.(200)
}
async function saveForm() {
  const f = form.value, v = {}
  for (const p of PARTS) {
    const cm = parseCm(f.v[p.id])
    if (Number.isNaN(cm)) { err.value = p.name + ': wpisz liczbę od 10 do 250 cm'; return }
    if (cm != null) v[p.id] = cm
  }
  if (!Object.keys(v).length) { err.value = 'Wpisz przynajmniej jeden obwód'; return }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.date > today) { err.value = 'Wybierz datę (nie z przyszłości)'; return }
  // a different day that already has values: keep what this form leaves empty
  const old = f.date !== f.from ? mstate.entries[f.date] : null
  if (old && !old.del && old.v) {
    const r = await ask({ title: 'Ten dzień ma już pomiar', message: 'Połączyć z nim? Wpisane teraz obwody zastąpią stare.',
      buttons: [{ text: 'Połącz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
    if (r.role !== 'ok') return
    Object.assign(v, { ...old.v, ...v })
  }
  if (f.from && f.from !== f.date) delMeasures(f.from)
  setMeasures(f.date, v)
  form.value = null
}
async function removeDay() {
  const f = form.value
  const r = await ask({ title: 'Usunąć pomiar z ' + fmtDate(f.from) + '?', buttons: [{ text: 'Usuń', role: 'del', kind: 'danger' }, { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (r.role !== 'del') return
  delMeasures(f.from)
  form.value = null
}
</script>

<style scoped>
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; pointer-events: auto; }
.mini-bar { pointer-events: none; }
.mini-bar.on .mb-back { pointer-events: auto; }
.btns { display: flex; flex-direction: column; gap: 10px; margin: 0 16px 14px; }
.primary-btn { background: var(--accent); color: #fff; }
.danger-btn { background: color-mix(in srgb, var(--app-bad) 14%, transparent); color: var(--app-bad); }
.btns ion-icon { font-size: 20px; }
.empty { color: var(--app-muted); text-align: center; padding: 22px 14px; line-height: 1.45; }
.card-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
.parts { padding-top: 4px; padding-bottom: 4px; }
.part { display: flex; align-items: center; gap: 12px; padding: 11px 0; }
.part + .part { border-top: 0.5px solid var(--app-line); }
.pt-l { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pt-l b { font-size: 16px; font-weight: 600; }
.pt-l small { font-size: 12.5px; color: var(--app-muted); }
.spark { width: 70px; height: 28px; flex: none; }
.spark path { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; vector-effect: non-scaling-stroke; }
.pt-r { width: 84px; flex: none; display: flex; flex-direction: column; align-items: flex-end; }
.pt-r b { font-size: 19px; font-weight: 700; white-space: nowrap; }
.pt-r b i { font-style: normal; font-size: 12px; color: var(--app-muted); font-weight: 600; }
.pt-r small { font-size: 13px; font-weight: 600; color: var(--app-muted); }
.ok { color: var(--app-ok) !important; }
.bad { color: var(--app-bad) !important; }
.note { margin: 2px 22px 14px; color: var(--app-muted); font-size: 13px; line-height: 1.4; }
.row { width: 100%; background: none; color: inherit; font: inherit; text-align: left; display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 11px 0; border: 0; border-top: 0.5px solid var(--app-line); min-height: 0; }
.card-title + .row { border-top: 0; }
.row::before { display: none; }
.r-left { display: flex; flex-direction: column; min-width: 0; }
.r-left b { font-size: 15px; font-weight: 600; }
.r-left span { font-size: 13px; color: var(--app-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pl em { font-style: normal; }
.pl em + em::before { content: ', '; }
.chev { color: var(--app-muted); flex: none; font-size: 18px; }
.editor { padding-bottom: 14px; }
.ed-top { display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 6px; }
.ed-top b { font-size: 17px; }
.ed-date { border: 0; border-radius: 9px; background: var(--app-field); color: var(--ion-text-color); font: inherit; font-size: 15px; padding: 7px 10px; }
.ed-row { display: flex; align-items: center; gap: 12px; padding: 9px 0; border-top: 0.5px solid var(--app-line); }
.ed-name { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ed-name b { font-size: 15.5px; font-weight: 600; }
.ed-name small { font-size: 12.5px; color: var(--app-muted); line-height: 1.3; }
.ed-in { display: flex; align-items: center; gap: 5px; flex: none; }
.ed-in input { width: 74px; border: 0; border-radius: 9px; background: var(--app-field); color: var(--ion-text-color); font: inherit; font-family: var(--num-font); font-size: 17px; font-weight: 600; text-align: right; padding: 8px 10px; }
.ed-in input.bad { box-shadow: inset 0 0 0 1.5px var(--app-bad); }
.ed-in i { font-style: normal; color: var(--app-muted); font-size: 13px; }
.ed-err { color: var(--app-bad); font-size: 14px; margin: 8px 0 0; }
.ed-btns { display: flex; flex-direction: column; gap: 9px; margin-top: 12px; }
</style>
