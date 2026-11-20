<template>
  <ion-page>
    <ion-header :translucent="true" collapse="fade"><ion-toolbar><ion-title>Kopia</ion-title></ion-toolbar></ion-header>
    <ion-content :fullscreen="true">
      <ion-header collapse="condense">
        <ion-toolbar><ion-title size="large">Kopia</ion-title></ion-toolbar>
        <p class="sub">{{ cloud.token ? 'Automatyczna kopia na GitHub włączona' : 'Twoje treningi są tylko w tym telefonie' }}</p>
      </ion-header>
      <div class="page">

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
              <div class="grow"><b>Przywróć z GitHub</b></div>
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
import { ask } from '../dialog'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonToast  } from '@ionic/vue'
import { logoGithub, shareOutline, downloadOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline, arrowUpOutline, arrowDownOutline, chevronForward, clipboardOutline } from 'ionicons/icons'
import { state, iso, fmtDate, ago, doneSessions, mergeSessions } from '../store'
import { wstate, importWeights } from '../weight'
import { cloud, connect, syncNow, restoreNow, disconnect } from '../cloud'
import { strava, status as stravaStatus, startConnect, sendCode, pull, disconnectStrava, STRAVA_ICON } from '../strava'

const fileInput = ref(null)
const msg = ref('')
const count = computed(() => { void state.sessions; return doneSessions().length })
const firstDate = computed(() => { const l = doneSessions(); return l.length ? fmtDate(l[l.length - 1].date).slice(0, 5) : '–' })
const lastBackup = ref((() => { try { return localStorage.getItem('lastBackup') } catch { return null } })())
const backupText = computed(() => (lastBackup.value ? ago(lastBackup.value) : 'nigdy'))
const backupOld = computed(() => !lastBackup.value || (Date.now() - new Date(lastBackup.value + 'T12:00:00')) > 14 * 864e5)
function markBackup() { lastBackup.value = iso(new Date()); try { localStorage.setItem('lastBackup', lastBackup.value) } catch {} }

async function exportData() {
  const json = JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions, weights: wstate.entries }, null, 1)
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
  r.onload = () => {
    try {
      const d = JSON.parse(r.result)
      if (!d?.sessions) throw 0
      const n = mergeSessions(d.sessions)
      const w = d.weights ? importWeights(d.weights) : 0
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
</style>
