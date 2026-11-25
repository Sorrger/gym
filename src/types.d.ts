// Shapes of the app's data (used for type checking only – `npm run typecheck`).

/** One plan entry: [name, target like '3 × 6-8', tag, parts | unit | 'stages'] */
type PlanEntry = (string | null | any)[]

interface Training {
  key: string
  abbr: string
  short?: string
  name: string
  note: string
  ex: PlanEntry[]
  hidden?: boolean
}

/** One set: w = kg / seconds / reps (by the unit), r = reps (kg only), d = ticked, q = reps in reserve, t = set type */
interface SetRow { w: number | null; r?: number; d: boolean; q?: number; t?: 'w' | 'd' | 'f' }

interface Session {
  id: string
  date: string            // YYYY-MM-DD
  day: number             // index into PLAN
  ex: Record<string, SetRow[]>
  started: number
  finished: boolean
  updated?: number
  cur?: number
  deload?: boolean
  noDeload?: boolean
  offApp?: boolean
  manual?: boolean
  swap?: Record<string, string>
}

/** Build stamp injected by vite.config.js */
declare const __BUILD__: string

interface Window { webkitAudioContext?: typeof AudioContext }
