import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
const S = {}
const mk = (id, date, day, ex) => { const st = new Date(date + 'T18:00:00').getTime(); S[id] = { id, date, day, ex, started: st, finished: true, updated: st + 3600e3 } }
mk('a', '2026-11-13', 3, { 'Rozpiętki na maszynie (butterfly)': [50, 50, 50].map(w => ({ w, r: 12, d: true })) })
mk('b', '2026-11-16', 0, { 'Rozpiętki na bramie z dołu do góry': [10, 10, 10].map(w => ({ w, r: 15, d: true })) })
const b = await launch()
const p = await (await b.newContext({ ...devices['iPhone 15'] })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1200)
await p.evaluate(async S => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(S, 'sessions'); tx.oncomplete = res } }) }, S)
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1300)
console.log('plan alt:', await p.locator('.alt:visible').allTextContents())
await p.locator('.go:visible').click(); await p.waitForTimeout(1300)
if (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(400) }
await p.locator('.dot').nth(2).click(); await p.waitForTimeout(1200)
if (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(400) }
console.log('title:', await p.locator('.ex-tt h1:visible').textContent(), '| chip:', await p.locator('.swap:visible').textContent())
await p.screenshot({ path: 'sw1.png' })
await p.locator('.swap:visible').click(); await p.waitForTimeout(500)
console.log('options:', (await p.locator('.dlg-btn').allTextContents()).join(' | '))
await p.screenshot({ path: 'sw2.png' })
await p.locator('.dlg-btn', { hasText: 'butterfly' }).click(); await p.waitForTimeout(1200)
console.log('tip after swap:', (await p.locator('.dlg h2').textContent().catch(() => 'none')))
if (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').first().click(); await p.waitForTimeout(500) }
console.log('title now:', await p.locator('.ex-tt h1:visible').textContent(), '| sets:', await p.locator('.set:visible .weight b').allTextContents(), '| chip:', await p.locator('.swap:visible').textContent())
await p.screenshot({ path: 'sw3.png' })
await p.locator('.set:visible button.check').first().click(); await p.waitForTimeout(300)
await p.locator('.swap:visible').click(); await p.waitForTimeout(500)
console.log('swap with ticked:', await p.locator('.dlg h2').textContent()); await p.locator('.dlg-btn').first().click(); await p.waitForTimeout(400)
await p.reload(); await p.waitForTimeout(1500)
console.log('after reload:', await p.locator('.ex-tt h1:visible').textContent())
await p.locator('.tb-finish').click(); await p.waitForTimeout(900); await p.locator('.save-btn').click(); await p.waitForTimeout(1300)
await p.goto('http://localhost:4173/#/progress/0'); await p.reload(); await p.waitForTimeout(1400)
console.log('progress cards:', (await p.locator('.rc-name:visible').allTextContents()).filter(t => /Rozpi/.test(t)))
console.log('errors:', errs); await b.close()
