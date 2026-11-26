import { getSessions } from './seed.mjs'
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1')); const p = await ctx.newPage(); const errs = []
p.on('pageerror', e => errs.push(e.message))
const IDB = () => getSessions(p)
await p.goto('http://localhost:4173/#/tabs/home'); await p.waitForTimeout(1500)
const BENCH = 'Wyciskanie sztangi na ławce płaskiej'
async function dlgClose(choice = 'Zostaw') { const z = p.locator('.dlg-btn', { hasText: choice }); if (await z.first().isVisible().catch(() => false)) { await z.first().click(); await p.waitForTimeout(400); return true } return false }
async function startPush() { await p.goto('http://localhost:4173/#/tabs/home'); await p.reload(); await p.waitForTimeout(1500); await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1200); await p.getByText('Rozpocznij trening').click(); await p.waitForTimeout(1300) }
// ---- workout 1: no history
await startPush()
console.log('W1 dialog:', (await p.locator('.dlg').innerText().catch(() => 'none')).replace(/\n+/g, ' | '))
await dlgClose()
// set bench 80 kg x 8 for all sets via picker "all"
const sets = p.locator('.set:visible')
console.log('bench sets', await sets.count())
for (let i = 0; i < 3; i++) {
  await p.evaluate(({ i, BENCH }) => 0, { i, BENCH })
}
// type weights by + button from 0 quickly: use picker
await p.locator('.weight:visible').first().click(); await p.waitForTimeout(600)
const sheetText = await p.locator('.sheet').innerText().catch(() => '')
console.log('picker open', sheetText.slice(0, 40).replace(/\n/g, ' '))
// set value via evaluate on vue state is hard; instead press quick +step buttons
await p.keyboard.press('Escape').catch(() => {}); await p.waitForTimeout(400)
for (let i = 0; i < 3; i++) { const row = p.locator('.set:visible').nth(i); for (let k = 0; k < 8; k++) await row.locator('button.step').nth(1).click(); for (let k = 0; k < 2; k++) await row.locator('button.rstep').nth(1).click() }
// tick 3 sets with RIR 2,1,0
for (let i = 0; i < 3; i++) { await p.locator('button.check:visible').nth(i).click(); await p.waitForTimeout(250); await p.locator('.set:visible').nth(i).locator('.rir-b').nth([2, 1, 0][i]).click(); await p.waitForTimeout(250) }
await p.waitForTimeout(1200)
console.log('after bench, on exercise:', await p.locator('h1').first().innerText())
const S1 = await IDB(); const cur = Object.values(S1).find(s => !s.finished)
console.log('bench saved', JSON.stringify(cur.ex[BENCH]))
// finish -> summary -> save
await p.locator('.tb-finish').click(); await p.waitForTimeout(800); await dlgClose('Zakończ'); 
console.log('summary visible', await p.locator('.done-screen').isVisible())
await p.locator('.save-btn').click(); await p.waitForTimeout(1200); console.log('url after save', p.url())
// ---- history -> session view
await p.goto('http://localhost:4173/#/tabs/history'); await p.reload(); await p.waitForTimeout(1500)
await p.locator('.hist-list ion-item').first().click(); await p.waitForTimeout(1200)
console.log('session url', p.url(), '| has zapas:', (await p.locator('.set').allInnerTexts()).filter(t => t.includes('zapas')).slice(0, 3))
// ---- workout 2: suggestion uses RIR
await startPush()
console.log('W2 dialog:', (await p.locator('.dlg').innerText().catch(() => 'none')).replace(/\n+/g, ' | '))
await dlgClose('Ustaw'); const S2 = await IDB(); console.log('W2 bench after Ustaw', JSON.stringify(Object.values(S2).find(s => !s.finished).ex[BENCH]))
console.log('errs', errs); await b.close()
