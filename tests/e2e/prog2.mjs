import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
for (const mode of ['light', 'dark']) {
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(m => localStorage.setItem('look', JSON.stringify({ mode: m })), mode)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await load(p, seed())
await p.goto('http://localhost:4173/#/settings/progress'); await p.reload(); await p.waitForTimeout(1500)
const row = t => p.locator('.row.every', { hasText: t })
console.log(mode, 'rows:', await p.locator('.row.every').count(), 'reset btn:', await p.locator('.reset-btn').count())
for (let i = 0; i < 2; i++) await row('Zapas do dodania').locator('button[aria-label="Więcej"]').click()
await row('Krok ciężaru').locator('button[aria-label="Więcej"]').click()
await row('Zejdź o').locator('button[aria-label="Więcej"]').click()
await p.waitForTimeout(300)
console.log('values:', await p.locator('.row.every .stepper b').allInnerTexts(), 'reset btn:', await p.locator('.reset-btn').count())
await row('Progresja').count()
await p.locator('h1.t-large:visible', { hasText: 'Progresja' }).waitFor()
// zapas chips in the workout now go to 5+
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500); await p.locator('.go:visible').click(); await p.waitForTimeout(1800)
await p.locator('.dlg-btn:visible').last().click().catch(() => {}); await p.waitForTimeout(300)
await p.locator('button.check:visible').first().click(); await p.waitForTimeout(400)
console.log('chips:', await p.locator('.rir:visible .rir-b').allInnerTexts())
await p.screenshot({ path: `pg2w-${mode}.png` })
await p.locator('.tb-trash:visible').click(); await p.waitForTimeout(500); await p.locator('.dlg-btn:has-text("Usuń"):visible').first().click(); await p.waitForTimeout(1000)
await p.goto('http://localhost:4173/#/settings/progress'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.reset-btn').click(); await p.waitForTimeout(400); await p.locator('.dlg-btn:has-text("Przywróć")').click(); await p.waitForTimeout(500)
console.log('after reset:', await p.locator('.row.every .stepper b').allInnerTexts(), 'reset btn:', await p.locator('.reset-btn').count())
console.log('errs', errs); await ctx.close() }
await b.close()
