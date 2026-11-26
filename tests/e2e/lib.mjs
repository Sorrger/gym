// shared by the e2e scripts: browser start (system Chrome if CHROME is set, else Playwright's own Chromium).
// Every new phone (context) skips the first-start screen, unless it is created with { fresh: true }.
import { chromium } from 'playwright-core'
export async function launch() {
  const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME } : {})
  const newContext = b.newContext.bind(b)
  b.newContext = async ({ fresh, ...opts } = {}) => {
    const c = await newContext(opts)
    if (!fresh) await c.addInitScript(() => { if (!localStorage.getItem('onboarded')) localStorage.setItem('onboarded', '1') })
    // every test also guards the Content-Security-Policy: anything it blocks fails the run
    c.on('page', pg => pg.on('console', m => { if (/Content Security Policy|Refused to (load|connect|execute|apply)/i.test(m.text())) console.log('FAIL CSP: ' + m.text().slice(0, 200)) }))
    return c
  }
  return b
}
