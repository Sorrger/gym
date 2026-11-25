import { chromium, devices } from 'playwright-core'
const S = {}
const mk = (id, date, day, key) => { const st = new Date(date + 'T18:00:00').getTime(); S[id] = { id, date, day, ex: { [key]: [{ w: 60, r: 8, d: true }, { w: 60, r: 8, d: true }, { w: 60, r: 7, d: true }] }, started: st, finished: true, updated: st + 3600e3 } }
mk('a', '2026-11-10', 0, 'Wyciskanie sztangi na ławce płaskiej')
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const cx = await b.newContext({ ...devices['iPhone 15'] }); await cx.clock.install({ time: new Date('2026-11-21T12:00:00') }); await cx.addInitScript(() => localStorage.setItem('onboarded', '1')); const p = await cx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1200)
await p.evaluate(async S => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(S, 'sessions'); tx.oncomplete = res } }) }, S)
await p.reload(); await p.waitForTimeout(1500)
const n = () => p.evaluate(() => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const q = r.result.transaction('keyval').objectStore('keyval').get('sessions'); q.onsuccess = () => res(Object.values(q.result).map(s => s.date + ':' + s.day + (s.manual ? 'M' : '') + (s.offApp ? 'O' : '') + ':' + Object.values(s.ex).flat().filter(x => x.d).length)) } }))

await p.goto('http://localhost:4173/#/tabs/train'); await p.waitForTimeout(1200); await p.locator('.row:visible', { hasText: 'Dodaj zrobiony trening' }).click(); await p.waitForTimeout(600); await p.screenshot({ path: 'add-dlg.png' })
console.log('date chips:', await p.locator('.dlg-chip').allInnerTexts())
await p.locator('.dlg-chip:has-text("Push")').click(); await p.locator('.dlg-chip:has-text("20.11")').click()
await p.locator('.dlg-btn:has-text("Wpisz serie")').click(); await p.waitForTimeout(1500)
console.log('url', p.url().split('#')[1], 'chip:', await p.locator('.edit-chip:visible').textContent())
await p.screenshot({ path: 'add-wo.png' })
// leave without ticking → dropped
await p.locator('.tb-finish:visible').click(); await p.waitForTimeout(1200)
console.log('after empty leave', await n())
// again, tick a set
await p.goto('http://localhost:4173/#/tabs/train'); await p.waitForTimeout(1200); await p.locator('.row:visible', { hasText: 'Dodaj zrobiony trening' }).click(); await p.waitForTimeout(600)
await p.locator('.dlg-chip:has-text("Push")').click(); await p.locator('.dlg-chip:has-text("20.11")').click()
await p.locator('.dlg-btn:has-text("Wpisz serie")').click(); await p.waitForTimeout(1500)
const tick = p.locator('button.check:visible').first()
console.log('tick count', await tick.count())
await tick.click(); await p.waitForTimeout(800)
await p.locator('.tb-finish:visible').click(); await p.waitForTimeout(1200)
console.log('after tick', await n(), 'week:', await p.goto('http://localhost:4173/#/tabs/home').then(() => p.reload()).then(() => p.waitForTimeout(1300)).then(() => p.locator('.t-foot:visible').first().textContent()))
// mark only
await p.goto('http://localhost:4173/#/tabs/train'); await p.waitForTimeout(1200); await p.locator('.row:visible', { hasText: 'Dodaj zrobiony trening' }).click(); await p.waitForTimeout(600); await p.locator('.dlg-chip:has-text("Pull")').click(); await p.locator('.dlg-btn:has-text("Bez serii")').click(); await p.waitForTimeout(800)
console.log('after mark', await n(), 'flash:', await p.locator('ion-toast').getAttribute('message'))
console.log('errs', errs); await b.close()
