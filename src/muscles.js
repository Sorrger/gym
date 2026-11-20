import { PLAN } from './plan.js'

// Which muscles each exercise works: [main, helping]. Region ids match BodyMap.vue.
// front: chest, shoulders, biceps, forearms, abs, obliques, quads, shins
// back:  traps, reardelts, upperback, lats, triceps, lowerback, glutes, hamstrings, calves
export const MUSCLES = {
  'Wyciskanie płasko': [['chest'], ['shoulders', 'triceps']],
  'Wyciskanie hantli na skosie dodatnim': [['chest', 'shoulders'], ['triceps']],
  'Rozpiętki na bramie': [['chest'], ['shoulders']],
  'Wznosy bokiem (hantle)': [['shoulders'], ['traps', 'reardelts']],
  'Francuskie': [['triceps'], []],
  'Triceps na wyciągu (opcjonalnie)': [['triceps'], ['forearms']],

  'Nauka podciągania': [['lats', 'biceps'], ['upperback', 'forearms', 'abs']],
  'Wiosłowanie hantlem z podparciem': [['lats', 'upperback'], ['biceps', 'reardelts']],
  'T-bar row': [['upperback', 'lats'], ['biceps', 'reardelts', 'lowerback']],
  'Face pully': [['reardelts', 'upperback'], ['traps']],
  'Uginanie na ławce skośnej (hantle)': [['biceps'], ['forearms']],

  'Rumuński martwy ciąg': [['hamstrings', 'glutes'], ['lowerback', 'forearms']],
  'Przysiad Zercher': [['quads', 'glutes'], ['abs', 'upperback', 'biceps']],
  'Prostowanie nóg (maszyna)': [['quads'], []],
  'Uginanie nóg (maszyna)': [['hamstrings'], ['calves']],
  'Łydki siedząc (maszyna)': [['calves'], []],

  'Podciąganie nachwytem (wspomagane)': [['lats'], ['biceps', 'upperback']],
  'Wyciskanie sztangi nad głowę': [['shoulders'], ['triceps', 'traps']],
  'Seal row': [['upperback', 'lats'], ['reardelts', 'biceps']],
  'Wyciskanie na Smithcie na skosie': [['chest', 'shoulders'], ['triceps']],
  'Wyciąg górny szeroki': [['lats'], ['biceps', 'upperback']],
  'Butterfly': [['chest'], []],
  'Triceps + biceps': [['triceps', 'biceps'], ['forearms']],

  'Unoszenie nóg na poręczach (captain’s chair)': [['abs'], ['obliques', 'forearms']],
  'Allahy (brzuch na wyciągu)': [['abs'], ['obliques']],
  'Pallof press (wyciąg, bokiem)': [['obliques', 'abs'], ['shoulders']]
}

export function musclesOf(name) {
  const [main = [], help = []] = MUSCLES[name] || []
  return { main, help }
}

// whole training day: a muscle is "main" if any exercise trains it as main
export function dayMuscles(day) {
  const main = new Set(), help = new Set()
  for (const ex of PLAN[day].ex) { const m = musclesOf(ex[0]); m.main.forEach(x => main.add(x)); m.help.forEach(x => help.add(x)) }
  main.forEach(x => help.delete(x))
  return { main: [...main], help: [...help] }
}
