// Runs the e2e scripts against the built app (npm run build first): starts `vite preview` on :4173,
// runs each script, fails when a script crashes, prints a FAIL line, or reports page errors ("errs [...]").
// npm run e2e            – all scripts
// npm run e2e -- nav add – only these
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const here = path.dirname(fileURLToPath(import.meta.url))
const ALL = ['e2e_on', 'full', 'nav', 'add', 'swap', 'edit2', 'plans', 'edge', 'dl2', 'prefs', 'prog2', 'rec', 'rest', 'ban2', 'weight-quick', 'theme', 'en', 'catalog', 'own', 'howto', 'coachset', 'data']
const only = process.argv.slice(2)
const list = only.length ? only : ALL

const server = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { cwd: path.join(here, '../..'), stdio: 'ignore' })
const up = async () => { for (let i = 0; i < 60; i++) { try { if ((await fetch('http://localhost:4173/')).ok) return } catch {} await new Promise(r => setTimeout(r, 500)) } throw new Error('preview server did not start') }

function run(name) {
  return new Promise(res => {
    const t0 = Date.now(); let out = ''
    const p = spawn(process.execPath, [path.join(here, name + '.mjs')], { cwd: '/tmp', env: process.env })
    p.stdout.on('data', d => (out += d)); p.stderr.on('data', d => (out += d))
    const kill = setTimeout(() => { out += '\nTIMEOUT'; p.kill('SIGKILL') }, 240e3)
    p.on('close', code => {
      clearTimeout(kill)
      // a known, harmless Ionic race when a script navigates very fast (also ignored by the app's error log)
      const clean = out.replace(/"[^"\n]*'ionPageElement'[^"\n]*",?\s*/g, '')
      const bad = code !== 0 || /^FAIL\b|TIMEOUT/m.test(clean) || /errs?:? \[\s*['"]/.test(clean)
      console.log((bad ? 'FAIL ' : 'ok   ') + name + ' (' + Math.round((Date.now() - t0) / 1000) + ' s)')
      if (bad) console.log(out.split('\n').map(l => '     ' + l).join('\n'))
      res(!bad)
    })
  })
}

let failed = 0
try {
  await up()
  for (const n of list) if (!(await run(n))) failed++
} finally { server.kill() }
console.log(failed ? `${failed} of ${list.length} failed` : `all ${list.length} passed`)
process.exit(failed ? 1 : 0)
