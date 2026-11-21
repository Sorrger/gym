import { PLAN } from './plan.js'

// Which muscles each exercise works: [main, helping]. Region ids match BodyMap.vue.
// front: chest, shoulders, biceps, forearms, abs, obliques, quads, shins
// back:  traps, reardelts, upperback, lats, triceps, lowerback, glutes, hamstrings, calves
export const MUSCLES = {
  'Wyciskanie sztangi na ławce płaskiej': [['chest'], ['shoulders', 'triceps']],
  'Wyciskanie hantli na ławce skośnej': [['chest'], ['shoulders', 'triceps']],
  'Rozpiętki na bramie z dołu do góry': [['chest'], ['shoulders']],
  // replaced on Push by the low-to-high version (Nov 2026) – kept so old workouts still count
  'Rozpiętki na bramie': [['chest'], ['shoulders']],
  'Unoszenie hantli bokiem': [['shoulders'], ['traps', 'reardelts']],
  'Unoszenie ramienia bokiem na wyciągu': [['shoulders'], ['traps']],
  'Wyciskanie francuskie leżąc': [['triceps'], []],
  'Prostowanie ramion na wyciągu nad głową': [['triceps'], []],

  'Nauka podciągania': [['lats'], ['biceps', 'upperback', 'forearms']],
  'Wiosłowanie hantlem jednorącz z podparciem': [['lats', 'upperback'], ['biceps', 'reardelts']],
  'Wiosłowanie na wyciągu dolnym szerokim chwytem': [['upperback', 'lats'], ['reardelts', 'traps', 'biceps']],
  // removed from Pull (Nov 2026) – kept so old workouts still count
  'Wiosłowanie sztangą T (T-bar)': [['upperback', 'lats'], ['biceps', 'reardelts', 'lowerback']],
  'Face pull na wyciągu': [['reardelts', 'upperback'], ['traps']],
  'Uginanie ramion z hantlami na ławce skośnej': [['biceps'], ['forearms']],

  'Martwy ciąg rumuński': [['hamstrings', 'glutes'], ['lowerback', 'forearms']],
  'Przysiad Zerchera': [['quads', 'glutes'], ['abs', 'upperback', 'lowerback', 'biceps']],
  'Prostowanie nóg na maszynie': [['quads'], []],
  'Uginanie nóg siedząc na maszynie': [['hamstrings'], ['calves']],
  'Wspięcia na palce stojąc': [['calves'], []],
  'Uginanie ramion z hantlami chwytem młotkowym': [['biceps', 'forearms'], []],
  'Wspięcia na palce siedząc': [['calves'], []],

  'Podciąganie nachwytem (wspomagane)': [['lats'], ['biceps', 'upperback']],
  'Wyciskanie sztangi siedząc z oparciem': [['shoulders'], ['triceps', 'traps']],
  'Seal row – wiosłowanie leżąc na ławce': [['upperback', 'lats'], ['reardelts', 'biceps']],
  'Wyciskanie na skosie na Smithie': [['chest'], ['shoulders', 'triceps']],
  'Ściąganie drążka szerokim chwytem': [['lats'], ['biceps', 'upperback']],
  'Rozpiętki na maszynie (butterfly)': [['chest'], []],
  'Odwrotne rozpiętki na maszynie (reverse butterfly)': [['reardelts'], ['upperback']],
  // removed from Upper (Nov 2026) – kept so old workouts still count
  'Triceps + biceps na wyciągu': [['triceps', 'biceps'], ['forearms']],

  'Unoszenie nóg w podporze na poręczach': [['abs'], ['obliques']],
  'Allahy – spięcia brzucha na wyciągu': [['abs'], ['obliques']],
  'Pallof press na wyciągu': [['obliques', 'abs'], []]
}

export const MUSCLE_NAMES = { chest: 'Klatka', shoulders: 'Barki', reardelts: 'Tył barków', biceps: 'Biceps', triceps: 'Triceps', forearms: 'Przedramiona',
  lats: 'Najszersze grzbietu', upperback: 'Górne plecy', traps: 'Kaptury', lowerback: 'Dolne plecy', abs: 'Brzuch', obliques: 'Skośne brzucha',
  quads: 'Czworogłowe uda', hamstrings: 'Dwugłowe uda', glutes: 'Pośladki', calves: 'Łydki' }

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
