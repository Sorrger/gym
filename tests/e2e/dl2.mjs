import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
const plan = await import('../../src/plan.js')
const S = {}
const isoD = d => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
const P = 'Nauka podciągania · '
for (let w = 6; w >= 0; w--) for (const [off, day] of [[0, 0], [1, 1], [3, 2], [4, 3]]) {
  if (w === 0 && day === 1) continue // Pull skipped this week
  const d = new Date(2026, 10, 16 - w * 7 + off, 18)
  const ex = {}
  plan.entriesOf(day, { ex: {} }).forEach((g, j) => {
    const base = 20 + j * 5 + (6 - w) * 2.5
    ex[g.key] = g.unit === 'kg' ? Array.from({ length: g.sets }, () => ({ w: base, r: 8, d: true })) : Array.from({ length: g.sets }, () => ({ w: 10, d: true }))
  })
  if (ex[P + 'Wiszenie']) { ex[P + 'Wiszenie'].forEach(x => (x.w = w <= 1 ? 30 : 25)); ex[P + 'Negatywy'].forEach(x => (x.w = w <= 1 ? 5 : 4)) }
  const id = 'z' + w + day, st = d.getTime()
  S[id] = { id, date: isoD(d), day, ex, started: st, finished: true, updated: st + 3600e3 }
}
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'], colorScheme: 'dark' })
const p = await ctx.newPage()
const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()))
await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1200)
await p.evaluate(async (S) => { await new Promise((res) => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(S, 'sessions'); tx.oncomplete = res } }) }, S)
await p.reload(); await p.waitForTimeout(1500)
const txt = async sel => (await p.locator(sel).first().textContent())?.trim()
console.log('deload card:', await txt('.dl-card:visible'))
console.log('pill:', await txt('.b-pill:visible'), '| on', await p.locator('.b-plan:visible').first().textContent())
await p.screenshot({ path: 'z-home.png' })
await p.locator('.banner:visible').first().click(); await p.waitForTimeout(900)
console.log('plan tip:', await txt('.dl-box:visible'))
console.log('stage:', await p.locator('.stage:visible').count())
console.log('rows:', (await p.locator('.ex:visible .tgt').allTextContents()).slice(0, 3))
// (screenshot removed)
await p.locator('.go:visible').click(); await p.waitForTimeout(1500)
console.log('dialog:', (await p.locator('.dlg, [class*=dlg]').first().textContent().catch(() => ''))?.slice(0, 300))
await p.screenshot({ path: 'z-dialog.png' })
await p.locator('.dlg-btn:has-text("Ustaw")').first().click().catch(() => p.locator('.dlg-btn').first().click()); await p.waitForTimeout(700)
console.log('sets per group:', await p.locator('.group:visible').evaluateAll(gs => gs.map(g => g.querySelector('b')?.textContent + ':' + g.querySelectorAll('.set').length)))
console.log('target:', await txt('.target:visible'))
await p.screenshot({ path: 'z-workout.png' })
await p.locator('.dot:visible').nth(1).click(); await p.waitForTimeout(1300)
console.log('ex2 dialog in deload (should be 0):', await p.locator('.dlg-btn:visible').count())
console.log('ex2 chip:', await p.locator('.tip-chip:visible').allTextContents(), 'sets', await p.locator('.set:visible').count())
await p.screenshot({ path: 'z-ex2.png' })
await p.locator('.dot:visible').nth(0).click(); await p.waitForTimeout(900)
await p.locator('.tag.dl:visible').click(); await p.waitForTimeout(700)
await p.screenshot({ path: 'z-dlinfo.png' })
await p.locator('.dlg-btn:has-text("normalnie")').click(); await p.waitForTimeout(900)
console.log('after normal:', await p.locator('.group:visible').evaluateAll(gs => gs.map(g => g.querySelector('b')?.textContent + ':' + g.querySelectorAll('.set').length)), 'tag:', await p.locator('.tag.dl:visible').count())
// go to exercise 2 (row) and check weights are normal
await p.locator('.dot:visible').nth(1).click(); await p.waitForTimeout(1200)
if (await p.locator('.dlg-btn').count()) { console.log('ex2 dialog:', (await p.locator('.dlg-btn').allTextContents()).join(' / ')); await p.locator('.dlg-btn').last().click(); await p.waitForTimeout(500) }
await p.screenshot({ path: 'z-ex2.png' })
// progress pull
await p.goto('http://localhost:4173/#/progress/1'); await p.reload(); await p.waitForTimeout(1500)
console.log('progress statuses:', (await p.locator('.status:visible').allTextContents()).slice(0, 5))
await p.screenshot({ path: 'z-progress.png', fullPage: true })
await p.goto('http://localhost:4173/#/tabs/home'); await p.reload(); await p.waitForTimeout(1500)
console.log('home after cancel – deload card count:', await p.locator('.dl-card:visible').count())
console.log('errors:', errs)
await b.close()
