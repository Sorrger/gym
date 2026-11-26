// Workout extras: plates per side, notes per exercise (shown next time + in the plan preview), "Jak to zrobić" in the
// plan preview, adding an exercise from the catalogue mid-workout, supersets that jump between the two exercises.
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
import { seed, load } from './seed.mjs'
const b = await launch()
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.addInitScript(() => localStorage.setItem('onboarded', '1'))
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
const fail = m => console.log('FAIL ' + m)
await load(p, seed())
// plates are off by default: switch on, take the 25 kg plates away
await p.goto('http://localhost:4173/#/settings/training'); await p.reload(); await p.waitForTimeout(1400)
if (await p.locator('.pp:visible').count()) fail('plate picker shown while plates are off')
await p.locator('.row:visible', { hasText: 'Talerze na stronę' }).click(); await p.waitForTimeout(500)
await p.locator('.pp-c:visible', { hasText: /^25$/ }).click(); await p.waitForTimeout(400)
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500)

// how-to straight from the plan preview
await p.locator('.how:visible').first().click(); await p.waitForTimeout(900)
if (!(await p.locator('.ht:visible').count())) fail('how-to sheet not opened from the plan preview')
await p.locator('.ht-x:visible').click(); await p.waitForTimeout(600)

await p.locator('.go:visible').click(); await p.waitForTimeout(1200)
const wid = p.url().split('/workout/')[1]
// plates under the barbell bench sets
const pl = await p.locator('.plates:visible').first().innerText().catch(() => '')
console.log('plates:', pl)
if (pl !== 'Na stronę: 20 + 10 · gryf 20') fail('plates line wrong (80 kg without 25 kg plates should be 20 + 10)')

// note
await p.locator('.xchip:visible', { hasText: 'Notatka' }).click(); await p.waitForTimeout(500)
await p.locator('.dlg-ta').fill('Siedzenie na 4'); await p.locator('.dlg-btn:has-text("Zapisz")').click(); await p.waitForTimeout(500)
const nt = await p.locator('.note:visible').innerText(); console.log('note:', nt)
if (!nt.includes('Siedzenie na 4')) fail('note not shown')

// add an exercise from the catalogue
const before = await p.locator('.dots .dot:not(.add)').count()
await p.locator('.dot.add').click(); await p.waitForTimeout(1500)
await p.locator('.ep-search:visible').fill('face pull'); await p.waitForTimeout(400)
await p.locator('.ep-row:visible').first().click(); await p.waitForTimeout(500)
await p.locator('.ep-pick:visible').click(); await p.waitForTimeout(1200)
const after = await p.locator('.dots .dot:not(.add)').count()
const title = await p.locator('.ex h1:visible').innerText(); const tag = await p.locator('.tag:visible', { hasText: 'Dodane dziś' }).count()
console.log('dots', before, '→', after, 'now on:', title, 'tag', tag)
if (after !== before + 1 || !tag) fail('exercise not added')
// remove it again (nothing ticked)
await p.locator('.xchip:visible', { hasText: 'Usuń z treningu' }).click(); await p.waitForTimeout(800)
if ((await p.locator('.dots .dot:not(.add)').count()) !== before) fail('added exercise not removed')

// superset 1 + 2: tick a set of 1 → jumps to 2 → tick → back to 1
await p.locator('.dots .dot').nth(0).click(); await p.waitForTimeout(500)
await p.locator('.xchip:visible', { hasText: 'Superseria' }).click(); await p.waitForTimeout(500)
await p.locator('.dlg-btn', { hasText: /^2\. / }).click(); await p.waitForTimeout(600)
const chip = await p.locator('.xchip.on:visible').innerText(); console.log('superset chip:', chip)
if (!chip.includes('Superseria z 2')) fail('superset not linked')
const onIdx = async () => (await p.locator('.dots .dot.on').innerText()).trim()
await p.locator('.check:visible').first().click(); await p.waitForTimeout(400)
await p.locator('.rir-b:visible').first().click(); await p.waitForTimeout(1200)
const a1 = await onIdx(); console.log('after a set of 1 →', a1)
if (a1 !== '2') fail('superset did not jump to exercise 2')
await p.locator('.check:visible').first().click(); await p.waitForTimeout(400)
await p.locator('.rir-b:visible').first().click(); await p.waitForTimeout(1200)
const a2 = await onIdx(); console.log('after a set of 2 →', a2)
if (a2 !== '1') fail('superset did not jump back to exercise 1')

// stored with the workout; the note shows in the plan preview
const st = await p.evaluate(async id => new Promise(res => { const r = indexedDB.open('keyval-store'); r.onsuccess = () => { const g = r.result.transaction('keyval').objectStore('keyval').get('s:' + id); g.onsuccess = () => res(g.result) } }), wid)
console.log('stored ss', JSON.stringify(st?.ss), 'notes', JSON.stringify(st?.notes))
if (JSON.stringify(st?.ss) !== '[[0,1]]' || !Object.values(st?.notes || {}).includes('Siedzenie na 4')) fail('superset / note not saved')
await p.goto('http://localhost:4173/#/plan/0'); await p.reload(); await p.waitForTimeout(1500)
const pn = await p.locator('.pnote:visible').first().innerText({ timeout: 3000 }).catch(() => ''); console.log('plan preview note:', pn)
if (!pn.includes('Siedzenie na 4')) fail('note not in the plan preview')

// English
await p.evaluate(() => localStorage.setItem('lang', 'en')); await p.goto('http://localhost:4173/#/workout/' + wid); await p.reload(); await p.waitForTimeout(1800)
const en = await p.locator('.ex:visible').innerText(); console.log('EN has:', /Per side: .+ · bar 20/.test(en), /Superset with 2/.test(en))
if (!/Per side: .+ · bar 20/.test(en) || !/Superset with 2/.test(en)) fail('English texts missing')
console.log('errs', errs)
await b.close()
