<template>
  <ion-page>
    <div class="mini-bar" :class="{ on: scrolled }"><button class="mb-back press" @click="goBack" aria-label="Wróć"><ion-icon :icon="chevronBack" /></button><span>Ustawienia</span></div>
    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="onScroll">
      <header class="big-head sub-page">
        <button class="back press" @click="goBack"><ion-icon :icon="chevronBack" /> Profil</button>
        <h1 class="t-large">Ustawienia</h1>
        <p class="sub">Wygląd, kopia danych, Strava</p>
      </header>
      <div class="page">

        <!-- look -->
        <h3 class="section-title">Wygląd</h3>
        <div class="card look">
          <span class="lbl">Motyw</span>
          <div class="seg3">
            <button v-for="m in MODES" :key="m.v" class="press" :class="{ on: look.mode === m.v }" @click="setLook('mode', m.v)">{{ m.t }}</button>
          </div>
          <span class="lbl">Kolor</span>
          <div class="sw">
            <button v-for="a in ACCENTS" :key="a.id" class="press" :class="{ on: look.accent === a.id }" @click="setLook('accent', a.id)" :aria-label="a.name">
              <i :style="{ background: a.light }"></i><small>{{ a.name }}</small>
            </button>
          </div>
        </div>

        <!-- coaching: each person can switch it to taste (defaults = how the app always worked) -->
        <h3 class="section-title">Trening</h3>
        <div class="card look">
          <span class="lbl">Podpowiedzi ciężaru i powtórzeń</span>
          <div class="seg3">
            <button v-for="m in COACH" :key="m.v" class="press" :class="{ on: prefs.coach === m.v }" @click="setPref('coach', m.v)">{{ m.t }}</button>
          </div>
          <p class="hint">{{ COACH.find(m => m.v === prefs.coach).d }}</p>
        </div>
        <div class="ios-group toggles">
          <button v-for="t in TOGGLES" :key="t.k" class="row press" role="switch" :aria-checked="!!prefs[t.k]" @click="setPref(t.k, !prefs[t.k])">
            <div class="grow"><b>{{ t.t }}</b><span>{{ t.d }}</span></div>
            <span class="sw-t" :class="{ on: prefs[t.k] }"><i></i></span>
          </button>
          <div v-if="prefs.deload" class="row every">
            <div class="grow"><b>Lżejszy tydzień co</b><span>tygodni treningu (wcześniej, gdy wyniki stoją)</span></div>
            <div class="stepper num">
              <button class="press" :disabled="prefs.deloadEvery <= 4" @click="setPref('deloadEvery', prefs.deloadEvery - 1)" aria-label="Mniej">−</button>
              <b>{{ prefs.deloadEvery }}</b>
              <button class="press" :disabled="prefs.deloadEvery >= 12" @click="setPref('deloadEvery', prefs.deloadEvery + 1)" aria-label="Więcej">+</button>
            </div>
          </div>
        </div>

        <h3 class="section-title">Waga ciała</h3>
        <div class="card look">
          <span class="lbl">Twój cel</span>
          <div class="seg3">
            <button v-for="g in GOALS" :key="g.v" class="press" :class="{ on: prefs.goal === g.v }" @click="setPref('goal', g.v)">{{ g.t }}</button>
          </div>
          <p class="hint">{{ GOALS.find(g => g.v === prefs.goal).d }}</p>
        </div>

        <h3 class="section-title">Kopia zapasowa</h3>
        <p class="kop">{{ cloud.token ? 'Automatyczna kopia na GitHub włączona.' : 'Twoje treningi są tylko w tym telefonie.' }}</p>

        <!-- automatic GitHub backup -->
        <div class="card hero" v-if="!cloud.token">
          <div class="hero-ico"><ion-icon :icon="cloudUploadOutline" /></div>
          <b class="t-title">Automatyczna kopia</b>
          <p>Po każdej zmianie aplikacja sama wyśle kopię do tajnego Gista na twoim GitHubie. Na nowym telefonie wystarczy wkleić ten sam token.</p>
          <button class="btn block" @click="askToken" :disabled="cloud.connecting">{{ cloud.connecting ? 'Łączenie…' : 'Połącz z GitHub' }}</button>
        </div>
        <template v-else>
          <h3 class="section-title">GitHub</h3>
          <div class="ios-group">
            <div class="row">
              <span class="sq" :style="{ '--c': cloud.error ? 'var(--app-bad)' : 'var(--app-ok)' }"><ion-icon :icon="cloud.error ? cloudOfflineOutline : cloudDoneOutline" /></span>
              <div class="grow">
                <b>{{ cloud.login }}</b>
                <span v-if="cloud.busy">Wysyłanie…</span>
                <span v-else-if="cloud.error" class="err">{{ cloud.error }}{{ cloud.dirty ? ' · spróbuję ponownie' : '' }}</span>
                <span v-else-if="cloud.dirty">Czeka na internet</span>
                <span v-else>Aktualna · wysłano {{ syncText }}</span>
              </div>
            </div>
            <button class="row" @click="pushNow" :disabled="cloud.busy">
              <span class="sq" style="--c: var(--accent)"><ion-icon :icon="arrowUpOutline" /></span>
              <div class="grow"><b>Wyślij teraz</b></div>
            </button>
            <button class="row" @click="pullNow" :disabled="cloud.busy">
              <span class="sq" style="--c: #2f8cff"><ion-icon :icon="arrowDownOutline" /></span>
              <div class="grow"><b>Przywróć z GitHuba</b></div>
            </button>
          </div>
          <p class="section-foot">Kopia wysyła się sama kilka sekund po każdej zmianie. Bez internetu poczeka i wyśle się później.</p>
        </template>

        <h3 class="section-title">Strava · tętno z zegarka</h3>
        <div class="ios-group" :style="{ '--c': '#fc4c02' }">
          <template v-if="sst === 'on'">
            <div class="row">
              <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
              <div class="grow"><b>{{ strava.data.athlete.name || 'Strava' }}</b>
                <span>{{ strava.data.error ? 'Błąd: ' + strava.data.error : 'Dane z ' + stravaAgo + ' · ' + stravaCount + (stravaCount === 1 ? ' trening' : stravaCount % 10 >= 2 && stravaCount % 10 <= 4 && (stravaCount % 100 < 12 || stravaCount % 100 > 14) ? ' treningi' : ' treningów') + ' z tętnem' }}</span></div>
            </div>
            <button class="row" @click="refreshStrava" :disabled="strava.busy">
              <span class="sq" style="--c: #2f8cff"><ion-icon :icon="arrowDownOutline" /></span>
              <div class="grow"><b>Odśwież</b><span>Nowe dane pojawiają się co ~10 min</span></div>
            </button>
          </template>
          <div class="row" v-else-if="sst === 'waiting'">
            <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
            <div class="grow"><b>Łączenie ze Stravą…</b><span>Potrwa do ~10 minut. Możesz zamknąć apkę.</span></div>
          </div>
          <template v-else>
            <button class="row" @click="connectStrava">
              <span class="sq" style="--c: #fc4c02"><ion-icon :icon="STRAVA_ICON" /></span>
              <div class="grow"><b>{{ sst === 'error' ? 'Połącz Stravę ponownie' : 'Połącz ze Stravą' }}</b>
                <span>{{ sst === 'error' ? strava.data.authError : 'Tętno i kalorie z zegarka przy treningach' }}</span></div>
              <ion-icon :icon="chevronForward" class="chev" />
            </button>
            <button class="row" @click="pasteCode">
              <span class="sq" style="--c: #8e8e93"><ion-icon :icon="clipboardOutline" /></span>
              <div class="grow"><b>Wklej kod</b><span>Gdy Strava otworzyła się w Safari</span></div>
            </button>
          </template>
        </div>
        <p class="section-foot" v-if="sst === 'on'">Ćwiczenia z apki dopisują się też do opisu treningu na Stravie.</p>
        <div class="ios-group gap" v-if="sst === 'on' || sst === 'waiting'">
          <button class="row danger" @click="askStravaOff"><div class="grow"><b>Odłącz Stravę</b></div></button>
        </div>

        <h3 class="section-title">Dane</h3>
        <div class="stats">
          <div><span>Treningi</span><b>{{ count }}</b></div>
          <div><span>Od</span><b>{{ firstDate }}</b></div>
          <div v-if="!cloud.token"><span>Plik</span><b :class="{ down: backupOld }">{{ backupText }}</b></div>
          <div v-else><span>Kopia</span><b :class="{ down: cloud.error }">{{ cloud.error ? 'błąd' : cloud.dirty ? 'czeka' : 'auto' }}</b></div>
        </div>

        <div class="ios-group">
          <button class="row" @click="exportData">
            <span class="sq" style="--c: #22b864"><ion-icon :icon="shareOutline" /></span>
            <div class="grow"><b>Zapisz kopię do pliku</b><span>Pliki, iCloud albo AirDrop</span></div>
            <ion-icon :icon="chevronForward" class="chev" />
          </button>
          <button class="row" @click="fileInput.click()">
            <span class="sq" style="--c: #ff9500"><ion-icon :icon="downloadOutline" /></span>
            <div class="grow"><b>Wczytaj kopię z pliku</b><span>Dołącza treningi, niczego nie kasuje</span></div>
            <ion-icon :icon="chevronForward" class="chev" />
          </button>
        </div>

        <template v-if="cloud.token">
          <div class="ios-group gap">
            <button class="row danger" @click="askDisconnect"><div class="grow"><b>Odłącz GitHub</b></div></button>
          </div>
        </template>
        <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importData" />
      </div>
      <ion-toast :is-open="!!msg" :message="msg" :duration="2200" position="top" @didDismiss="msg = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { useScrolled } from '../useScrolled'
import { accountData, importAccount, setPref } from '../account'
import { prefs } from '../prefs'
import { ask } from '../dialog'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast  } from '@ionic/vue'
import { logoGithub, shareOutline, downloadOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline, arrowUpOutline, arrowDownOutline, chevronForward, clipboardOutline, chevronBack } from 'ionicons/icons'
import { state, iso, fmtDate, ago, doneSessions, mergeSessions } from '../store'
import { wstate, importWeights } from '../weight'
import { planData, importPlan } from '../customPlan'
import { cloud, connect, syncNow, restoreNow, disconnect } from '../cloud'
import { weights } from '../weight'
import { look, setLook, ACCENTS } from '../theme'
import { useIonRouter } from '@ionic/vue'
import { strava, status as stravaStatus, startConnect, sendCode, pull, disconnectStrava, STRAVA_ICON } from '../strava'

const { scrolled, onScroll } = useScrolled()
const router = useIonRouter()
const goBack = () => (router.canGoBack() ? router.back() : router.navigate('/tabs/profile', 'back', 'replace'))
const COACH = [
  { v: 'auto', t: 'Same', d: 'Po otwarciu ćwiczenia apka sama pokazuje, ile dziś dźwignąć.' },
  { v: 'chip', t: 'Na dotyk', d: 'Podpowiedź tylko pod „Ostatnio…” – otwierasz ją, kiedy chcesz.' },
  { v: 'off', t: 'Wyłączone', d: 'Bez podpowiedzi. Ciężary i tak wpisują się z ostatniego treningu.' }]
const TOGGLES = [
  { k: 'live', t: 'Rady w trakcie serii', d: 'Za ciężko / za lekko – pod serią' },
  { k: 'rir', t: 'Zapas powtórzeń', d: 'Ile zostało do upadku (0, 1, 2, 3+)' },
  { k: 'warmup', t: 'Rozgrzewka', d: 'Serie rozgrzewkowe przy sztandze' },
  { k: 'autoNext', t: 'Przejdź dalej sam', d: 'Po ostatniej serii następne ćwiczenie' },
  { k: 'deload', t: 'Lżejszy tydzień (deload)', d: 'Apka sama ustawia lżejszy tydzień' }]
const GOALS = [
  { v: 'cut', t: 'Redukcja', d: 'Powoli w dół: 0,2–0,7 % wagi na tydzień, mięśnie zostają.' },
  { v: 'maintain', t: 'Utrzymanie', d: 'Waga stabilna: zmiana do ±0,25 % na tydzień.' },
  { v: 'bulk', t: 'Masa', d: 'Powoli w górę: 0,1–0,5 % wagi na tydzień, mało tłuszczu.' }]
const MODES = [{ v: 'system', t: 'Jak telefon' }, { v: 'light', t: 'Jasny' }, { v: 'dark', t: 'Ciemny' }]
const lastW = computed(() => weights.value[weights.value.length - 1] || null)
const doneCount = computed(() => { void state.sessions; return doneSessions().length })
const fileInput = ref(null)
const msg = ref('')
const count = computed(() => { void state.sessions; return doneSessions().length })
const firstDate = computed(() => { const l = doneSessions(); return l.length ? fmtDate(l[l.length - 1].date).slice(0, 5) : '–' })
const lastBackup = ref((() => { try { return localStorage.getItem('lastBackup') } catch { return null } })())
const backupText = computed(() => (lastBackup.value ? ago(lastBackup.value) : 'nigdy'))
const backupOld = computed(() => !lastBackup.value || (Date.now() - new Date(lastBackup.value + 'T12:00:00')) > 14 * 864e5)
function markBackup() { lastBackup.value = iso(new Date()); try { localStorage.setItem('lastBackup', lastBackup.value) } catch {} }

async function exportData() {
  const json = JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions, weights: wstate.entries, plan: await planData(), profile: accountData() }, null, 1)
  const name = 'silownia-' + iso(new Date()) + '.json'
  try {
    const f = new File([json], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); markBackup(); msg.value = 'Kopia zapisana'; return }
  } catch (e) { if (e?.name === 'AbortError') return }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = name; document.body.appendChild(a); a.click(); a.remove()
  markBackup(); msg.value = 'Kopia pobrana'
}

function importData(e) {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = async () => {
    try {
      const d = JSON.parse(r.result)
      if (!d?.sessions) throw 0
      const n = mergeSessions(d.sessions)
      const w = d.weights ? importWeights(d.weights) : 0
      if (d.profile) importAccount(d.profile)
      if (d.plan && await importPlan(d.plan)) setTimeout(() => location.reload(), 1500)
      msg.value = 'Wczytano ' + n + ' treningów' + (w ? ' i ' + w + ' pomiarów wagi' : '')
    } catch { msg.value = 'To nie jest plik kopii z tej aplikacji' }
    e.target.value = ''
  }
  r.readAsText(file)
}

// "wysłano 5 min temu"
const now = ref(Date.now()); let tick
onMounted(() => { tick = setInterval(() => (now.value = Date.now()), 30000) })
onUnmounted(() => clearInterval(tick))
const syncText = computed(() => {
  if (!cloud.lastSync) return '–'
  const m = Math.round((now.value - cloud.lastSync) / 60000)
  if (m < 1) return 'przed chwilą'
  if (m < 60) return m + ' min temu'
  const h = Math.round(m / 60)
  return h < 24 ? h + ' godz. temu' : ago(iso(new Date(cloud.lastSync)))
})

const sst = computed(() => stravaStatus())
const stravaCount = computed(() => Object.values(strava.data?.acts || {}).filter(a => a.session && a.hr).length)
const stravaAgo = computed(() => {
  if (!strava.data?.at) return '–'
  const m = Math.round((now.value - Date.parse(strava.data.at)) / 60000)
  return m < 1 ? 'przed chwilą' : m < 60 ? m + ' min temu' : m < 1440 ? Math.round(m / 60) + ' godz. temu' : ago(iso(new Date(strava.data.at)))
})
async function connectStrava() {
  if (!cloud.token) { msg.value = 'Najpierw połącz kopię z GitHub (wyżej)'; return }
  const { role, value } = await ask({ icon: STRAVA_ICON, color: '#fc4c02', title: 'Połącz ze Stravą',
    message: 'Wpisz Client ID z ustawień API na Stravie (strava.com/settings/api). Potem kliknij „Zezwól”.',
    input: { type: 'text', placeholder: 'Client ID, np. 123456', value: strava.clientId },
    buttons: [{ text: 'Dalej do Stravy', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !/^\d+$/.test(value)) { if (role === 'ok') msg.value = 'Client ID to same cyfry'; return }
  startConnect(value)
}
async function pasteCode() {
  if (!cloud.token) { msg.value = 'Najpierw połącz kopię z GitHub (wyżej)'; return }
  const { role, value } = await ask({ icon: clipboardOutline, color: '#fc4c02', title: 'Wklej kod ze Stravy',
    message: 'Kod skopiowany w Safari po kliknięciu „Zezwól”.', input: { type: 'text', placeholder: 'kod' },
    buttons: [{ text: 'Połącz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !value) return
  await sendCode(value.replace(/.*[?&]code=([^&]+).*/, '$1'))
  msg.value = strava.msg
}
async function refreshStrava() { await pull(); msg.value = strava.data?.error ? 'Strava: ' + strava.data.error : 'Odświeżono' }
async function askStravaOff() {
  const { role } = await ask({ icon: STRAVA_ICON, color: '#fc4c02', title: 'Odłączyć Stravę?',
    message: 'Apka przestanie pobierać tętno. Treningi w apce i na Stravie zostają.',
    buttons: [{ text: 'Odłącz', role: 'off', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'off') return
  try { await disconnectStrava(); msg.value = 'Strava odłączona' } catch (e) { msg.value = e.message || 'Brak internetu' }
}

async function askToken() {
  const { role, value: tok } = await ask({ icon: logoGithub, title: 'Token GitHub',
    message: 'Wklej token z uprawnieniem tylko do Gistów (zaczyna się od github_pat_ albo ghp_).',
    input: { type: 'password', placeholder: 'github_pat_…' },
    buttons: [{ text: 'Połącz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !tok) return
  const r = await connect(tok)
  msg.value = !r.ok ? r.error
    : (r.restored ? `Połączono · przywrócono ${r.restored} treningów` : 'Połączono') + (r.sent ? ' · kopia wysłana' : ' · wyślę, gdy będzie internet')
}
async function pushNow() { msg.value = (await syncNow()) ? 'Kopia wysłana' : (cloud.error || 'Brak internetu') }
async function pullNow() {
  try { const n = await restoreNow(); msg.value = n ? `Przywrócono ${n} treningów` : 'Wszystko już jest w telefonie' }
  catch (e) { msg.value = e.message || 'Brak internetu' }
}
async function askDisconnect() {
  const { role } = await ask({ icon: cloudOfflineOutline, title: 'Odłączyć GitHub?',
    message: 'Automatyczna kopia przestanie działać. Kopia na GitHubie zostaje, treningi w telefonie też.',
    buttons: [{ text: 'Odłącz', role: 'destructive', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role === 'destructive') { await disconnect(); msg.value = 'Odłączono' }
}
</script>

<style scoped>
.page { padding-top: 8px; }
.hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 18px 18px; }
.hero-ico { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center; font-size: 32px; color: #fff; margin-bottom: 12px;
  background: linear-gradient(150deg, var(--accent-2), var(--accent)); box-shadow: 0 8px 20px rgba(var(--accent-rgb), .35); }
.hero p { margin: 6px 0 16px; color: var(--app-muted); font-size: 15px; line-height: 1.4; }
.err { color: var(--app-bad) !important; }
.ios-group.gap { margin-top: 24px; }
.ios-group + .ios-group { margin-top: 12px; }
.stats + .ios-group { margin-top: 0; }
.row.danger b { color: var(--app-bad); text-align: center; }
.row:disabled { opacity: .5; }
.r-ico { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; flex: none; color: #fff; background: var(--c); font-size: 18px; }
.row .grow b { display: block; font-size: 16px; font-weight: 600; }
.row .grow span { display: block; font-size: 13px; color: var(--app-muted); }
.chev { color: var(--app-faint); font-size: 18px; }
.look .lbl { display: block; font-size: 13px; color: var(--app-muted); margin: 0 2px 6px; }
.look .lbl + .seg3 { margin-bottom: 14px; }
.seg3 { display: flex; gap: 4px; padding: 3px; border-radius: 10px; background: var(--app-field); margin-bottom: 14px; }
.seg3 button { flex: 1; border: 0; border-radius: 8px; padding: 8px 2px; font: inherit; font-size: 14px; font-weight: 600; background: none; color: var(--ion-text-color); }
.seg3 button.on { background: var(--app-card); color: var(--accent); box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.sw { display: flex; gap: 6px; }
.sw button { flex: 1 1 0; min-width: 0; border: 0; background: none; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 2px 0; font: inherit; color: var(--app-muted); }
.sw i { width: 34px; height: 34px; border-radius: 50%; display: block; box-shadow: 0 0 0 2px var(--app-card), 0 0 0 2px transparent; }
.sw button.on i { box-shadow: 0 0 0 2px var(--app-card), 0 0 0 4px var(--ion-text-color); }
.sw small { font-size: 11px; }
.sw button.on small { color: var(--ion-text-color); font-weight: 600; }
.kop { margin: -2px 20px 10px; font-size: 13.5px; color: var(--app-muted); }
.big-head.sub-page { padding-top: calc(env(safe-area-inset-top) + 6px); }
.back { display: inline-flex; align-items: center; gap: 2px; margin: 0 0 10px 10px; padding: 6px 8px; border: 0; background: none; font: inherit; font-size: 17px; color: var(--accent); }
.back ion-icon { font-size: 22px; }
.mb-back { position: absolute; left: 8px; bottom: 4px; width: 36px; height: 36px; border: 0; background: none; color: var(--accent); font-size: 24px; display: grid; place-items: center; pointer-events: auto; }
.mini-bar { pointer-events: none; }
.hint { margin: -6px 2px 0; font-size: 13px; color: var(--app-muted); line-height: 1.35; }
.toggles { margin-top: 10px; }
.sw-t { width: 51px; height: 31px; border-radius: 999px; background: var(--app-field); position: relative; flex: none; transition: background .2s; }
.sw-t i { position: absolute; top: 2px; left: 2px; width: 27px; height: 27px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: transform .2s; }
.sw-t.on { background: #34c759; }
.sw-t.on i { transform: translateX(20px); }
.stepper { display: flex; align-items: center; gap: 4px; flex: none; }
.stepper button { width: 34px; height: 34px; border: 0; border-radius: 9px; background: var(--app-field); font: inherit; font-size: 20px; color: var(--accent); }
.stepper button:disabled { opacity: .4; }
.stepper b { min-width: 26px; text-align: center; font-size: 18px; }
</style>
