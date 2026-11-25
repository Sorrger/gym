// rest timer (Ustawienia → Trening → Minutnik przerwy): starts after a ticked set, beeps at the end
import { ref, computed, onUnmounted } from 'vue'
import { prefs } from '../../prefs'
import { beep, vibrate } from './beep'

export function useRest() {
  const end = ref(0), now = ref(Date.now())
  let iv = 0, doneT = 0
  const left = computed(() => Math.max(0, Math.ceil((end.value - now.value) / 1000)))
  const text = computed(() => Math.floor(left.value / 60) + ':' + String(left.value % 60).padStart(2, '0'))
  function stop() { clearInterval(iv); clearTimeout(doneT); end.value = 0 }
  function start(sec = prefs.restSec) {
    clearInterval(iv); clearTimeout(doneT)
    end.value = Date.now() + sec * 1000; now.value = Date.now()
    let rang = false
    iv = setInterval(() => {
      now.value = Date.now()
      if (!rang && left.value <= 0) {
        rang = true; beep(880, 160); setTimeout(() => beep(1320, 260), 220)
        vibrate([200, 100, 200])
        doneT = setTimeout(stop, 2500)
      }
    }, 250)
  }
  function add(d) { end.value = Math.max(Date.now() + 5000, end.value + d * 1000) }
  onUnmounted(stop)
  return { end, left, text, start, stop, add }
}
