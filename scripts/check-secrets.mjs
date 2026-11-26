// Fails when a file tracked by git looks like it contains a secret (token, private key, password in config).
// Runs before every deploy and in CI. The repo is public: a pushed secret must be treated as leaked.
import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const RULES = [
  ['GitHub token', /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['Private key', /-----BEGIN (RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/],
  ['AWS key', /\bAKIA[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/],
  ['Stripe secret key', /\b(sk|rk)_live_[A-Za-z0-9]{20,}\b/],
  ['Google service account', /"type"\s*:\s*"service_account"/],
  ['Strava/OAuth secret in code', /client_secret\s*[:=]\s*['"][0-9a-f]{32,}['"]/i]
]
// Firebase web config keys (AIza…) are public by design and allowed; build output and lock files are skipped
const SKIP = /^(docs\/|node_modules\/|package-lock\.json$)|\.(png|jpe?g|gif|webp|ico|woff2?)$/

const files = execSync('git ls-files', { encoding: 'utf8' }).split('\n').filter(f => f && !SKIP.test(f))
const hits = []
for (const f of files) {
  let text
  try { text = readFileSync(f, 'utf8') } catch { continue }
  text.split('\n').forEach((line, i) => {
    for (const [what, re] of RULES) if (re.test(line)) hits.push(`${f}:${i + 1}  ${what}`)
  })
}
if (hits.length) {
  console.error('Possible secrets found – remove them (and revoke them if they were ever pushed):\n' + hits.map(h => '  ' + h).join('\n'))
  process.exit(1)
}
console.log(`No secrets found in ${files.length} files.`)
