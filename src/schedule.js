// What to train and when: today's suggestion, trainings marked as done outside the app, workouts added afterwards
import { PLAN, entriesOf, WEEKDAY_TO_DAY, visiblePlans } from './plan'
import { state, sorted, iso, hasData, prefill, saveNow, forget } from './store'

export function lastDoneOf(day) { return sorted().find(s => s.day === day && hasData(s)) || null }
// which plan to do now, from the plan's weekdays (week = Mon–Sun):
// 1) today's scheduled plan if not done this week yet ("Dziś")
// 2) else a plan of this week whose day already passed and wasn't done – earliest first ("Zaległy"),
//    e.g. Pull skipped on Tuesday → Wednesday or the weekend suggests Pull
// 3) else the next scheduled plan not done yet this week, or Push of next week ("Następny")
// Done this week = done on any day this week (order can change). A plan done today doesn't count as missed.
export function suggestion(now = new Date()) {
  const today = iso(now), wd = (now.getDay() + 6) % 7 // 0 = Monday
  const monday = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - wd))
  const doneWeek = new Set(Object.values(state.sessions).filter(s => s.date >= monday && s.date <= today && (hasData(s) || s.offApp)).map(s => s.day))
  const sched = Object.entries(WEEKDAY_TO_DAY).map(([js, day]) => ({ wd: (+js + 6) % 7, day })).sort((a, b) => a.wd - b.wd)
  // no fixed weekdays (own plan): just the next training in order after the last one done
  if (!sched.length) {
    const vis = visiblePlans(), last = sorted().find(s => hasData(s) || s.offApp)
    const k = last ? vis.findIndex(i => i > last.day) : 0
    return { day: vis[k < 0 ? 0 : k] ?? 0, kind: 'next' }
  }
  const todays = sched.find(x => x.wd === wd)
  if (todays && !doneWeek.has(todays.day)) return { day: todays.day, kind: 'today' }
  const missed = sched.find(x => x.wd < wd && !doneWeek.has(x.day))
  if (missed) return { day: missed.day, kind: 'missed' }
  const upcoming = sched.find(x => x.wd > wd && !doneWeek.has(x.day))
  return { day: (upcoming || sched[0]).day, kind: 'next' }
}
export const suggestedDay = () => suggestion().day

// a training done without logging it in the app (forgot the phone, before installing it)
// Stored as an empty finished session { offApp: true } on that plan's scheduled day, so it syncs with the backup;
// it has no sets, so it never shows in history or stats – it only stops the plan from being suggested as missed.
// date: the day it was done (picked by the user); default = the plan's scheduled day this week, or today if that's later.
export function markDoneOff(day, date = null, now = new Date()) {
  if (!date) {
    const wd = (now.getDay() + 6) % 7
    const js = +Object.keys(WEEKDAY_TO_DAY).find(k => WEEKDAY_TO_DAY[k] === day)
    const back = js >= 0 ? Math.max(0, wd - ((js + 6) % 7)) : 0
    date = iso(new Date(now.getFullYear(), now.getMonth(), now.getDate() - back))
  }
  const id = 'off' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
  state.sessions[id] = { id, date, day, plan: PLAN[day]?.key, ex: {}, started: 0, finished: true, updated: Date.now(), offApp: true }
  saveNow()
  return state.sessions[id]
}
// "Dodaj zrobiony trening" with sets: a finished workout on a past day, sets prefilled from last time (unticked).
// Opens in edit mode; the user ticks what was done. Left without any ticked set → removed (dropEmptyManual).
export function addPastSession(day, date) {
  const now = Date.now(), started = new Date(date + 'T18:00:00').getTime()
  const s = { id: now.toString(36), date, day, plan: PLAN[day]?.key, ex: {}, started, finished: true, updated: now, manual: true }
  entriesOf(day).forEach(g => { s.ex[g.key] = prefill(g, g.sets || 1, false) })
  state.sessions[s.id] = s
  saveNow()
  return s
}
export function dropEmptyManual() {
  let n = 0
  for (const s of Object.values(state.sessions)) if (s.manual && s.finished && !hasData(s)) { forget(s.id); n++ }
  if (n) saveNow()
}
export const offMarks = () => Object.values(state.sessions).filter(s => s.offApp)
