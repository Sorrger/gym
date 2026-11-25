// Quick "today's weight" dialog – used on the Weight page and from the Start tile (one tap, no page change).
import { scale } from 'ionicons/icons'
import { ask } from './dialog'
import { weights, setWeight } from './weight'
import { iso } from './store'

export const fmtKg = v => String(Math.round(v * 10) / 10).replace('.', ',')
export const parseKg = v => { const n = +String(v || '').replace(',', '.').replace(/[^\d.]/g, ''); return n >= 30 && n <= 300 ? Math.round(n * 10) / 10 : null }
// returns 'saved' | 'details' | null
export async function askWeight({ details = false } = {}) {
  const today = iso(new Date()), list = weights.value
  const cur = list.find(p => p.date === today), last = list[list.length - 1]
  const buttons = [{ text: 'Zapisz', role: 'ok', kind: 'primary' }]
  if (details) buttons.push({ text: 'Wykres i szczegóły', role: 'details', kind: 'soft' })
  buttons.push({ text: 'Anuluj', role: 'cancel', kind: 'plain' })
  const r = await ask({ icon: scale, title: 'Dzisiejsza waga', message: cur ? 'Dziś już zapisane – możesz poprawić.' : 'W kilogramach, rano na czczo, np. 82,4',
    input: { mode: 'decimal', value: cur ? fmtKg(cur.kg) : '', placeholder: last ? fmtKg(last.kg) : '0,0' }, buttons })
  if (r.role === 'details') return 'details'
  if (r.role !== 'ok') return null
  const kg = parseKg(r.value)
  if (kg == null) { await ask({ icon: scale, title: 'Nie rozumiem liczby', message: 'Wpisz wagę w kg, np. 82,4', buttons: [{ text: 'OK', role: 'ok', kind: 'primary' }] }); return null }
  setWeight(today, kg)
  return 'saved'
}
