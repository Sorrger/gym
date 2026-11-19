<template>
  <ion-page>
    <ion-content :scroll-y="false">
      <div class="page">
        <header class="page-head">
          <h1>Kopia</h1>
          <p>Twoje treningi są tylko w tym telefonie</p>
        </header>

        <div class="card hero">
          <div class="shield"><ion-icon :icon="shieldCheckmark" /></div>
          <div>
            <b>Prywatnie i offline</b>
            <p>Nic nie trafia do internetu. Zrób kopię co jakiś czas i zapisz ją w Plikach albo na iCloud, żeby nie stracić danych przy usunięciu aplikacji.</p>
          </div>
        </div>

        <div class="stat-grid">
          <div class="stat"><span>Treningi</span><b>{{ count }}</b></div>
          <div class="stat"><span>Od</span><b class="small">{{ firstDate }}</b></div>
          <div class="stat"><span>Kopia</span><b class="small" :class="{ warn: backupOld }">{{ backupText }}</b></div>
        </div>

        <div class="actions">
          <button class="action press primary" @click="exportData">
            <ion-icon :icon="shareOutline" />
            <div><b>Zapisz kopię</b><span>Plik .json do Plików, iCloud albo AirDrop</span></div>
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
import { ref, computed } from 'vue'
import { IonPage, IonContent, IonIcon, IonToast } from '@ionic/vue'
import { shareOutline, downloadOutline, shieldCheckmark } from 'ionicons/icons'
import { state, iso, fmtDate, ago, doneSessions } from '../store'

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
      let n = 0
      Object.entries(d.sessions).forEach(([k, b]) => {
        if (k.includes('~draft')) return
        const a = state.sessions[k]
        if (!a || (b.updated || 0) > (a.updated || 0)) { state.sessions[k] = { ...b, id: k, started: b.started || new Date(b.date + 'T12:00:00').getTime(), finished: b.finished ?? true }; n++ }
      })
      msg.value = 'Wczytano ' + n + ' treningów'
    } catch { msg.value = 'To nie jest plik kopii z tej aplikacji' }
    e.target.value = ''
  }
  r.readAsText(file)
}
</script>

<style scoped>
.hero { display: flex; gap: 14px; align-items: flex-start; }
.shield { width: 48px; height: 48px; flex: none; border-radius: 15px; display: grid; place-items: center; font-size: 26px; color: #fff;
  background: linear-gradient(140deg, #4a66f0, #2f4bd8); box-shadow: 0 4px 12px rgba(47,75,216,.3); }
.hero b { font-size: 17px; font-weight: 800; }
.hero p { margin: 3px 0 0; color: var(--app-muted); font-size: 14px; line-height: 1.4; }
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
