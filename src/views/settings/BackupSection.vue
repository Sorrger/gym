<template>
  <div>
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
</template>

<script setup>
import { ref, computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { logoGithub, shareOutline, downloadOutline, cloudUploadOutline, cloudDoneOutline, cloudOfflineOutline, arrowUpOutline, arrowDownOutline, chevronForward } from 'ionicons/icons'
import { ask } from '../../dialog'
import { accountData, importAccount } from '../../account'
import { state, iso, fmtDate, ago, doneSessions, mergeSessions } from '../../store'
import { wstate, importWeights } from '../../weight'
import { planData, importPlan } from '../../customPlan'
import { cloud, connect, syncNow, restoreNow, disconnect } from '../../cloud'
import { useNow, agoMin } from './now'

const emit = defineEmits(['msg'])
const say = m => emit('msg', m)
const now = useNow()
const fileInput = ref(null)
const count = computed(() => { void state.sessions; return doneSessions().length })
const firstDate = computed(() => { const l = doneSessions(); return l.length ? fmtDate(l[l.length - 1].date).slice(0, 5) : '–' })
const lastBackup = ref((() => { try { return localStorage.getItem('lastBackup') } catch { return null } })())
const backupText = computed(() => (lastBackup.value ? ago(lastBackup.value) : 'nigdy'))
const backupOld = computed(() => !lastBackup.value || (Date.now() - new Date(lastBackup.value + 'T12:00:00').getTime()) > 14 * 864e5)
const syncText = computed(() => (cloud.lastSync ? agoMin(cloud.lastSync, now.value) : '–'))
function markBackup() { lastBackup.value = iso(new Date()); try { localStorage.setItem('lastBackup', lastBackup.value) } catch {} }

// one JSON file with everything: workouts, weights, own plan, account + settings
async function exportData() {
  const json = JSON.stringify({ app: 'silownia', v: 2, exported: new Date().toISOString(), sessions: state.sessions, deleted: state.deleted, weights: wstate.entries, plan: await planData(), profile: accountData() }, null, 1)
  const name = 'silownia-' + iso(new Date()) + '.json'
  try {
    const f = new File([json], name, { type: 'application/json' })
    if (navigator.canShare?.({ files: [f] })) { await navigator.share({ files: [f] }); markBackup(); say('Kopia zapisana'); return }
  } catch (e) { if (e?.name === 'AbortError') return }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  a.download = name; document.body.appendChild(a); a.click(); a.remove()
  markBackup(); say('Kopia pobrana')
}
// merges into what is on the phone (never deletes); a different own plan reloads the app
function importData(e) {
  const file = e.target.files[0]; if (!file) return
  const r = new FileReader()
  r.onload = async () => {
    try {
      const d = JSON.parse(String(r.result))
      if (!d?.sessions) throw 0
      const n = mergeSessions(d.sessions, d.deleted)
      const w = d.weights ? importWeights(d.weights) : 0
      if (d.profile) importAccount(d.profile)
      if (d.plan && await importPlan(d.plan)) setTimeout(() => location.reload(), 1500)
      say('Wczytano ' + n + ' treningów' + (w ? ' i ' + w + ' pomiarów wagi' : ''))
    } catch { say('To nie jest plik kopii z tej aplikacji') }
    e.target.value = ''
  }
  r.readAsText(file)
}

async function askToken() {
  const { role, value: tok } = await ask({ icon: logoGithub, title: 'Token GitHub',
    message: 'Wklej token z uprawnieniem tylko do Gistów (zaczyna się od github_pat_ albo ghp_).',
    input: { type: 'password', placeholder: 'github_pat_…' },
    buttons: [{ text: 'Połącz', role: 'ok', kind: 'primary' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role !== 'ok' || !tok) return
  const r = await connect(tok)
  say(!r.ok ? r.error
    : (r.restored ? `Połączono · przywrócono ${r.restored} treningów` : 'Połączono') + (r.sent ? ' · kopia wysłana' : ' · wyślę, gdy będzie internet'))
}
async function pushNow() { say((await syncNow()) ? 'Kopia wysłana' : (cloud.error || 'Brak internetu')) }
async function pullNow() {
  try { const n = await restoreNow(); say(n ? `Przywrócono ${n} treningów` : 'Wszystko już jest w telefonie') }
  catch (e) { say(e.message || 'Brak internetu') }
}
async function askDisconnect() {
  const { role } = await ask({ icon: cloudOfflineOutline, title: 'Odłączyć GitHub?',
    message: 'Automatyczna kopia przestanie działać. Kopia na GitHubie zostaje, treningi w telefonie też.',
    buttons: [{ text: 'Odłącz', role: 'destructive', kind: 'danger' }, { text: 'Anuluj', role: 'cancel' }] })
  if (role === 'destructive') { await disconnect(); say('Odłączono') }
}
</script>

<style scoped>
.hero { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 22px 18px 18px; }
.hero-ico { width: 60px; height: 60px; border-radius: 16px; display: grid; place-items: center; font-size: 32px; color: #fff; margin-bottom: 12px; background: var(--accent); }
.hero p { margin: 6px 0 16px; color: var(--app-muted); font-size: 15px; line-height: 1.4; }
.err { color: var(--app-bad) !important; }
.kop { margin: 4px 20px 10px; font-size: 13.5px; color: var(--app-muted); }
.stats + .ios-group { margin-top: 0; }
</style>
