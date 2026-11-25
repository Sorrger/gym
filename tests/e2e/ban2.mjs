import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
// fresh phone: interview
const c1 = await b.newContext({ ...devices['iPhone 15'], fresh: true }); const q = await c1.newPage(); const errs = []; q.on('pageerror', e => errs.push(e.message))
await q.goto('http://localhost:4173/#/tabs/home'); await q.waitForTimeout(1500); console.log('fresh →', q.url().split('#')[1])
await q.locator('.big').first().click(); await q.waitForTimeout(500)
console.log('interview items:', await q.locator('.int').count())
await q.locator('.int', { hasText: 'Waga i sylwetka' }).click(); await q.screenshot({ path: 'int.png' })
await q.locator('.next').click(); await q.waitForTimeout(400)
console.log('account step weight fields:', await q.locator('.fld input[inputmode="decimal"]').count())
await q.locator('.fld input').first().fill('Kuba'); await q.locator('.next').click(); await q.waitForTimeout(300); await q.locator('.next').click(); await q.waitForTimeout(1500)
console.log('home:', q.url().split('#')[1], 'weight tile:', await q.locator('.w-tile').count(), 'records tile:', await q.locator('.home-stats', { hasText: 'Rekordy' }).count())
console.log('prefs:', await q.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const g = r.result.transaction('keyval').objectStore('keyval').get('profile'); g.onsuccess = () => res(JSON.stringify(g.result.prefs)) } })))
await q.goto('http://localhost:4173/#/tabs/profile'); await q.reload(); await q.waitForTimeout(1200); console.log('profile waga row:', await q.locator('.row:visible', { hasText: 'Waga' }).count())
// seeded: banner tap + trening tab add row
const c2 = await b.newContext({ ...devices['iPhone 15'] }); await c2.addInitScript(() => localStorage.setItem('onboarded', '1')); const p = await c2.newPage(); p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
console.log('all-link:', await p.locator('.all-link').count(), 'off-link:', await p.locator('.off-link').count())
await p.locator('.banner').click(); await p.waitForTimeout(1200); console.log('banner →', p.url().split('#')[1])
await p.goto('http://localhost:4173/#/tabs/train'); await p.reload(); await p.waitForTimeout(1300)
await p.locator('.row:visible', { hasText: 'Dodaj zrobiony trening' }).click(); await p.waitForTimeout(600); console.log('dialog:', await p.locator('.dlg:visible h2, .dlg:visible b').first().innerText().catch(() => '?'))
console.log('errs', errs); await b.close()
