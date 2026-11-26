// kg / lb, the week-streak setting and the legal pages
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1'))
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
let fails = 0
const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL', m, x ?? '') } else console.log('ok  ', m) }
await load(p, seed())
// streak: tap the tile, pick 2 a week
await p.goto('http://localhost:4173/#/tabs/home'); await p.reload(); await p.waitForTimeout(1500)
ok((await p.locator('.s-tile').innerText()).includes('min. 1 trening'), 'streak tile says 1 a week by default')
await p.locator('.s-tile').click(); await p.waitForTimeout(400)
await p.locator('.dlg-chip', { hasText: /^2/ }).click(); await p.locator('.dlg-btn:has-text("Zapisz")').click(); await p.waitForTimeout(500)
ok((await p.locator('.s-tile').innerText()).includes('min. 2 treningi'), 'streak needs 2 a week after picking', await p.locator('.s-tile').innerText())
// switch to lb
await p.goto('http://localhost:4173/#/settings/lang'); await p.reload(); await p.waitForTimeout(1300)
await p.locator('.seg3.units button', { hasText: 'lb' }).click(); await p.waitForTimeout(500)
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.go:visible').click(); await p.waitForTimeout(1500)
const unit = await p.locator('.weight small:visible').first().innerText()
const v0 = await p.locator('.weight b:visible').first().innerText()
ok(unit === 'lb', 'workout shows lb', unit)
await p.locator('.set .step:visible').nth(1).click(); await p.waitForTimeout(300)
const v1 = await p.locator('.weight b:visible').first().innerText()
const n = s => +s.replace(',', '.')
ok(Math.abs(n(v1) - n(v0) - 5) < 0.2, '+ adds 5 lb', [v0, v1])
const stored = await p.evaluate(async () => { const r = await new Promise(res => { const o = indexedDB.open('keyval-store'); o.onsuccess = () => res(o.result) }); const keys = await new Promise(res => { const q = r.transaction('keyval').objectStore('keyval').getAllKeys(); q.onsuccess = () => res(q.result) }); const open = []; for (const k of keys.filter(k => String(k).startsWith('s:'))) { const v = await new Promise(res => { const q = r.transaction('keyval').objectStore('keyval').get(k); q.onsuccess = () => res(q.result) }); if (!v.finished) open.push(v) } return open[0] })
const firstW = stored && Object.values(stored.ex).find(a => a[0]?.r != null)?.[0]?.w
ok(firstW && Math.abs(firstW * 2.20462262 - n(v1)) < 0.06, 'stored in kg', [firstW, v1])
ok(stored?.v === 2 && stored?.plan && /-/.test(stored.id), 'new workout in the database shape', [stored?.id, stored?.v, stored?.plan])
await p.screenshot({ path: 'units-workout.png' })
// legal pages from Settings, also in English
await p.goto('http://localhost:4173/#/settings'); await p.reload(); await p.waitForTimeout(1300)
await p.locator('.legal-links .row', { hasText: 'Polityka prywatności' }).click(); await p.waitForTimeout(1200)
ok(p.url().endsWith('/legal/privacy') && (await p.locator('.legal:visible').innerText()).includes('nie ma własnego serwera'), 'privacy policy opens')
await p.evaluate(() => localStorage.setItem('lang', 'en')); await p.reload(); await p.waitForTimeout(1500)
ok((await p.locator('.legal:visible').innerText()).includes('no server of its own'), 'privacy policy in English')
await p.goto('http://localhost:4173/#/settings/lang'); await p.reload(); await p.waitForTimeout(1300)
const foot = await p.locator('.section-foot:visible').allInnerTexts()
ok(foot.some(t => t.includes('always saved in kg')), 'units hint in English', foot)
ok(!errs.filter(e => !e.includes('ionPageElement')).length, 'no page errors', errs) // known harmless Ionic race on fast test navigation
await b.close()
if (fails) { console.log(fails + ' FAILED'); process.exit(1) }
