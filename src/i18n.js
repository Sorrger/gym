// Language: Polish (source) or English. The app is written in Polish; in English the visible text is translated
// on the fly: every text node / label in the page goes through tr() (exact phrases + patterns from i18n-en.js).
// Vue writes text nodes without reading them back, so changing them is safe. Switching language reloads the app.
// Code that puts text where the page can't see it (toasts, back-button labels, canvas) calls t() itself.
// Data never changes: exercise and plan names stay Polish in storage (they are history keys) – only their display.
// Another language = one more dictionary file like i18n-en.js, added to LANGS below.
import * as en from './i18n-en'

/** code → name shown in the picker, date/number locale, dictionary (null = Polish source) */
export const LANGS = {
  pl: { name: 'Polski', locale: 'pl-PL', dict: null },
  en: { name: 'English', locale: 'en-GB', dict: en },
}
const read = () => { try { return localStorage.getItem('lang') } catch { return null } }
export let lang = LANGS[read()] ? read() : 'pl'
export const hasChosenLang = () => !!read()
export const LOC = () => LANGS[lang].locale
let DICT = LANGS[lang].dict
export function setLang(l, reload = true) {
  try { localStorage.setItem('lang', l) } catch {}
  if (l !== lang && reload) location.reload()
  lang = l
  DICT = LANGS[l]?.dict || null; RX = build(); cache.clear()
}

const build = () => (DICT?.PATTERNS || []).map(([src, out]) => [new RegExp('^' + src + '$'), out])
/** @type {[RegExp, any][]} */
let RX = build()
const cache = new Map()
// translate one piece of text (keeps surrounding spaces); unknown text stays as it is
export function tr(s) {
  if (!DICT || s == null) return s
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(String(s))
  const core = m[2]
  if (!core || !/[A-Za-zĄĆĘŁŃÓŚŹŻąćęłńóśźż]/.test(core)) return fixNum(String(s))
  let out = cache.get(core)
  if (out === undefined) {
    out = DICT.EN[core]
    if (out === undefined) {
      for (const [re, rep] of RX) {
        const g = re.exec(core)
        if (g) { out = typeof rep === 'function' ? rep(...g.slice(1).map(x => (x == null ? x : tr(x)))) : rep.replace(/\$(\d)/g, (_, i) => tr(g[+i] ?? '')); break }
      }
    }
    if (out === undefined) out = core
    out = fixNum(out)
    cache.set(core, out)
  }
  return m[1] + out + m[3]
}
export const t = tr
// 102,8 → 102.8 (but "8, 8, 7" stays)
const fixNum = s => s.replace(/(\d),(\d)/g, '$1.$2')

const ATTRS = ['placeholder', 'aria-label', 'title']
const mine = new WeakMap() // node → text we wrote (skip our own changes)
function fixText(n) {
  const v = n.nodeValue
  if (mine.get(n) === v) return
  const o = tr(v)
  if (o !== v) { mine.set(n, o); n.nodeValue = o } else mine.set(n, v)
}
function fixEl(el) {
  for (const a of ATTRS) { const v = el.getAttribute?.(a); if (v) { const o = tr(v); if (o !== v) el.setAttribute(a, o) } }
}
function walk(root) {
  if (root.nodeType === 3) { if (!root.parentNode || !/^(SCRIPT|STYLE|TEXTAREA)$/.test(root.parentNode.nodeName)) fixText(root); return }
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(root.nodeName) || root.closest?.('[data-no-tr]')) return
  fixEl(root)
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT)
  /** @type {any} */ let n
  while ((n = it.nextNode())) {
    if (n.nodeType === 1) { if (n.closest('[data-no-tr]')) continue; fixEl(n) } else if (!/^(SCRIPT|STYLE|TEXTAREA)$/.test(n.parentNode.nodeName) && !n.parentNode.closest('[data-no-tr]')) fixText(n)
  }
}
let started = false
export function initI18n() {
  document.documentElement.lang = lang
  if (!DICT || started) return
  started = true
  walk(document.body)
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') { if (!/** @type {any} */ (m.target).parentNode?.closest?.('[data-no-tr]')) fixText(m.target) }
      else if (m.type === 'attributes') fixEl(m.target)
      else m.addedNodes.forEach(walk)
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS })
}
