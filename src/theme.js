// Look settings on this phone (Profil → Wygląd): mode system / light / dark and the accent colour.
// Kept in localStorage (a per-device preference, not training data).
import { reactive } from 'vue'
export const ACCENTS = [
  { id: 'violet', name: 'Fiolet', light: '#7346f5', dark: '#9d7dff' },
  { id: 'blue', name: 'Niebieski', light: '#0a7aff', dark: '#409cff' },
  { id: 'green', name: 'Zielony', light: '#1f9d55', dark: '#34c759' },
  { id: 'orange', name: 'Pomarańcz', light: '#ef7200', dark: '#ff9f0a' },
  { id: 'pink', name: 'Róż', light: '#e0306f', dark: '#ff5c97' }
]
const read = () => { try { return JSON.parse(localStorage.getItem('look') || '{}') } catch { return {} } }
export const look = reactive({ mode: 'system', accent: 'violet', ...read() })
const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(', ')

export function applyLook() {
  const dark = look.mode === 'dark' || (look.mode === 'system' && !!mq?.matches)
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
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.setAttribute('content', dark ? '#000000' : '#f2f2f7'))
}
export function setLook(k, v) { look[k] = v; try { localStorage.setItem('look', JSON.stringify(look)) } catch {} applyLook() }
mq?.addEventListener?.('change', () => look.mode === 'system' && applyLook())
