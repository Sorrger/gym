import { chromium, devices } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const ctx = await b.newContext({ ...devices['iPhone 15'] }); await ctx.clock.install({ time: new Date('2026-11-24T12:00:00') })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + p.url()))
const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m)
const go = async h => { await p.goto('http://localhost:4173/' + h); await p.reload(); await p.waitForTimeout(1400) }
const dlg = async () => (await p.locator('.dlg h2:visible').textContent().catch(() => '')) || ''
const close = async () => { while (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(350) } }
// 1. validation
await go('#/plan/0/edit')
const card = i => p.locator('.card.ex').nth(i)
await card(1).locator('input.name').fill('Wyciskanie sztangi na ławce płaskiej'); await p.locator('.save').click(); await p.waitForTimeout(500)
ok(/Popraw/.test(await dlg()) && /dwa razy/.test(await p.locator('.dlg p:visible').textContent()), 'duplicate name refused'); await close()
await card(1).locator('input.name').fill('   '); await p.locator('.save').click(); await p.waitForTimeout(500)
ok(/Popraw/.test(await dlg()), 'empty name refused'); await close()
await card(1).locator('input.name').fill('Wyciskanie hantli na ławce skośnej')
// reversed range, alt with dot, alt = another exercise of this training
await card(0).locator('.rng input').nth(0).fill('12'); await card(0).locator('.rng input').nth(1).fill('8')
await card(0).locator('.alt-add input').fill('Wyciskanie hantli na ławce skośnej'); await card(0).locator('.alt-add button').click()
await card(0).locator('.alt-add input').fill('Hammer · maszyna'); await card(0).locator('.alt-add button').click()
ok((await card(0).locator('.alt-chip').allTextContents()).some(t => t.includes('Hammer - maszyna')), 'dot in alternative name replaced')
await p.locator('.fields input').fill('Klatka A')
await p.locator('.save').click(); await p.waitForTimeout(2500)
ok((await p.locator('.tgt:visible').first().textContent()) === '3 × 8-12', 'range 12–8 saved as 8-12')
await go('#/tabs/train'); ok((await p.locator('.plans .plan:visible .plan-ico').first().textContent()) === 'KA', 'renamed plan → new abbr KA')
// 2. swap filter
await go('#/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1300); await close()
await p.locator('.swap:visible').click(); await p.waitForTimeout(500)
const opts = await p.locator('.dlg-btn').allTextContents()
ok(!opts.some(t => t.includes('skośnej')) && opts.some(t => t.includes('Hammer')), 'swap list hides exercise already in this workout: ' + opts.join(' | '))
await close()
await p.locator('.tb-finish').click(); await p.waitForTimeout(800); await p.locator('.save-btn').click(); await p.waitForTimeout(1200)
// 3. new training without name, delete down to one
await go('#/plan/new/edit'); await card(0).locator('input.name').fill('Pompki'); await p.locator('.save').click(); await p.waitForTimeout(2500)
ok((await p.locator('.row .grow b:visible').allTextContents()).includes('Trening 5'), 'unnamed training → "Trening 5"')
for (const n of ['Pull', 'Nogi', 'Upper', 'Klatka A']) { await p.locator('.row', { hasText: n }).click(); await p.waitForTimeout(1100); await p.locator('.reset', { hasText: 'Usuń ten trening' }).click(); await p.waitForTimeout(350); await p.locator('.dlg-btn', { hasText: 'Usuń trening' }).click(); await p.waitForTimeout(2300) }
ok((await p.locator('.row .grow b:visible').allTextContents()).join() === 'Trening 5', 'deleted down to one training')
await p.locator('.row').first().click(); await p.waitForTimeout(1100); await p.locator('.reset', { hasText: 'Usuń ten trening' }).click(); await p.waitForTimeout(400)
ok(/jedyny/.test(await dlg()), 'last training cannot be deleted'); await close()
await go('#/tabs/home'); ok((await p.locator('.plans.solo .plan:visible').count()) === 1, 'home: one training, suggested (rotation)')
await go('#/tabs/progress'); await go('#/tabs/history'); await go('#/session/' + (await p.evaluate(async () => { const r = await new Promise(res => { const q = indexedDB.open('keyval-store'); q.onsuccess = () => { const g = q.result.transaction('keyval').objectStore('keyval').get('sessions'); g.onsuccess = () => res(g.result) } }); return Object.keys(r || {})[0] || 'x' })))
ok(true, 'progress/history/session render with hidden trainings')
// 4. reset all
await go('#/plans'); await p.locator('.reset:visible').click(); await p.waitForTimeout(400); await p.locator('.dlg-btn', { hasText: 'Przywróć' }).click(); await p.waitForTimeout(2500)
ok((await p.locator('.row .grow b:visible').allTextContents()).join() === 'Push,Pull,Nogi,Upper', 'reset → basic plan back')
await go('#/tabs/home'); ok(/Pull/.test(await p.locator('.plan.next:visible > b').textContent()), 'Tuesday → Pull again')
console.log(res.join('\n')); console.log('errors:', errs); await b.close()
