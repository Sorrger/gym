// one shared AudioContext for the hang timer and the rest timer; iOS only plays sound after a tap unlocked it
let audio = null
export async function unlockAudio() {
  try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); await audio.resume() } catch {}
}
export function beep(freq = 880, ms = 140) {
  try {
    if (!audio) return
    const o = audio.createOscillator(), gn = audio.createGain()
    o.frequency.value = freq; o.connect(gn); gn.connect(audio.destination)
    gn.gain.setValueAtTime(0.3, audio.currentTime); gn.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000)
    o.start(); o.stop(audio.currentTime + ms / 1000)
  } catch {}
}
export function vibrate(p) { try { navigator.vibrate?.(p) } catch {} }
