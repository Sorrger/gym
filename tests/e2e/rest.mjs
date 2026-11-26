import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1'))
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
const startW = async () => { await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500); await p.locator('.go:visible').click(); await p.waitForTimeout(1800); await p.locator('.dlg-btn:visible').last().click().catch(() => {}); await p.waitForTimeout(300) }
await startW(); await p.locator('button.check:visible').first().click(); await p.waitForTimeout(700)
console.log('default: rest bar', await p.locator('.rest-bar').count(), 'type btn', await p.locator('.idx.ty').count())
await p.locator('.tb-trash:visible').click(); await p.waitForTimeout(500); await p.locator('.dlg-btn:has-text("Usuń"):visible').first().click(); await p.waitForTimeout(1000)
await p.goto('http://localhost:4173/#/settings/details'); await p.reload(); await p.waitForTimeout(1500)
for (const t of ['Minutnik przerwy', 'Rodzaje serii']) await p.locator('.toggles button.row', { hasText: t }).click()
await p.waitForTimeout(300)
const rr = p.locator('.row.every', { hasText: 'Czas przerwy' }); await rr.locator('button[aria-label="Mniej"]').click(); await rr.locator('button[aria-label="Mniej"]').click()
console.log('rest time:', await rr.locator('b.num, .stepper b').last().innerText())
await startW()
const ty = p.locator('.idx.ty:visible').first(); await ty.click(); console.log('type after tap:', await ty.innerText())
await p.locator('button.check:visible').first().click(); await p.waitForTimeout(700)
console.log('rest bar:', (await p.locator('.rest-bar').innerText()).replace(/\s+/g, ' '))
await p.locator('.rest-bar button', { hasText: '+15' }).click(); await p.waitForTimeout(300); console.log('after +15:', await p.locator('.rest-t b').innerText())
await p.screenshot({ path: 'rest.png' })
await p.clock?.fastForward?.(1).catch?.(() => {})
await p.locator('.rest-bar .skip').click(); await p.waitForTimeout(400); console.log('after skip:', await p.locator('.rest-bar').count())
// warm-up set must not be a record: tick set 2 normal heavier? check summary volume ignoring warm-up
await p.locator('.tb-finish:visible').click(); await p.waitForTimeout(1200)
console.log('summary sets text:', (await p.locator('.done-stats').innerText()).replace(/\s+/g, ' '))
console.log('errs', errs); await b.close()
