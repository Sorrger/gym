import { chromium, devices } from 'playwright-core'
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome' })
const files = {}
const mock = async ctx => ctx.route('https://api.github.com/**', async r => {
  const u = r.request().url(), m = r.request().method()
  const j = x => r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(x), headers: { 'access-control-allow-origin': '*' } })
  if (u.endsWith('/user')) return j({ login: 'X' })
  if (u.includes('/gists?')) return j(files['gym-backup.json'] ? [{ id: 'G1', files: { 'gym-backup.json': {} } }] : [])
  if (m === 'POST' || m === 'PATCH') { Object.assign(files, JSON.parse(r.request().postData()).files); return j({ id: 'G1' }) }
  if (u.includes('/gists/G1')) return j({ id: 'G1', files: Object.fromEntries(Object.entries(files).map(([k, v]) => [k, { content: v.content }])) })
  return r.fulfill({ status: 404, body: '{}' })
})
const ctx = await b.newContext({ ...devices['iPhone 15'], acceptDownloads: true }).then(async c => { await c.addInitScript(() => localStorage.setItem('onboarded', '1')); return c }); await mock(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message + ' @ ' + p.url()))
const go = async h => { await p.goto('http://localhost:4173/' + h); await p.reload(); await p.waitForTimeout(1500) }
const close = async () => { while (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(400) } }
// connect backup first
await go('#/settings/backup'); await p.locator('button:visible', { hasText: 'Połącz z GitHub' }).click(); await p.waitForTimeout(400)
await p.locator('.dlg-in').fill('ghp_x'); await p.locator('.dlg-btn', { hasText: 'Połącz' }).click(); await p.waitForTimeout(3000)
// start Push, tick bench set 1, go to last exercise (6)
await go('#/plan/0'); await p.locator('.go:visible').click(); await p.waitForTimeout(1300); await close()
await p.locator('.set:visible button.check').first().click(); await p.waitForTimeout(400)
await p.locator('.dot').nth(5).click(); await p.waitForTimeout(1000); await close()
const wurl = p.url()
// edit plan: delete bench (ex 1) and last two
await go('#/plan/0/edit')
console.log('warn shown:', await p.locator('.info.warn').count())
for (const k of [5, 4, 0]) { await p.locator('.card.ex').nth(k).locator('[aria-label="Usuń"]').click(); await p.waitForTimeout(300); await p.locator('.dlg-btn', { hasText: 'Usuń' }).click(); await p.waitForTimeout(300) }
await p.locator('.save').click(); await p.waitForTimeout(3000)
console.log('gist has plan:', !!files['gym-plan.json'])
await p.goto(wurl); await p.reload(); await p.waitForTimeout(1800); await close()
console.log('workout title:', await p.locator('.ex-tt h1:visible').textContent().catch(() => 'NONE'), 'dots:', await p.locator('.dot').count())
await p.locator('.tb-finish').click(); await p.waitForTimeout(1000)
console.log('summary rows:', await p.locator('.sum-row:visible, .row:visible').count())
await p.locator('.save-btn').click(); await p.waitForTimeout(1500)
await go('#/tabs/history'); await p.locator('.hist-list ion-item:visible').first().click({ force: true }); await p.waitForTimeout(1300)
console.log('session view exercises:', await p.locator('.ex-head b:visible').allTextContents())
// export file contains plan
await go('#/settings/backup')
const [dl] = await Promise.all([p.waitForEvent('download', { timeout: 5000 }).catch(() => null), p.locator('button.row', { hasText: 'Zapisz kopię do pliku' }).click()])
const txt = dl ? Buffer.concat(await (await dl.createReadStream()).toArray()).toString() : '{}'
console.log('export has plan:', !!JSON.parse(txt).plan?.days)
// phone 2: restore from gist → plan comes too
const c2 = await b.newContext({ ...devices['iPhone 15'] }).then(async c => { await c.addInitScript(() => localStorage.setItem('onboarded', '1')); return c }); await mock(c2); const q = await c2.newPage(); q.on('pageerror', e => errs.push('p2 ' + e.message))
await q.goto('http://localhost:4173/#/settings/backup'); await q.waitForTimeout(1500)
await q.locator('button:visible', { hasText: 'Połącz z GitHub' }).click(); await q.waitForTimeout(400)
await q.locator('.dlg-in').fill('ghp_x'); await q.locator('.dlg-btn', { hasText: 'Połącz' }).click(); await q.waitForTimeout(3000)
await q.goto('http://localhost:4173/#/tabs/home'); await q.waitForTimeout(6000)
await q.goto('http://localhost:4173/#/plan/0'); await q.reload(); await q.waitForTimeout(1500)
console.log('phone2 plan rows:', await q.locator('.ex-body > b:visible').count())
console.log('errors:', errs); await b.close()
