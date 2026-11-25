// visible trainings with their progress summary – shared by the Postępy tabs
import { computed } from 'vue'
import { PLAN } from '../../plan'
import { state } from '../../store'
import { planSummary } from '../../stats'

export const usePlans = () => computed(() => { void state.sessions; return PLAN.map((p, i) => ({ ...p, i, s: planSummary(i) })).filter(p => !p.hidden) })
export const signed = v => (v == null ? '–' : (v > 0 ? '+' : v < 0 ? '−' : '±') + Math.abs(v) + '%')
