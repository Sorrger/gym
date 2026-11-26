// Build into docs/ and push to main. GitHub Pages serves main:/docs, so a push = a release.
// Works the same on the PC and in a Claude Code cloud session (only needs normal git push).
import { execSync } from 'child_process'
const run = c => execSync(c, { stdio: 'inherit' })
const out = c => execSync(c).toString().trim()

// gate: nothing goes live with a leaked secret, a lint/type error or a failing logic test (a few seconds each).
// The slower click-through tests (npm run e2e) run in CI on every push; run them locally before bigger releases.
for (const c of ['node scripts/check-secrets.mjs', 'npm run lint --silent', 'npm run typecheck --silent', 'npm test --silent']) {
  try { run(c) } catch { console.error('\nDeploy stopped: "' + c + '" failed. Fix it first – the live app was not changed.'); process.exit(1) }
}
run('npx vite build')
run('git add -A')
if (out('git status --porcelain')) {
  const msg = process.argv[2] || 'Deploy ' + new Date().toISOString().slice(0, 16).replace('T', ' ')
  run(`git commit -m "${msg.replace(/"/g, "'")}"`)
} else console.log('Nothing new to commit')
run('git push origin HEAD:main')
console.log('\nPublished. https://sorrger.github.io/gym/ updates in ~1 min; the phone picks it up on next open.')
