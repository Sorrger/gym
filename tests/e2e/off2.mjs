import { chromium, devices } from 'playwright-core'
const S = {}
const mk = (id, date, day, key) => { const st = new Date(date + 'T18:00:00').getTime(); S[id] = { id, date, day, ex: { [key]: [{ w: 60, r: 8, d: true }] }, started: st, finished: true, updated: st + 3600e3 } }
mk('a', '2026-11-16', 1, 'Face pull na wyciągu'); mk('b', '2026-11-19', 2, 'Przysiad Zerchera'); mk('c', '2026-11-20', 3, 'Wyciskanie na skosie na Smithie')
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
for (const mode of ['light', 'dark']) {
const cx = await b.newContext({ ...devices['iPhone 15'], colorScheme: mode }); await cx.clock.install({ time: new Date('2026-11-21T12:00:00') }); const p = await cx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message))
await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1200)
await p.evaluate(async S => { await new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const tx = r.result.transaction('keyval', 'readwrite'); tx.objectStore('keyval').put(S, 'sessions'); tx.oncomplete = res } }) }, S)
await p.reload(); await p.waitForTimeout(1500)
const pill = async () => (await p.locator('.next-pill:visible').textContent()) + ' ' + (await p.locator('.plan.next:visible b').textContent())
const cnt = async () => (await p.locator('.t-foot:visible').first().textContent()).trim()
console.log(mode, 'start:', await pill(), cnt && await cnt())
await p.locator('.off-link:visible').click(); await p.waitForTimeout(600)
console.log(' chips:', (await p.locator('.dlg-chip').allTextContents()).join(' | '), '| on:', (await p.locator('.dlg-chip.on').allTextContents()).join(' / '))
await p.screenshot({ path: `off-dlg-${mode}.png` })
await p.locator('.dlg-chip:has-text("Wt")').click()
await p.locator('.dlg-btn:has-text("Bez serii")').click(); await p.waitForTimeout(800)
console.log(' toast:', await p.locator('ion-toast').first().getAttribute('message'))
console.log(' after:', await pill(), await cnt(), 'off days:', await p.locator('.day.off:visible').count(), 'link:', await p.locator('.off-link:visible').count())
await p.screenshot({ path: `off-home-${mode}.png` })
// mark Push again on Monday (Pull already there) → ring
await p.evaluate(() => {})
await p.locator('.day.off:visible').first().click(); await p.waitForTimeout(600)
console.log(' remove dlg buttons:', (await p.locator('.dlg-btn').allTextContents()).join(' | '))
await p.locator('.dlg-btn:has-text("Usuń")').click(); await p.waitForTimeout(700)
console.log(' after remove:', await pill(), await cnt())
await p.locator('.off-link:visible').click(); await p.waitForTimeout(500)
await p.locator('.dlg-chip:has-text("Pn")').click(); await p.locator('.dlg-btn:has-text("Bez serii")').click(); await p.waitForTimeout(700)
console.log(' on Monday with Pull:', await cnt(), 'both:', await p.locator('.day.both:visible').count())
await p.reload(); await p.waitForTimeout(1500)
console.log(' reload:', await pill(), await cnt())
await p.goto('http://localhost:4173/#/tabs/history'); await p.reload(); await p.waitForTimeout(1200)
await p.goto('http://localhost:4173/#/tabs/progress'); await p.reload(); await p.waitForTimeout(1200)
console.log(' errors:', errs)
}
await b.close()
