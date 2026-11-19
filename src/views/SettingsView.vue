<template>
  <ion-page>
    <ion-content>
      <div class="page">
        <header class="page-head">
          <h1>Kopia</h1>
          <p>{{ cloud.token ? 'Automatyczna kopia na GitHub włączona' : 'Twoje treningi są tylko w tym telefonie' }}</p>
        </header>

        <!-- automatic GitHub backup -->
        <div class="card hero" v-if="!cloud.token">
          <div class="shield"><ion-icon :icon="cloudUploadOutline" /></div>
          <div class="hero-mid">
            <b>Automatyczna kopia</b>
            <p>Po każdej zmianie aplikacja sama wyśle kopię do tajnego Gista na twoim GitHubie. Na nowym telefonie wystarczy wkleić ten sam token.</p>
            <button class="connect" @click="askToken" :disabled="cloud.busy">{{ cloud.busy ? 'Łączenie…' : 'Połącz z GitHub' }}</button>
          </div>
        </div>
        <div class="card hero" v-else>
          <div class="shield" :class="{ bad: cloud.error }"><ion-icon :icon="cloud.error ? cloudOfflineOutline : cloudDoneOutline" /></div>
          <div class="hero-mid">
            <b>GitHub · {{ cloud.login }}</b>
            <p v-if="cloud.busy">Wysyłanie…</p>
            <p v-else-if="cloud.error" class="err">{{ cloud.error }}{{ cloud.dirty ? ' · spróbuję ponownie' : '' }}</p>
            <p v-else-if="cloud.dirty">Czeka na wysłanie (gdy będzie internet)</p>
            <p v-else>Aktualna · wysłano {{ syncText }}</p>
            <div class="mini">
              <button @click="pushNow" :disabled="cloud.busy">Wyślij teraz</button>
              <button @click="pullNow" :disabled="cloud.busy">Przywróć</button>
              <button @click="askDisconnect" class="off">Odłącz</button>
            </div>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat"><span>Treningi</span><b>{{ count }}</b></div>
          <div class="stat"><span>Od</span><b class="small">{{ firstDate }}</b></div>
          <div class="stat" v-if="!cloud.token"><span>Kopia</span><b class="small" :class="{ warn: backupOld }">{{ backupText }}</b></div>
          <div class="stat" v-else><span>Kopia</span><b class="small" :class="{ warn: cloud.error }">{{ cloud.error ? 'błąd' : cloud.dirty ? 'czeka' : 'auto' }}</b></div>
        </div>

        <div class="actions">
          <button class="action press" :class="{ primary: !cloud.token }" @click="exportData">
            <ion-icon :icon="shareOutline" />
            <div><b>Zapisz kopię do pliku</b><span>Plik .json do Plików, iCloud albo AirDrop</span></div>
          </button>
          <button class="action press" @click="fileInput.click()">
            <ion-icon :icon="downloadOutline" />
            <div><b>Wczytaj kopię</b><span>Dołącza treningi z pliku, niczego nie kasuje</span></div>
          </button>
        </div>
        <input ref="fileInput" type="file" accept=".json,application/json" hidden @change="importData" />
      </div>
      <ion-toast :is-open="!!msg" :message="msg" :duration="2200" position="top" @didDismiss="msg = ''" />
    </ion-content>
  </ion-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast, alertController } from '@ionic/vue'
import { shareOutline, downloadOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline } from 'ionicons/icons'
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
  cloud.busy = true
  const r = await connect(tok)
  cloud.busy = false
  msg.value = r.ok ? (r.restored ? `Połączono · przywrócono ${r.restored} treningów` : 'Połączono · kopia wysłana') : r.error
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
.hero { display: flex; gap: 14px; align-items: flex-start; }
.shield { width: 48px; height: 48px; flex: none; border-radius: 15px; display: grid; place-items: center; font-size: 26px; color: #fff;
  background: linear-gradient(140deg, #4a66f0, #2f4bd8); box-shadow: 0 4px 12px rgba(47,75,216,.3); }
.hero b { font-size: 17px; font-weight: 800; }
.hero p { margin: 3px 0 0; color: var(--app-muted); font-size: 14px; line-height: 1.4; }
.hero-mid { flex: 1; min-width: 0; }
.hero p.err { color: #e8453c; }
.shield.bad { background: linear-gradient(140deg, #f06a5a, #e8453c); box-shadow: 0 4px 12px rgba(232,69,60,.3); }
.connect { margin-top: 10px; height: 42px; padding: 0 18px; border: 0; border-radius: 12px; background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast); font-size: 15px; font-weight: 700; }
.mini { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.mini button { height: 36px; padding: 0 12px; border: 0; border-radius: 10px; background: var(--app-field); color: var(--ion-color-primary);
  font-size: 14px; font-weight: 600; }
.mini button.off { color: #e8453c; }
button:disabled { opacity: .5; }
.stat b.small { font-size: 17px; margin-top: 5px; }
.stat b.warn { color: #e8453c; }
.actions { display: grid; gap: 10px; margin: 0 16px; }
.action { display: flex; align-items: center; gap: 14px; text-align: left; border: 0; border-radius: 18px; padding: 16px;
  background: var(--app-card); color: var(--ion-text-color); font: inherit; }
.action ion-icon { font-size: 26px; color: var(--ion-color-primary); flex: none; }
.action b { display: block; font-size: 17px; font-weight: 700; }
.action span { font-size: 13px; color: var(--app-muted); }
.action.primary { background: var(--ion-color-primary); color: var(--ion-color-primary-contrast); }
.action.primary ion-icon, .action.primary span { color: inherit; opacity: .9; }
</style>
