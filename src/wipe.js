// "Usuń moje dane": everything this app keeps on the phone goes. The cloud backup is disconnected first,
// otherwise the empty phone would restore it again; the backup itself stays on GitHub.
import { clear } from './db'
import { state } from './store'
import { disconnect } from './cloud'

export async function wipeAll() {
  state.loadError = true // no more saves from this moment
  await disconnect().catch(() => {})
  await clear()
  try { localStorage.clear() } catch {}
  try { sessionStorage.clear() } catch {}
}
