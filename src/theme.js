// Look settings on this phone (Profil → Wygląd): mode system / light / dark and the accent colour.
// Kept in localStorage (a per-device preference, not training data).
import { reactive } from 'vue'
export const ACCENTS = [
  { id: 'violet', name: 'Fiolet', light: '#7346f5', dark: '#9d7dff' },
  { id: 'blue', name: 'Niebieski', light: '#0a7aff', dark: '#409cff' },
  { id: 'green', name: 'Zielony', light: '#1f9d55', dark: '#34c759' },
  { id: 'orange', name: 'Pomarańcz', light: '#ef7200', dark: '#ff9f0a' },
  { id: 'pink', name: 'Róż', light: '#e0306f', dark: '#ff5c97' },
  { id: 'red', name: 'Czerwony', light: '#e5372e', dark: '#ff5a50' },
  { id: 'teal', name: 'Morski', light: '#0f8f96', dark: '#3cc8cf' },
  { id: 'indigo', name: 'Indygo', light: '#4b4fe0', dark: '#7d82ff' },
  { id: 'mint', name: 'Miętowy', light: '#0f9f7a', dark: '#4ad6b0' }
]
// background styles: how surfaces look under the accent (light / dark values)
export const STYLES = [
  { id: 'classic', name: 'Klasyczny', sub: 'jak iPhone' },
  { id: 'tinted', name: 'Kolorowy', sub: 'tło w kolorze akcentu' },
  { id: 'graphite', name: 'Grafit', sub: 'miękki, szary' },
  { id: 'contrast', name: 'Kontrast', sub: 'czerń i mocne karty' }
]
const read = () => { try { return JSON.parse(localStorage.getItem('look') || '{}') } catch { return {} } }
export const look = reactive({ mode: 'system', accent: 'violet', style: 'classic', ...read() })
const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')
const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
// a + (b - a) * t per channel
const mix = (a, b, t) => '#' + hex(a).map((x, i) => Math.round(x + (hex(b)[i] - x) * t).toString(16).padStart(2, '0')).join('')
/** surface colours of a style: [background, card, card-2] */
export function surfaces(style, dark, accent) {
  if (style === 'tinted') return dark ? [mix('#000000', accent, 0.09), mix('#161618', accent, 0.16), mix('#1e1e21', accent, 0.2)] : [mix('#f2f2f7', accent, 0.1), mix('#ffffff', accent, 0.035), mix('#f7f7fa', accent, 0.07)]
  if (style === 'graphite') return dark ? ['#151517', '#232326', '#2c2c30'] : ['#e8e8ed', '#f9f9fb', '#f0f0f4']
  if (style === 'contrast') return dark ? ['#000000', '#242428', '#2e2e33'] : ['#ffffff', '#efeff4', '#e6e6ec']
  return null
}

export const isDark = () => look.mode === 'dark' || (look.mode === 'system' && !!mq?.matches)
export function applyLook() {
  const dark = isDark()
  const el = document.documentElement
  el.classList.toggle('ion-palette-dark', dark)
  el.style.colorScheme = dark ? 'dark' : 'light'
  const a = ACCENTS.find(x => x.id === look.accent)
  for (const v of ['--accent', '--accent-rgb', '--accent-2', '--ion-color-primary-shade', '--ion-color-primary-tint']) el.style.removeProperty(v)
  if (a && a.id !== 'violet') {
    const c = dark ? a.dark : a.light
    el.style.setProperty('--accent', c); el.style.setProperty('--accent-2', c); el.style.setProperty('--accent-rgb', rgb(c))
    el.style.setProperty('--ion-color-primary-shade', c); el.style.setProperty('--ion-color-primary-tint', c)
  }
  const accent = a ? (dark ? a.dark : a.light) : dark ? '#9d7dff' : '#7346f5'
  const sf = surfaces(look.style, dark, accent)
  for (const v of ['--app-bg', '--app-card', '--app-card-2', '--ion-background-color', '--ion-background-color-rgb', '--ion-item-background']) el.style.removeProperty(v)
  if (sf) {
    el.style.setProperty('--app-bg', sf[0]); el.style.setProperty('--ion-background-color', sf[0]); el.style.setProperty('--ion-background-color-rgb', rgb(sf[0]))
    el.style.setProperty('--app-card', sf[1]); el.style.setProperty('--ion-item-background', sf[1]); el.style.setProperty('--app-card-2', sf[2])
  }
  const bg = sf ? sf[0] : dark ? '#000000' : '#f2f2f7'
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', bg))
}
export function setLook(k, v) {
  look[k] = v
 try { localStorage.setItem('look', JSON.stringify(look)) } catch {} applyLook()
}
mq?.addEventListener?.('change', () => look.mode === 'system' && applyLook())
