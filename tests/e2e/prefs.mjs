import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[20,104.2],[14,103.6],[10,103.5],[6,103.1],[3,102.9],[1,102.6],[0,102.7]].forEach(([n,kg]) => W[new Date(Date.now()-n*864e5).toISOString().slice(0,10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.goto('http://localhost:4173/#/settings/details'); await p.reload(); await p.waitForTimeout(1500)
await p.screenshot({ path: 'pr-set.png', fullPage: false })
// default workout: popup + warmup
const startW = async () => { await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500); await p.locator('.go:visible').click(); await p.waitForTimeout(1800) }
await startW()
console.log('default: dialog', await p.locator('.dlg:visible').count(), 'warm', await p.locator('.warm:visible').count(), 'chip', await p.locator('.tip-chip:visible').count())
await p.locator('.dlg-btn:visible').last().click().catch(() => {}); await p.waitForTimeout(400)
await p.locator('button.check:visible').first().click(); await p.waitForTimeout(500)
console.log('default: rir', await p.locator('.rir:visible').count())
await p.locator('.tb-trash:visible').click(); await p.waitForTimeout(500); await p.locator('.dlg-btn.danger:visible, .dlg-btn:has-text("Usuń"):visible').first().click(); await p.waitForTimeout(1200)
// switch everything off
await p.goto('http://localhost:4173/#/settings/details'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.seg3 button:has-text("Wyłączone")').click()
for (const t of ['Rady w trakcie', 'Zapas powtórzeń', 'Rozgrzewka', 'Przejdź dalej', 'Lżejszy tydzień']) await p.locator('.toggles button.row', { hasText: t }).click()
await p.waitForTimeout(400)
console.log('switches on:', await p.locator('.sw-t.on').count(), 'stepper shown:', await p.locator('.every').count())
await p.reload(); await p.waitForTimeout(1500)
console.log('after reload switches on:', await p.locator('.sw-t.on').count(), 'coach seg:', await p.locator('.seg3 button.on').allInnerTexts())
await startW()
console.log('off: dialog', await p.locator('.dlg:visible').count(), 'warm', await p.locator('.warm:visible').count(), 'chip', await p.locator('.tip-chip:visible').count())
await p.locator('button.check:visible').first().click(); await p.waitForTimeout(500)
console.log('off: rir', await p.locator('.rir:visible').count())
await p.locator('.tb-trash:visible').click(); await p.waitForTimeout(500); await p.locator('.dlg-btn.danger:visible, .dlg-btn:has-text("Usuń"):visible').first().click(); await p.waitForTimeout(1200)
// weight goal
await p.goto('http://localhost:4173/#/weight'); await p.reload(); await p.waitForTimeout(1500)
console.log('cut verdict:', await p.locator('.verdict b').textContent())
await p.locator('.goal button:has-text("Masa")').click(); await p.waitForTimeout(300); console.log('bulk verdict:', await p.locator('.verdict b').textContent())
await p.screenshot({ path: 'pr-w.png' })
await p.locator('.goal button:has-text("Utrzymanie")').click(); await p.waitForTimeout(300); console.log('maintain verdict:', await p.locator('.verdict b').textContent())
console.log('export has prefs:', await p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('profile'); q.onsuccess = () => res(JSON.stringify(q.result.prefs)) } })))
console.log('errs', errs); await b.close()
