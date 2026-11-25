// "Dodaj zrobiony trening" dialog (forgot to log a workout): with sets → opens it to tick, without → just marks the day.
// Used from the Trening tab.
import { addCircle } from 'ionicons/icons'
import { ask } from './dialog'
import { PLAN, WEEKDAY_TO_DAY } from './plan'
import { state, iso, suggestion, doneSessions, offMarks, addPastSession, markDoneOff } from './store'

export async function addDoneDialog(router) {
  const sug = suggestion(), day = sug.day, now = new Date()
  const WD = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']
  const days = Array.from({ length: 7 }, (_, k) => { const d = new Date(now); d.setDate(now.getDate() - 6 + k); return d }).map(d => {
    const date = iso(d), real = doneSessions().filter(s => s.date === date), offs = offMarks().filter(s => s.date === date)
    return { date, d, real, offs, label: date === iso(now) ? 'Dziś' : WD[d.getDay()] }
  })
  const js = +Object.keys(WEEKDAY_TO_DAY).find(k => WEEKDAY_TO_DAY[k] === day)
  const sched = sug.kind === 'missed' ? days.filter(x => x.d.getDay() === js).at(-1) : null
  const def = (sched && !sched.real.length ? sched : days.slice().reverse().find(x => !x.real.length && !x.offs.length) || days[6]).date
  const { role, picks } = await ask({ icon: addCircle, title: 'Dodaj zrobiony trening',
    message: 'Zapomniałeś zapisać? Wybierz trening i dzień. Możesz wpisać serie albo tylko zaznaczyć, że trening był.',
    choices: [
      { key: 'day', label: 'Trening', value: day, options: PLAN.map((p, i) => ({ value: i, label: p.name, hidden: p.hidden })).filter(o => !o.hidden) },
      { key: 'date', label: 'Kiedy', value: def, options: days.map(x => ({ value: x.date, label: x.label, sub: x.real.length ? PLAN[x.real[0].day].name : x.d.getDate() + '.' + String(x.d.getMonth() + 1).padStart(2, '0') })) }],
    buttons: [
      { text: 'Wpisz serie i ciężary', role: 'sets', kind: 'primary' },
      { text: 'Bez serii – tylko zaznacz, że był', role: 'mark', kind: 'soft' },
      { text: 'Anuluj', role: 'cancel', kind: 'plain' }] })
  if (role === 'sets') { const s = addPastSession(picks.day, picks.date); router.push('/workout/' + s.id); return }
  if (role !== 'mark') return
  markDoneOff(picks.day, picks.date)
  const x = days.find(y => y.date === picks.date)
  state.flash = `Dodano: ${PLAN[picks.day].name}, ${x.label.toLowerCase()} ${x.d.getDate()}.${picks.date.slice(5, 7)} (bez serii)`
}
