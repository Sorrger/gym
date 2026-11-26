// option lists and number steppers shared by the Settings sections
import { prefs, DEFAULT_PREFS } from '../../prefs'
import { setPref } from '../../account'

const num = v => String(v).replace('.', ',')
export const COACH = [
  { v: 'set', t: 'Ustawiaj', d: 'Apka sama wpisuje dziś sugerowany ciężar i powtórzenia – bez okienka. Dlaczego tak: pod „Ostatnio…”.' },
  { v: 'auto', t: 'Okienko', d: 'Po otwarciu ćwiczenia apka pokazuje okienko, ile dziś dźwignąć.' },
  { v: 'chip', t: 'Na dotyk', d: 'Podpowiedź tylko pod „Ostatnio…” – otwierasz ją, kiedy chcesz.' },
  { v: 'off', t: 'Wyłączone', d: 'Bez podpowiedzi. Ciężary i tak wpisują się z ostatniego treningu.' }]
export const TOGGLES = [
  { k: 'live', t: 'Rady w trakcie serii', d: 'Za ciężko / za lekko – pod serią' },
  { k: 'rir', t: 'Zapas powtórzeń', d: 'Ile zostało do upadku (0, 1, 2, 3+)' },
  { k: 'warmup', t: 'Rozgrzewka', d: 'Serie rozgrzewkowe przy sztandze' },
  { k: 'autoNext', t: 'Przejdź dalej sam', d: 'Po ostatniej serii następne ćwiczenie' },
  { k: 'deload', t: 'Lżejszy tydzień (deload)', d: 'Apka sama ustawia lżejszy tydzień' },
  { k: 'restTimer', t: 'Minutnik przerwy', d: 'Startuje sam po odhaczeniu serii' },
  { k: 'setTypes', t: 'Rodzaje serii', d: 'Dotknij numer serii: rozgrzewkowa (R), drop set (D), do upadku (U). Rozgrzewkowe się nie liczą' }]
export const NUMS = [
  { k: 'rirUp', t: 'Zapas do dodania ciężaru', d: 'W każdej serii zostaje tyle powtórzeń → od razu więcej kg', min: 1, max: 5, step: 1, fmt: v => v + '+' },
  { k: 'repsGain', t: 'Powtórzeń więcej co trening', d: 'Ile dokładać na serię, aż dojdziesz do góry zakresu', min: 1, max: 3, step: 1, fmt: v => '+' + v },
  { k: 'stepKg', t: 'Krok ciężaru', d: 'Ile kg dodać (hantle i maszyny z własnym krokiem mają swój)', opts: [1, 1.25, 2, 2.5, 5], fmt: v => num(v) + ' kg' },
  { k: 'failN', t: 'Zejdź z ciężaru po', d: 'Tylu treningach z rzędu poniżej zakresu', min: 1, max: 3, step: 1, fmt: v => v + ' tr.' },
  { k: 'dropPct', t: 'Zejdź o', d: 'O ile lżej, gdy utkniesz albo seria była za ciężka', min: 5, max: 20, step: 5, fmt: v => v + '%' }]
export const DELOAD_NUMS = [
  { k: 'deloadEvery', t: 'Lżejszy tydzień co', d: 'tygodni treningu (wcześniej, gdy wyniki stoją)', min: 4, max: 12, step: 1, fmt: v => v + ' tyg.' },
  { k: 'deloadPct', t: 'O ile lżej', d: 'Ciężary w lżejszym tygodniu', min: 5, max: 30, step: 5, fmt: v => v + '%' }]
export const REST = { k: 'restSec', t: 'Czas przerwy', d: 'Po każdej serii (w trakcie: −15 / +15 s)', min: 30, max: 300, step: 15, fmt: v => Math.floor(v / 60) + ':' + String(v % 60).padStart(2, '0') }
export const GOALS = [
  { v: 'cut', t: 'Redukcja', d: 'Powoli w dół: 0,2–0,7 % wagi na tydzień, mięśnie zostają.' },
  { v: 'maintain', t: 'Utrzymanie', d: 'Waga stabilna: zmiana do ±0,25 % na tydzień.' },
  { v: 'bulk', t: 'Masa', d: 'Powoli w górę: 0,1–0,5 % wagi na tydzień, mało tłuszczu.' }]
// preferences that "Przywróć domyślne zasady treningu" resets (look, language, weight goal stay)
export const RULES = ['rirUp', 'repsGain', 'stepKg', 'failN', 'dropPct', 'deloadEvery', 'deloadPct', 'deloadHalf', 'coach', 'live', 'rir', 'warmup', 'autoNext', 'deload', 'restTimer', 'restSec', 'setTypes']
export const rulesDefault = () => RULES.every(k => prefs[k] === DEFAULT_PREFS[k])
export const resetRules = () => RULES.forEach(k => setPref(k, DEFAULT_PREFS[k]))

// a stepper either walks through `opts` or from min to max by `step`
export function canStep(t, d) {
  const v = prefs[t.k]
  if (t.opts) { const i = t.opts.indexOf(v); return d < 0 ? i > 0 || i < 0 : i < t.opts.length - 1 }
  return d < 0 ? v > t.min : v < t.max
}
export function step(t, d) {
  if (!canStep(t, d)) return
  const v = prefs[t.k]
  if (t.opts) { const i = t.opts.indexOf(v); setPref(t.k, t.opts[i < 0 ? t.opts.indexOf(2.5) : i + d]); return }
  setPref(t.k, Math.round((v + d * t.step) * 100) / 100)
}
