// Checks the LIVE app (GitHub Pages) like a new phone would: it starts, no errors, no rescue screen, no blocked
// resources (CSP), the offline copy works. Run by .github/workflows/smoke.yml after every deploy and every day.
// Local: URL=https://sorrger.github.io/gym/ node tests/smoke/live.mjs
import { launch } from '../e2e/lib.mjs'
import { devices } from 'playwright-core'
const URL = process.env.URL || 'https://sorrger.github.io/gym/'
const b = await launch()
let fails = 0
const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL', m, x ?? '') } else console.log('ok  ', m) }
const ctx = await b.newContext({ ...devices['iPhone 15'] })
const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message))
p.on('console', m => { if (m.type() === 'error' && !/ionPageElement|favicon/.test(m.text())) errs.push(m.text()) })
const t0 = Date.now()
await p.goto(URL + '?smoke=' + Date.now(), { waitUntil: 'load' })
await p.waitForFunction(() => window.__appReady === true, null, { timeout: 20000 }).catch(() => {})
ok(await p.evaluate(() => window.__appReady === true), 'app starts', (Date.now() - t0) + ' ms')
ok(!(await p.locator('#rescue').count()), 'no rescue screen')
ok((await p.locator('body').innerText()).length > 50, 'something is on screen')
// the service worker takes the app offline
await p.waitForFunction(() => navigator.serviceWorker?.controller || navigator.serviceWorker?.ready, null, { timeout: 20000 }).catch(() => {})
await p.waitForTimeout(4000)
await p.reload(); await p.waitForTimeout(2500)
await ctx.setOffline(true)
await p.reload().catch(() => {}); await p.waitForTimeout(3500)
ok(await p.evaluate(() => window.__appReady === true).catch(() => false), 'starts offline (gym without signal)')
await ctx.setOffline(false)
ok(!errs.length, 'no errors', errs.slice(0, 5))
await b.close()
if (fails) { console.log(fails + ' FAILED'); process.exit(1) }
console.log('Live app OK: ' + URL)
