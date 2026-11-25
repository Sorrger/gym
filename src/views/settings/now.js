// a clock that ticks every 30 s while the section is shown, for "5 min temu" texts
import { ref, onMounted, onUnmounted } from 'vue'
import { ago, iso } from '../../store'

export function useNow() {
  const now = ref(Date.now()); let t
  onMounted(() => { t = setInterval(() => (now.value = Date.now()), 30000) })
  onUnmounted(() => clearInterval(t))
  return now
}
export function agoMin(ts, now = Date.now()) {
  const m = Math.round((now - ts) / 60000)
  if (m < 1) return 'przed chwilą'
  if (m < 60) return m + ' min temu'
  return m < 1440 ? Math.round(m / 60) + ' godz. temu' : ago(iso(new Date(ts)))
}
