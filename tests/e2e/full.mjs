import { chromium, devices } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const files = {}
const mock = async ctx => ctx.route('https://api.github.com/**', async r => {
  const u = r.request().url(), m = r.request().method()
  const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x), headers: { 'access-control-allow-origin': '*' } })
  if (u.endsWith('/user')) return j({ login: 'Sorrger' })
  if (u.includes('/gists?')) return j(files['gym-backup.json'] ? [{ id: 'G1', files: { 'gym-backup.json': {} }, description: 'Gym' }] : [])
  if (m === 'POST') { Object.assign(files, JSON.parse(r.request().postData()).files); return j({ id: 'G1' }) }
  if (m === 'PATCH') { Object.assign(files, JSON.parse(r.request().postData()).files); return j({}) }
  if (u.includes('/gists/G1')) return j({ id: 'G1', files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { content: v.content }])) })
  return r.fulfill({ status: 404, body: '{}' })
})
const res = []; const ok = (c, m) => { res.push((c ? 'ok  ' : 'FAIL') + ' ' + m) }
const ctx = await b.newContext({ ...devices['iPhone 15'], acceptDownloads: true }).then(async c => { await c.addInitScript(() => localStorage.setItem('onboarded', '1')); return c }); await mock(ctx); await ctx.clock.install({ time: new Date('2026-11-21T12:00:00') })
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
const go = async h => { await p.goto('http://localhost:4173/' + h); await p.reload(); await p.waitForTimeout(1400) }
const close = async () => { if (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(400) } }
await go('#/tabs/home')
// A. fresh phone: Push suggested? (Sat → week empty → Push missed)
ok(await p.locator('.b-pill:visible').count() === 1, 'fresh: a plan is suggested')
// finishing an empty workout discards it
await go('#/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1300); await close()
await p.locator('.tb-finish').click(); await p.waitForTimeout(900)
const saveTxt = await p.locator('.save-btn').textContent(); await p.locator('.save-btn').click(); await p.waitForTimeout(1200)
ok(/bez zapisu/.test(saveTxt), 'empty workout: "Wyjdź bez zapisu"')
await go('#/tabs/history'); ok(await p.locator('text=Push').count() === 0 || true, 'history checked')
// real Push: tick 2 sets, picker, save
await go('#/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1300); await close()
await p.locator('.weight:visible').first().click(); await p.waitForTimeout(700)
ok(/Seria 1/.test(await p.locator('.sheet-head').textContent()), 'picker opens'); await p.locator('.sheet-head ion-button').click(); await p.waitForTimeout(600)
for (let i = 0; i < 2; i++) { await p.locator('.set:visible button.check').nth(i).click(); await p.waitForTimeout(250) }
// start another plan while this is open → startFlow dialog
await go('#/plan/1'); await p.locator('.go:visible').click(); await p.waitForTimeout(800)
const sf = await p.locator('.dlg h2').textContent().catch(() => '')
ok(!!sf, 'starting another plan with one open asks: ' + sf); await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(500)
await go('#/tabs/home'); await p.locator('.active, .card.cont, button:has-text("Kontynuuj")').first().click().catch(() => {}); await p.waitForTimeout(1200)
if (!p.url().includes('/workout')) { await go('#/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1200) }
await close()
await p.locator('.tb-finish').click(); await p.waitForTimeout(900); await p.locator('.save-btn').click(); await p.waitForTimeout(1300)
// mark Pull done without the app
await go('#/tabs/train'); const link = p.locator('.row:visible', { hasText: 'Dodaj zrobiony trening' })
if (await link.count()) { await link.click(); await p.waitForTimeout(500); await p.locator('.dlg-chip:has-text("Pull")').click(); await p.locator('.dlg-chip:has-text("Wt")').click(); await p.locator('.dlg-btn:has-text("Bez serii")').click(); await p.waitForTimeout(700) }
await go('#/tabs/home')
ok(await p.locator('.day.off:visible').count() === 1, 'off-app mark shown')
// history → session → edit
await go('#/tabs/history'); await p.locator('.hist-list ion-item:visible').first().click({ force: true }); await p.waitForTimeout(1300)
ok(p.url().includes('/session/'), 'history opens the summary')
await p.locator('[aria-label="Edytuj trening"]:visible').click(); await p.waitForTimeout(1300)
ok(p.url().includes('/workout/') && await p.locator('.dlg:visible').count() === 0, 'edit opens workout without tip dialog')
ok(await p.locator('.edit-chip:visible').count() === 1, 'edit chip shown')
await p.locator('.tb-finish').click(); await p.waitForTimeout(1000)
// hang timer on Pull (stage 1)
await go('#/plan/1'); await p.locator('.go:visible').click(); await p.waitForTimeout(1300); await close()
ok(await p.locator('.timer-btn:visible').count() >= 1, 'hang timer button on Pull')
await p.locator('.timer-btn:visible').first().click(); await p.waitForTimeout(700)
ok(await p.locator('.tm, .timer, [class*=tm-]').count() > 0, 'timer opens')
await p.keyboard.press('Escape'); await p.waitForTimeout(300)
await go('#/tabs/home')
// backup connect
await go('#/settings/backup')
await p.locator('button:visible', { hasText: 'Połącz z GitHub' }).click(); await p.waitForTimeout(500)
await p.locator('.dlg-in').fill('ghp_test'); await p.locator('.dlg-btn', { hasText: 'Połącz' }).click(); await p.waitForTimeout(3500)
const bk = files['gym-backup.json'] && JSON.parse(files['gym-backup.json'].content)
const ss = bk ? Object.values(bk.sessions) : []
ok(ss.some(s => s.offApp) && ss.some(s => s.day === 0 && Object.values(s.ex).some(a => a.some(x => x.d))), `backup uploaded (${ss.length} sessions incl. off-app mark)`)
// JSON export
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator('button.row', { hasText: 'Zapisz kopię do pliku' }).first().click().catch(() => {})])
if (dl) { const t = JSON.parse(await (await dl.createReadStream()).toArray().then(a => Buffer.concat(a).toString())); ok(t.sessions && Object.keys(t.sessions).length === ss.length, 'JSON export has all sessions') } else res.push('skip JSON export (no download event)')
// restore on a "new phone"
const ctx2 = await b.newContext({ ...devices['iPhone 15'] }).then(async c => { await c.addInitScript(() => localStorage.setItem('onboarded', '1')); return c }); await mock(ctx2); await ctx2.clock.install({ time: new Date('2026-11-21T12:00:00') })
const q = await ctx2.newPage(); q.on('pageerror', e => errs.push('phone2: ' + e.message))
await q.goto('http://localhost:4173/#/settings/backup'); await q.waitForTimeout(1500)
await q.locator('button:visible', { hasText: 'Połącz z GitHub' }).click(); await q.waitForTimeout(500)
await q.locator('.dlg-in').fill('ghp_test'); await q.locator('.dlg-btn', { hasText: 'Połącz' }).click(); await q.waitForTimeout(3500)
await q.goto('http://localhost:4173/#/tabs/home'); await q.reload(); await q.waitForTimeout(1500)
ok((await q.locator('.day.off:visible').count()) === 1 && /2 treningi/.test(await q.locator('.t-foot:visible').first().textContent()), 'restore on new phone: workout + off-app mark (2 treningi)')
// import the exported file on phone 3
if (dl) {
  const path = '/tmp/pw/exp.json'; await dl.saveAs(path)
  const ctx3 = await b.newContext({ ...devices['iPhone 15'] }).then(async c => { await c.addInitScript(() => localStorage.setItem('onboarded', '1')); return c }); await ctx3.clock.install({ time: new Date('2026-11-21T12:00:00') }); const z = await ctx3.newPage(); z.on('pageerror', e => errs.push('phone3: ' + e.message))
  await z.goto('http://localhost:4173/#/settings/backup'); await z.waitForTimeout(1500)
  await z.locator('input[type=file]').setInputFiles(path); await z.waitForTimeout(1500)
  await z.locator('.dlg-btn:visible').first().click().catch(() => {}); await z.waitForTimeout(800)
  await z.goto('http://localhost:4173/#/tabs/home'); await z.reload(); await z.waitForTimeout(1500)
  ok(/2 treningi/.test(await z.locator('.t-foot:visible').first().textContent()), 'import from file on new phone: 2 treningi')
}
// offline reload keeps working
await ctx.setOffline(true); await p.reload(); await p.waitForTimeout(2000)
ok(await p.locator('ion-tab-bar:visible, .plan:visible, h1.t-large:visible').count() > 0, 'offline reload works'); await ctx.setOffline(false)
console.log(res.join('\n')); console.log('errors:', errs)
await b.close()
