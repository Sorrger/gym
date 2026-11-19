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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonToast, alertController } from '@ionic/vue'
import { shareOutline, downloadOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline, arrowUpOutline, arrowDownOutline, chevronForward } from 'ionicons/icons'
import { state, iso, fmtDate, ago, doneSessions, mergeSessions } from '../store'
import { cloud, connect, syncNow, restoreNow, disconnect } from '../cloud'

const fileInput = ref(null)
const msg = ref('')
const count = computed(() => { void state.sessions; return doneSessions().length })
const firstDate = computed(() => { const l = doneSessions(); return l.length ? fmtDate(l[l.length - 1].date).slice(0, 5) : '–' })
const lastBackup = ref((() => { try { return localStorage.getItem('lastBackup') } catch { return null } })())
const backupText = computed(() => (lastBackup.value ? ago(lastBackup.value) : 'nigdy'))
const backupOld = computed(() => !lastBackup.value || (Date.now() - new Date(lastBackup.value + 'T12:00:00')) > 14 * 864e5)
function markBackup() { lastBackup.value = iso(new Date()); try { localStorage.setItem('lastBackup', lastBackup.value) } catch {} }

async function exportData() {
  const json = JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions }, null, 1)
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
      msg.value = 'Wczytano ' + n + ' treningów'
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

async function askToken() {
  const a = await alertController.create({
    header: 'Token GitHub',
    message: 'Wklej token z uprawnieniem tylko do Gistów (zaczyna się od github_pat_ albo ghp_).',
    inputs: [{ name: 't', type: 'password', placeholder: 'github_pat_…' }],
    buttons: [{ text: 'Anuluj', role: 'cancel' }, { text: 'Połącz', role: 'ok' }]
  })
  await a.present()
  const { role, data } = await a.onDidDismiss()
  const tok = data?.values?.t?.trim()
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
  const a = await alertController.create({
    header: 'Odłączyć GitHub?',
    message: 'Automatyczna kopia przestanie działać. Kopia na GitHubie zostaje, treningi w telefonie też.',
    buttons: [{ text: 'Anuluj', role: 'cancel' }, { text: 'Odłącz', role: 'destructive' }]
  })
  await a.present()
  if ((await a.onDidDismiss()).role === 'destructive') { await disconnect(); msg.value = 'Odłączono' }
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
