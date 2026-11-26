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
  plan?: string           // the training's key (stable id, for a future database; older workouts don't have it)
  ex: Record<string, SetRow[]>
  started: number
  finished: boolean
  updated?: number
  cur?: number
  tipped?: (number | string)[] // exercises whose suggestion was already shown / filled in
  deload?: boolean
  noDeload?: boolean
  offApp?: boolean
  manual?: boolean
  swap?: Record<string, string>
  extra?: any[]           // exercises added during this workout: [name, target, null, unit, { m, h }]
  notes?: Record<string, string> // exercise name → note (shown in later workouts until changed)
  ss?: number[][]         // supersets: pairs of exercise indices
}

/** Build stamp injected by vite.config.js */
declare const __BUILD__: string

interface Window { webkitAudioContext?: typeof AudioContext; __appReady?: boolean; __rescue?: any }
