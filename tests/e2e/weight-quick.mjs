import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => { localStorage.setItem('onboarded', '1'); localStorage.setItem('look', '{"mode":"dark"}') })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.evaluate(async () => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); const W = {}; [[40,106.5],[33,105.8],[27,105.2],[20,104.2],[14,103.6],[10,103.5],[6,103.1],[3,102.9],[1,102.6]].forEach(([n,kg]) => W[new Date(Date.now()-n*864e5).toISOString().slice(0,10)] = { kg, t: 1 }); tx.objectStore('keyval').put(W, 'weights'); tx.oncomplete = res } }) })
await p.reload(); await p.waitForTimeout(1500)
await p.locator('.w-tile').click(); await p.waitForTimeout(500)
await p.locator('.dlg input').fill('102,4'); await p.locator('.dlg-btn:has-text("Zapisz")').click(); await p.waitForTimeout(600)
console.log('tile after save:', (await p.locator('.w-tile').innerText()).replace(/\s+/g, ' '))
await p.locator('.w-tile').click(); await p.waitForTimeout(500); await p.locator('.dlg-btn:has-text("Wykres")').click(); await p.waitForTimeout(1300)
console.log('→', p.url().split('#')[1])
await p.locator('.target').click(); await p.waitForTimeout(400); await p.locator('.dlg input').fill('98'); await p.locator('.dlg-btn:has-text("Zapisz")').click(); await p.waitForTimeout(500)
console.log('target:', (await p.locator('.target').innerText()).replace(/\s+/g, ' '))
console.log('details:', (await p.locator('.det').innerText()).replace(/\s+/g, ' '))
console.log('weeks:', (await p.locator('.weeks').innerText()).replace(/\s+/g, ' ').slice(0, 160))
await p.screenshot({ path: 'wq1.png', fullPage: false })
await p.mouse.wheel(0, 900); await p.waitForTimeout(400); await p.screenshot({ path: 'wq2.png' })
// Postępy → Ciało → weight card (its one place besides the Start tile), invisible pages?
await p.goto('http://localhost:4173/?r=1#/tabs/progress'); await p.waitForTimeout(1500) // full load: a hash-only change inside the same tab can land back on its last page
await p.locator('.ptabs button:visible', { hasText: 'Ciało' }).click(); await p.waitForTimeout(500)
await p.locator('.wcard:not(.mcard):visible').click(); await p.waitForTimeout(1500)
// Profil no longer repeats Waga / plan / history / numbers
await p.evaluate(() => {})
console.log('invisible pages:', await p.locator('.ion-page.ion-page-invisible').count(), 'h1', await p.locator('h1:visible').allInnerTexts())
await p.goto('http://localhost:4173/#/tabs/profile'); await p.reload(); await p.waitForTimeout(1300)
const dup = await p.locator('.row:visible', { hasText: /Waga|Mój plan|Historia treningów/ }).count()
console.log('profile duplicates:', dup); if (dup) console.log('FAIL Profil still lists Waga / plan / history')
console.log('errs', errs); await b.close()
