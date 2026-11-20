// Starting a workout (from Start or the plan preview): asks what to do with a workout that is still open.
import { barbell } from 'ionicons/icons'
import { ask } from './dialog'
import { PLAN, COLORS } from './plan'
import { activeSession, startSession, finishSession, counts } from './store'

export async function startPlan(day, router) {
  const open = id => router.push('/workout/' + id)
  const a = activeSession()
  if (a && a.day === day) { open(a.id); return } // same plan: just continue it
  if (a) {
    const c = counts(a)
    const { role } = await ask({ icon: barbell, color: COLORS[PLAN[a.day].key],
      title: `Trwa trening ${PLAN[a.day].name}`,
      message: c.n
        ? `Masz odhaczone ${c.n}/${c.t} serii. Na pewno zakończyć go (zostanie zapisany) i zacząć ${PLAN[day].name}?`
        : `Nic jeszcze nie odhaczyłeś. Na pewno porzucić go i zacząć ${PLAN[day].name}?`,
      buttons: [
        { text: 'Wróć do ' + PLAN[a.day].name, role: 'continue', kind: 'primary' },
        { text: c.n ? 'Zakończ i zacznij ' + PLAN[day].name : 'Porzuć i zacznij ' + PLAN[day].name, role: 'confirm', kind: 'soft' },
        { text: 'Anuluj', role: 'cancel' }
      ] })
    if (role === 'continue') { open(a.id); return }
    if (role !== 'confirm') return
    finishSession(a.id)
  }
  const s = startSession(day)
  open(s.id)
}
