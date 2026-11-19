// Build into docs/ and push to main. GitHub Pages serves main:/docs, so a push = a release.
// Works the same on the PC and in a Claude Code cloud session (only needs normal git push).
import { execSync } from 'child_process'
const run = c => execSync(c, { stdio: 'inherit' })
const out = c => execSync(c).toString().trim()

run('npx vite build')
run('git add -A')
if (out('git status --porcelain')) {
  const msg = process.argv[2] || 'Deploy ' + new Date().toISOString().slice(0, 16).replace('T', ' ')
  run(`git commit -m "${msg.replace(/"/g, "'")}"`)
} else console.log('Nothing new to commit')
run('git push origin HEAD:main')
console.log('\nPublished. https://sorrger.github.io/gym/ updates in ~1 min; the phone picks it up on next open.')
