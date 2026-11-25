// "Jak to zrobić" sheet on the Workout screen: opens from the muscle map, the bench press animation moves,
// cues + muscles show; the next exercise uses the shared rig and moves too; dark mode + English.
import { launch } from './lib.mjs'
import { devices } from 'playwright-core'
const b = await launch()
const res = []; const ok = (c, m) => res.push((c ? 'ok   ' : 'FAIL ') + m)
async function run(dark, en) {
  const ctx = await b.newContext({ ...devices['iPhone 15'] })
  await ctx.addInitScript(([d, e]) => { localStorage.setItem('look', JSON.stringify({ mode: d ? 'dark' : 'light', accent: 'violet', style: 'classic' })); if (e) localStorage.setItem('lang', 'en') }, [dark, en])
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
  const tag = (dark ? 'dark' : 'light') + (en ? ' en' : '')
  await p.goto('http://localhost:4173/#/plan/0'); await p.waitForTimeout(1500)
  await p.locator('.go:visible').click(); await p.waitForTimeout(1300)
  while (await p.locator('.dlg-btn:visible').count()) { await p.locator('.dlg-btn:visible').last().click(); await p.waitForTimeout(350) }
  await p.locator('.ex-body:visible').click(); await p.waitForTimeout(1200)
  const sheet = p.locator('ion-modal.howto-sheet')
  ok(await sheet.locator('svg.xa').count() === 1, tag + ': bench press opens the sheet with the animation')
  const pos = () => sheet.locator('.plate').getAttribute('transform')
  const a = await pos(); await p.waitForTimeout(700); const c = await pos()
  ok(a !== c, tag + ': the bar moves')
  ok(await sheet.locator('.ht-cues li').count() === 3, tag + ': three technique cues')
  ok((await sheet.locator('.ht-mus').innerText()).length > 4, tag + ': muscles listed')
  if (en) ok(/Lower|Press|Top|Touch/.test(await sheet.locator('.ph').textContent()), 'en: phase label translated')
  await p.screenshot({ path: 'howto-' + tag.replace(' ', '-') + '.png' })
  await sheet.locator('.ht-x').click(); await p.waitForTimeout(600)
  // next exercise (incline dumbbell press): drawn by the shared rig
  await p.locator('.dots button, .dot').nth(1).click().catch(() => {}); await p.waitForTimeout(700)
  await p.locator('.ex-body:visible').click(); await p.waitForTimeout(1000)
  ok(await sheet.locator('svg.xa').count() === 1 && await sheet.locator('.ht-cues li').count() === 1, tag + ': incline dumbbell press has the rig animation + its cue')
  const lines = () => sheet.locator('svg.xa line.near').first().getAttribute('x2')
  const l1 = await lines(); await p.waitForTimeout(600); const l2 = await lines()
  ok(l1 !== l2, tag + ': the rig animation moves')
  await sheet.locator('.ht-x').click(); await p.waitForTimeout(500)
  ok(!errs.length, tag + ': no page errors ' + errs.join(' | '))
  await ctx.close()
}
await run(false, false); await run(true, false); await run(true, true)
console.log(res.join('\n')); await b.close()
if (res.some(r => r.startsWith('FAIL'))) process.exit(1)
