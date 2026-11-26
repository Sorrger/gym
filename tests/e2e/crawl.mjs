import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
import fs from 'fs'
const b = await launch()
const all = new Set()
const ctx = await b.newContext({ ...devices['iPhone 15'] })
await ctx.addInitScript(() => { localStorage.setItem('lang', 'en'); localStorage.setItem('onboarded', '1') })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[20,104.2],[14,103.6],[10,103.5],[6,103.1],[3,102.9],[1,102.6],[0,102.7]].forEach(([n,kg]) => W[new Date(Date.now()-n*864e5).toISOString().slice(0,10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
const grab = async () => { const r = await p.evaluate(() => { const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT); let n
  while ((n = w.nextNode())) { if (n.nodeType === 3) { const v = n.nodeValue.trim(); if (v && /[A-Za-ząćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(v) && !/^(SCRIPT|STYLE)$/.test(n.parentNode.nodeName) && !n.parentNode.closest('[data-no-tr]')) out.push(v) }
    else for (const a of ['placeholder', 'aria-label', 'title']) { const v = n.getAttribute(a); if (v && /[a-ząćęłńóśźż]/i.test(v)) out.push(v) } }
  return out }); r.forEach(x => all.add(x)) }
const go = async h => { await p.goto('http://localhost:4173/#' + h); await p.reload(); await p.waitForTimeout(1400); await grab() }
const dlg = async (sel, txt) => { try { const l = txt ? p.locator(sel, { hasText: txt }).first() : p.locator(sel).first(); await l.click({ timeout: 3000 }); await p.waitForTimeout(600); await grab(); await p.locator('.dlg-btn:visible').last().click({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(400) } catch {} }
for (const h of ['/tabs/home', '/tabs/train', '/tabs/history', '/tabs/profile', '/settings', '/settings/look', '/settings/lang', '/settings/training', '/settings/details', '/settings/weight', '/settings/backup', '/settings/strava', '/weight', '/plans', '/plan/0', '/plan/1', '/plan/2', '/plan/3', '/plan/0/edit', '/plan/1/edit', '/plan/new/edit', '/progress/0', '/progress/1', '/progress/2', '/progress/3', '/exercise/0/0', '/exercise/1/0', '/session/s1', '/session/s2']) await go(h)
await go('/tabs/progress'); for (const t of ['Treningi', 'Ciało']) { await p.locator('.ptabs button').nth(t === 'Treningi' ? 1 : 2).click(); await p.waitForTimeout(500); await grab() }
for (const v of ['28', '91']) { await p.locator(`ion-segment-button[value="${v}"]`).first().click().catch(() => {}); await p.waitForTimeout(400); await grab() }
await go('/tabs/home'); await dlg('.stat-w, .tile', 'Wag'); await go('/tabs/train'); await dlg('.row', 'Dodaj zrobiony'); 
await go('/tabs/profile'); await dlg('.me'); await dlg('.row', 'Google')
await go('/weight'); for (const g of [0, 1, 2]) { await p.locator('.goal button').nth(g).click(); await p.waitForTimeout(300); await grab() }
await dlg('button', 'Wklej')
await go('/settings/backup'); await dlg('button', 'GitHub'); await go('/settings/strava'); await dlg('button', 'Strav')
await go('/plans'); await dlg('.reset')
// workout
await go('/plan/1'); await p.locator('.go:visible').click(); await p.waitForTimeout(1800); await grab(); await p.locator('.dlg-btn:visible').last().click().catch(() => {}); await p.waitForTimeout(300)
for (let i = 0; i < 9; i++) { await p.locator('.dots button, .pager button, .top-dots button').nth(i).click({ timeout: 1500 }).catch(() => {}); await p.waitForTimeout(700); await grab(); await p.locator('.dlg-btn:visible').last().click({ timeout: 800 }).catch(() => {}); await p.waitForTimeout(250); await grab() }
await p.locator('button.check:visible').first().click().catch(() => {}); await p.waitForTimeout(500); await grab()
await dlg('.tip-chip'); await dlg('button', 'Zamień'); await dlg('button', 'Minutnik')
// rest timer, set types, warm-up and Zapas chips switched on
await p.evaluate(() => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const st = r.result.transaction('keyval', 'readwrite').objectStore('keyval'); const g = st.get('profile'); g.onsuccess = () => { const pr = g.result || { uid: 'x', nick: '', created: Date.now() }; pr.prefs = { ...(pr.prefs || {}), restTimer: true, setTypes: true, rir: true, warmup: true }; pr.updated = Date.now(); st.put(pr, 'profile') } } })
await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(1500); await grab()
await p.locator('button.check:visible').nth(1).click().catch(() => {}); await p.waitForTimeout(800); await grab()
await p.locator('.idx.ty:visible').first().click().catch(() => {}); await p.waitForTimeout(300); await grab()
await p.locator('.tb-finish:visible').click().catch(() => {}); await p.waitForTimeout(1200); await grab()
await p.locator('button', { hasText: 'Zapisz' }).first().click().catch(() => {}); await p.waitForTimeout(1000); await grab()
await go('/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1800); await grab()
await p.locator('.tb-trash:visible').click().catch(() => {}); await p.waitForTimeout(500); await grab(); await p.locator('.dlg-btn:visible').first().click().catch(() => {}); await p.waitForTimeout(800)
// welcome
const c2 = await b.newContext({ ...devices['iPhone 15'], fresh: true }); const q = await c2.newPage()
await q.goto('http://localhost:4173/#/tabs/home'); await q.waitForTimeout(1500)
const g2 = async () => (await q.evaluate(() => [...document.querySelectorAll('h1,p,b,button,span,small,label')].map(e => e.childNodes).flatMap(n => [...n]).filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).filter(v => /[a-ząćęłńóśźż]/i.test(v)))).forEach(x => all.add(x))
await g2(); await q.locator('.big').first().click(); await q.waitForTimeout(500); await g2(); await q.locator('.next').click(); await q.waitForTimeout(500); await g2()
// welcome in English
const c3 = await b.newContext({ ...devices['iPhone 15'], fresh: true }); await c3.addInitScript(() => localStorage.setItem('lang', 'en')); const z = await c3.newPage()
await z.goto('http://localhost:4173/#/welcome'); await z.waitForTimeout(1500)
for (let i = 0; i < 4; i++) { (await z.evaluate(() => [...document.querySelectorAll('body *')].flatMap(e => [...e.childNodes]).filter(n => n.nodeType === 3).map(n => n.nodeValue.trim()).filter(v => /[a-ząćęłńóśźż]/i.test(v)))).forEach(x => all.add(x)); await z.locator('.next, button.big').last().click().catch(() => {}); await z.waitForTimeout(600) }
fs.writeFileSync('strings.json', JSON.stringify([...all].sort(), null, 0))
console.log('strings', all.size, 'errs', errs.slice(0, 3)); await b.close()
