// Exercise catalogue: base movements with options (equipment, grip, width, position, bench angle, side, own variants).
// A chosen combination gives a name, a unit and the main / helping muscles. The same choice always gives the same
// name, so it shares its history. Combinations that match an exercise of the basic plan return that exercise's
// own name (ALIASES), so picking it keeps the old history.
// Muscle effects of options follow EMG / training studies, e.g.: incline bench → more front delts (Rodríguez-Ridao 2020),
// close grip → more triceps (Lehman 2005), underhand pulldown → more biceps (Lusk 2010), seated calf raise → soleus
// (Signorile 2002), overhead triceps → long head (Maeo 2022), seated leg curl → hamstrings in stretch (Maeo 2021).

/** option axes; values: [Polish label, English label] */
export const AXES = {
  eq: { pl: 'Sprzęt', en: 'Equipment', v: {
    bb: ['sztanga', 'barbell'], db: ['hantle', 'dumbbells'], ez: ['gryf łamany', 'EZ bar'], sm: ['Smith', 'Smith machine'],
    mc: ['maszyna', 'machine'], cb: ['wyciąg', 'cable'], kb: ['kettlebell', 'kettlebell'], bw: ['masa ciała', 'bodyweight'],
    bd: ['guma', 'band'], tb: ['T-gryf', 'T-bar'], hx: ['gryf heksagonalny', 'trap bar'], pl: ['talerz', 'plate'], as: ['maszyna ze wspomaganiem', 'assisted machine'] } },
  angle: { pl: 'Ławka', en: 'Bench', v: { flat: ['płasko', 'flat'], incline: ['skos dodatni', 'incline'], decline: ['skos ujemny', 'decline'] } },
  grip: { pl: 'Chwyt', en: 'Grip', v: { over: ['nachwyt', 'overhand'], under: ['podchwyt', 'underhand'], neutral: ['neutralny', 'neutral'] } },
  width: { pl: 'Rozstaw rąk', en: 'Grip width', v: { normal: ['normalnie', 'normal width'], wide: ['szeroko', 'wide'], close: ['wąsko', 'close'] } },
  stance: { pl: 'Rozstaw nóg', en: 'Stance', v: { normal: ['stopy normalnie', 'normal stance'], wide: ['stopy szeroko (sumo)', 'wide stance (sumo)'], narrow: ['stopy wąsko', 'narrow stance'] } },
  pos: { pl: 'Pozycja', en: 'Position', v: {
    stand: ['stojąc', 'standing'], seat: ['siedząc', 'seated'], lying: ['leżąc', 'lying'], kneel: ['klęcząc', 'kneeling'],
    bent: ['w opadzie', 'bent-over'], bench: ['z podparciem na ławce', 'bench-supported'], chest: ['z podparciem klatki', 'chest-supported'],
    incline: ['na ławce skośnej', 'on an incline bench'], preacher: ['na modlitewniku', 'preacher'], conc: ['łokieć na udzie', 'concentration'],
    hang: ['w zwisie', 'hanging'], captain: ['w podporze na poręczach', "captain's chair"], legpress: ['na suwnicy', 'on the leg press'],
    behind: ['za plecami (bayesian)', 'behind the body (Bayesian)'], ball: ['na piłce', 'on a stability ball'], overhead: ['ramiona w górze', 'arms overhead'], donkey: ['w opadzie (osioł)', 'donkey'], deg45: ['ławka 45°', '45° bench'], roman: ['bokiem na ławce rzymskiej', 'sideways on a Roman chair'], floor: ['siedząc na podłodze (Z-press)', 'seated on the floor (Z-press)'], sidelying: ['leżąc bokiem', 'side-lying'], deg90: ['ławka rzymska', 'Roman chair'] } },
  side: { pl: 'Strona', en: 'Side', v: { both: ['obustronnie', 'both sides'], one: ['jednostronnie', 'one side'] } },
}
export const GROUPS = [
  { k: 'chest', pl: 'Klatka', en: 'Chest' }, { k: 'back', pl: 'Plecy', en: 'Back' }, { k: 'shoulders', pl: 'Barki', en: 'Shoulders' },
  { k: 'biceps', pl: 'Biceps', en: 'Biceps' }, { k: 'triceps', pl: 'Triceps', en: 'Triceps' }, { k: 'forearms', pl: 'Przedramiona', en: 'Forearms' },
  { k: 'quads', pl: 'Uda – przód', en: 'Quads' }, { k: 'post', pl: 'Tył uda i pośladki', en: 'Hamstrings & glutes' },
  { k: 'calves', pl: 'Łydki', en: 'Calves' }, { k: 'core', pl: 'Brzuch', en: 'Core' }, { k: 'full', pl: 'Całe ciało', en: 'Full body' },
]

// base fields: id, g = group, pl / en = name, u = unit ('kg' | 'reps' | 's'), uq = unit per equipment,
// m / h = main / helping muscles, r = suggested rep range, o = options per axis (first = default),
// v = own variants [key, pl, en, effect?], x = effects 'axis:value' → { m: add main, h: add helping, d: main → helping },
// when = axis shown only for some equipment, how = [Polish, English] one-line technique cue
/** @type {any[]} */
export const BASES = [
  // ---------- chest ----------
  { id: 'bench-press', akaEn: 'bench, flat bench, BP, close-grip bench (CGBP)', aka: 'ławka, klata, wyciskanie leżąc', g: 'chest', pl: 'Wyciskanie na ławce', en: 'Bench press', m: ['chest'], h: ['shoulders', 'triceps'], r: [6, 8],
    o: { eq: ['bb', 'db', 'sm'], angle: ['flat', 'incline', 'decline'], width: ['normal', 'wide', 'close'], grip: ['over', 'neutral', 'under'] }, when: { grip: ['bb', 'db'] },
    x: { 'width:close': { m: ['triceps'] }, 'grip:under': { h: ['biceps'] } }, k: 'klata wąskim chwytem close grip triceps płaska skośna',
    how: ['Łopatki ściągnięte, stopy na ziemi, opuszczaj do dolnej części klatki.', 'Shoulder blades pinched, feet down, lower to the lower chest.'] },
  { id: 'chest-press', only: { 'eq:cb': { angle: ['flat', 'incline'] } }, akaEn: 'chest press machine, Hammer Strength press', aka: 'maszyna na klatę, hammer, wyciskanie na wyciągu', g: 'chest', pl: 'Wyciskanie przed siebie (chest press)', en: 'Chest press', m: ['chest'], h: ['shoulders', 'triceps'], r: [8, 12],
    o: { eq: ['mc', 'cb'], angle: ['flat', 'incline', 'decline'], grip: ['over', 'neutral'], side: ['both', 'one'] }, k: 'hammer strength',
    how: ['Uchwyty na wysokości środka klatki, łokcie lekko pod kątem.', 'Handles at mid-chest, elbows slightly tucked.'] },
  { id: 'fly', akaEn: 'flyes, pec deck, cable crossover, butterfly', aka: 'brama, krzyżowanie linek, butterfly, motylek, pec deck', g: 'chest', pl: 'Rozpiętki', en: 'Fly', m: ['chest'], h: ['shoulders'], r: [10, 15],
    o: { eq: ['db', 'cb', 'mc'], angle: ['flat', 'incline', 'decline'] }, when: { angle: ['db'] },
    v: [['mid', 'poziomo', 'straight across'], ['lowhigh', 'z dołu do góry', 'low to high'], ['highlow', 'z góry na dół', 'high to low']], vwhen: ['cb'], k: 'brama krzyżowanie linek butterfly pec deck crossover',
    how: ['Łokcie lekko zgięte i nieruchome, ruch łukiem jak przy obejmowaniu.', 'Soft, fixed elbows; move in an arc like a hug.'] },
  { id: 'push-up', akaEn: 'press-ups, push-ups, diamond push-ups', aka: 'pompy, diamentowe (wąsko)', g: 'chest', pl: 'Pompki', en: 'Push-up', u: 'reps', m: ['chest'], h: ['triceps', 'shoulders', 'abs'], r: [8, 20],
    o: { eq: ['bw', 'pl', 'bd'], width: ['normal', 'wide', 'close'] }, uq: { pl: 'kg' },
    v: [['floor', 'na podłodze', 'on the floor'], ['feetup', 'stopy wyżej', 'feet elevated'], ['handsup', 'ręce wyżej', 'hands elevated'], ['knees', 'na kolanach', 'from the knees'], ['archer', 'łucznicze', 'archer']],
    x: { 'width:close': { m: ['triceps'] } },
    how: ['Ciało w jednej linii, klatka do podłogi, łokcie ok. 45° od tułowia.', 'Body in one line, chest to the floor, elbows about 45° out.'] },
  { id: 'dip', akaEn: 'dips, chest dips, parallel bar dips', aka: 'dipy, dipsy, poręcze', g: 'chest', pl: 'Pompki na poręczach', en: 'Dips', u: 'reps', m: ['chest', 'triceps'], h: ['shoulders'], r: [6, 12],
    o: { eq: ['bw', 'pl', 'as'] }, uq: { pl: 'kg', as: 'kg' }, assisted: ['as'],
    v: [['lean', 'pochylony (klatka)', 'leaning forward (chest)'], ['upright', 'wyprostowany (triceps)', 'upright (triceps)', { d: ['chest'] }]],
    how: ['Zejdź do ok. 90° w łokciu, barki z dala od uszu.', 'Lower to about 90° at the elbow, shoulders away from the ears.'] },
  { id: 'pullover', akaEn: 'DB pullover', aka: 'przenoszenie hantla za głowę', g: 'chest', pl: 'Przenoszenie ciężaru za głowę (pullover)', en: 'Pullover', m: ['chest', 'lats'], h: ['triceps'], r: [10, 12],
    o: { eq: ['db', 'cb', 'mc'] }, how: ['Ramiona prawie proste, opuszczaj ciężar za głowę do rozciągnięcia.', 'Arms almost straight, lower behind the head to a stretch.'] },
  { id: 'landmine-press', only: { 'side:both': { pos: ['stand'] } }, akaEn: 'landmine, angled press', aka: 'mina', g: 'chest', pl: 'Wyciskanie landmine', en: 'Landmine press', m: ['chest', 'shoulders'], h: ['triceps', 'abs'], r: [8, 12],
    o: { eq: ['bb'], pos: ['stand', 'kneel'], side: ['one', 'both'] }, how: ['Koniec sztangi w rogu, wypychaj w górę i w przód.', 'Bar end in a corner, press up and forward.'] },
  { id: 'floor-press', akaEn: 'floor press', aka: 'wyciskanie z podłogi', g: 'chest', pl: 'Wyciskanie leżąc na podłodze', en: 'Floor press', m: ['chest', 'triceps'], h: ['shoulders'], r: [6, 10],
    o: { eq: ['bb', 'db', 'kb'] }, how: ['Łokcie dotykają podłogi, pauza i wypchnij.', 'Elbows touch the floor, pause, press.'] },

  // ---------- back ----------
  { id: 'pull-up', akaEn: 'pull-ups, chin-ups (underhand), weighted pull-ups', aka: 'drążek, chin-up (podchwytem)', g: 'back', pl: 'Podciąganie na drążku', en: 'Pull-up', u: 'reps', m: ['lats'], h: ['biceps', 'upperback', 'forearms'], r: [5, 10],
    o: { eq: ['bw', 'pl', 'as', 'bd'], grip: ['over', 'under', 'neutral'], width: ['normal', 'wide', 'close'] }, uq: { pl: 'kg', as: 'kg' }, assisted: ['as'], k: 'chin-up podchwyt wspomaganie',
    x: { 'grip:under': { m: ['biceps'] } }, how: ['Z pełnego zwisu, klatka do drążka, bez bujania.', 'From a dead hang, chest to the bar, no swinging.'] },
  { id: 'lat-pulldown', akaEn: 'lat pulldown, pulldowns, lats, kneeling pulldown', aka: 'wyciąg górny, ściąganie do klatki, ściąganie klęcząc', g: 'back', pl: 'Ściąganie drążka', en: 'Lat pulldown', m: ['lats'], h: ['biceps', 'upperback', 'reardelts'], r: [8, 12],
    o: { eq: ['cb', 'mc'], grip: ['over', 'under', 'neutral'], width: ['wide', 'normal', 'close'], side: ['both', 'one'], pos: ['seat', 'kneel'] }, when: { pos: ['cb'] },
    x: { 'grip:under': { m: ['biceps'] } }, how: ['Drążek do górnej części klatki, łokcie w dół i do tułowia.', 'Bar to the upper chest, elbows down and in.'] },
  { id: 'bb-row', akaEn: 'barbell row, BB row, Pendlay row, Yates row', aka: 'wiosło, wiosłowanie sztangą', g: 'back', pl: 'Wiosłowanie sztangą w opadzie', en: 'Bent-over barbell row', m: ['upperback', 'lats'], h: ['biceps', 'reardelts', 'lowerback', 'forearms'], r: [6, 10],
    o: { eq: ['bb', 'sm', 'ez'], grip: ['over', 'under'], width: ['normal', 'wide'] }, x: { 'width:wide': { m: ['reardelts'] } }, k: 'pendlay yates',
    v: [['bent', 'klasycznie', 'classic'], ['pendlay', 'z podłogi (Pendlay)', 'Pendlay'], ['yates', 'tułów wyżej (Yates)', 'Yates']],
    how: ['Tułów pochylony ok. 45°, plecy proste, sztanga do brzucha.', 'Torso at about 45°, flat back, bar to the belly.'] },
  { id: 'db-row', only: { 'pos:bench': { side: ['one'] } }, akaEn: 'one-arm row, DB row, Kroc row', aka: 'wiosło hantlem, kroc row', g: 'back', pl: 'Wiosłowanie hantlem', en: 'Dumbbell row', m: ['lats', 'upperback'], h: ['biceps', 'reardelts'], r: [8, 12],
    o: { eq: ['db'], pos: ['bench', 'bent', 'chest'], side: ['one', 'both'] },
    how: ['Łokieć prowadź do biodra, na dole pełne rozciągnięcie.', 'Drive the elbow to the hip, full stretch at the bottom.'] },
  { id: 'cable-row', akaEn: 'seated row, low row, cable row', aka: 'linka do brzucha, wioślarz, wyciąg dolny', g: 'back', pl: 'Wiosłowanie na wyciągu dolnym', en: 'Seated cable row', m: ['upperback', 'lats'], h: ['biceps', 'reardelts'], r: [8, 12],
    o: { eq: ['cb'], grip: ['neutral', 'over', 'under'], width: ['close', 'wide'], side: ['both', 'one'] },
    x: { 'width:wide': { m: ['reardelts'], d: ['lats'] }, 'width:close': { d: ['upperback'] } },
    how: ['Tułów nieruchomy, ściągnij łopatki, uchwyt do brzucha.', 'Still torso, squeeze the shoulder blades, handle to the belly.'] },
  { id: 'tbar-row', akaEn: 'T-bar, chest-supported T-bar', aka: 'T-bar, wiosło T', g: 'back', pl: 'Wiosłowanie T-gryfem', en: 'T-bar row', m: ['upperback', 'lats'], h: ['biceps', 'reardelts', 'lowerback'], r: [8, 12],
    o: { eq: ['tb'], pos: ['bent', 'chest'], grip: ['neutral', 'over'], width: ['close', 'wide'] },
    how: ['Klatka nad sztangą, plecy proste, ciągnij do brzucha.', 'Chest over the bar, flat back, pull to the belly.'] },
  { id: 'machine-row', akaEn: 'Hammer Strength row, iso-lateral row, high row', aka: 'wioślarz na maszynie, T-bar na maszynie, hammer', g: 'back', pl: 'Wiosłowanie na maszynie', en: 'Machine row', m: ['upperback', 'lats'], h: ['biceps', 'reardelts'], r: [8, 12],
    o: { eq: ['mc'], grip: ['neutral', 'over'], side: ['both', 'one'] }, v: [['mid', 'do brzucha', 'to the belly'], ['high', 'z góry (high row)', 'high row', { m: ['lats'], d: ['upperback'] }]],
    how: ['Klatka na oparciu, ciągnij łokcie do tyłu.', 'Chest on the pad, drive the elbows back.'] },
  { id: 'seal-row', akaEn: 'seal row, bench row', aka: 'seal row, wiosło leżąc', g: 'back', pl: 'Wiosłowanie leżąc na ławce (seal row)', en: 'Seal row', m: ['upperback', 'lats'], h: ['biceps', 'reardelts'], r: [8, 10],
    o: { eq: ['bb', 'db'] }, how: ['Leżąc przodem na wysokiej ławce, ciągnij do ławki bez odrywania klatki.', 'Lying face down on a high bench, pull to the bench without lifting the chest.'] },
  { id: 'inverted-row', akaEn: 'Australian pull-ups, bodyweight row', aka: 'australijskie, wiosłowanie pod drążkiem', g: 'back', pl: 'Wiosłowanie australijskie', en: 'Inverted row', u: 'reps', m: ['upperback', 'lats'], h: ['biceps', 'reardelts'], r: [8, 15],
    o: { eq: ['bw'], grip: ['over', 'under'] }, how: ['Ciało proste pod drążkiem, klatka do drążka.', 'Straight body under the bar, chest to the bar.'] },
  { id: 'straight-arm', akaEn: 'lat prayer, straight-arm pushdown', aka: 'pullover na wyciągu', g: 'back', pl: 'Ściąganie prostymi rękami', en: 'Straight-arm pulldown', m: ['lats'], h: ['triceps'], r: [10, 15],
    o: { eq: ['cb'] }, v: [['bar', 'drążek', 'bar'], ['rope', 'lina', 'rope']],
    how: ['Ręce prawie proste, ściągaj łukiem do ud.', 'Arms almost straight, pull in an arc to the thighs.'] },
  { id: 'shrug', akaEn: 'shrugs, traps', aka: 'szrugsy, kaptury', g: 'back', pl: 'Unoszenie barków (szrugsy)', en: 'Shrug', m: ['traps'], h: ['forearms'], r: [10, 15],
    o: { eq: ['bb', 'db', 'mc', 'sm', 'cb', 'hx'] }, how: ['Barki prosto w górę do uszu, pauza, bez kręcenia.', 'Shoulders straight up to the ears, pause, no rolling.'] },
  { id: 'face-pull', only: { 'eq:bd': { pos: ['stand', 'seat'] } }, akaEn: 'face pulls', aka: 'face pulle, lina do twarzy', g: 'back', pl: 'Przyciąganie liny do twarzy (face pull)', en: 'Face pull', m: ['reardelts'], h: ['upperback', 'traps'], r: [12, 15],
    o: { eq: ['cb', 'bd'], pos: ['stand', 'seat', 'kneel'] }, how: ['Lina do czoła, łokcie wysoko, na końcu kciuki do tyłu.', 'Rope to the forehead, elbows high, thumbs back at the end.'] },
  { id: 'reverse-fly', akaEn: 'reverse pec deck, rear delt fly', aka: 'odwrotny butterfly, tył barków', g: 'back', pl: 'Odwrotne rozpiętki', en: 'Reverse fly', m: ['reardelts'], h: ['upperback'], r: [12, 15],
    o: { eq: ['mc', 'db', 'cb'], pos: ['seat', 'bent', 'chest'] }, when: { pos: ['db', 'cb'] },
    how: ['Ramiona szeroko i nisko, prowadź łokciami do tyłu.', 'Arms wide and low, lead with the elbows back.'] },
  { id: 'back-extension', akaEn: 'hyperextensions, hypers, 45° back extension', aka: 'hiperekstensje, ławka rzymska, prostowniki', g: 'back', pl: 'Wyprosty tułowia (hiperekstensje)', en: 'Back extension', u: 'reps', m: ['lowerback', 'glutes'], h: ['hamstrings'], r: [10, 15],
    o: { eq: ['bw', 'pl', 'mc'], pos: ['deg45', 'deg90'] }, uq: { pl: 'kg', mc: 'kg' }, when: { pos: ['bw', 'pl'] },
    how: ['Zginaj w biodrach, wracaj do linii prostej, bez przeprostu.', 'Hinge at the hips, come back to a straight line, no overextension.'] },
  { id: 'good-morning', akaEn: 'good mornings', aka: 'dzień dobry', g: 'back', pl: 'Skłony ze sztangą na karku (good morning)', en: 'Good morning', m: ['hamstrings', 'lowerback'], h: ['glutes'], r: [8, 12],
    o: { eq: ['bb', 'sm'] }, how: ['Sztanga na plecach, kolana lekko ugięte, pochylaj w biodrach.', 'Bar on the back, soft knees, hinge at the hips.'] },
  { id: 'dead-hang', akaEn: 'hangs, bar hang', aka: 'wiszenie, zwis', g: 'back', pl: 'Zwis na drążku', en: 'Dead hang', u: 's', m: ['forearms'], h: ['lats', 'shoulders'], r: [20, 60],
    o: { eq: ['bw'], grip: ['over', 'under', 'neutral'] }, how: ['Pełny zwis, barki aktywne, oddychaj spokojnie.', 'Full hang, active shoulders, breathe calmly.'] },

  // ---------- shoulders ----------
  { id: 'ohp', only: { 'eq:mc': { pos: ['seat'] }, 'eq:bb': { side: ['both'] }, 'eq:sm': { pos: ['seat', 'stand'], side: ['both'] } }, akaEn: 'OHP, military press, shoulder press, strict press, Z-press', aka: 'żołnierskie, wyciskanie żołnierskie, military press, OHP, Z-press', g: 'shoulders', pl: 'Wyciskanie nad głowę', en: 'Overhead press', m: ['shoulders'], h: ['triceps', 'traps'], r: [6, 10],
    o: { eq: ['bb', 'db', 'sm', 'mc', 'kb'], pos: ['stand', 'seat', 'floor'], side: ['both', 'one'] }, x: { 'pos:stand': { h: ['abs'] } },
    how: ['Brzuch napięty, sztanga po linii twarzy, na górze głowa pod ciężarem.', 'Brace, bar past the face, head through at the top.'] },
  { id: 'arnold', akaEn: 'Arnolds', aka: 'arnoldki', g: 'shoulders', pl: 'Wyciskanie Arnolda (arnoldki)', en: 'Arnold press', m: ['shoulders'], h: ['triceps'], r: [8, 12],
    o: { eq: ['db'], pos: ['seat', 'stand'] }, how: ['Zaczynasz dłońmi do siebie, w trakcie obracasz na zewnątrz.', 'Start palms facing you, rotate out as you press.'] },
  { id: 'lateral-raise', only: { 'eq:mc': { pos: ['seat'] }, 'eq:cb': { pos: ['stand', 'seat'] }, 'eq:bd': { pos: ['stand'] } }, akaEn: 'laterals, side raises, side delt raise', aka: 'wznosy bokiem, boki barków', g: 'shoulders', pl: 'Unoszenie ramion bokiem', en: 'Lateral raise', m: ['shoulders'], h: ['traps'], r: [10, 15],
    o: { eq: ['db', 'cb', 'mc', 'bd'], pos: ['stand', 'seat', 'incline', 'lying'], side: ['both', 'one'] }, k: 'boki barków wznosy',
    how: ['Unoś do wysokości barków, łokieć prowadzi, bez machania.', 'Raise to shoulder height, elbow leads, no swinging.'] },
  { id: 'front-raise', only: { 'eq:bb': { side: ['both'] }, 'eq:pl': { side: ['both'] } }, akaEn: 'front raises, front delt raise', aka: 'wznosy w przód', g: 'shoulders', pl: 'Unoszenie ramion w przód', en: 'Front raise', m: ['shoulders'], h: ['chest'], r: [10, 15],
    o: { eq: ['db', 'bb', 'cb', 'pl'], side: ['both', 'one'] }, how: ['Do wysokości oczu, ramię prawie proste.', 'To eye level, arm almost straight.'] },
  { id: 'upright-row', akaEn: 'upright rows', aka: 'wiosłowanie stojąc, sztanga pod brodę', g: 'shoulders', pl: 'Podciąganie wzdłuż tułowia', en: 'Upright row', m: ['shoulders'], r: [10, 12],
    o: { eq: ['bb', 'ez', 'db', 'cb', 'sm'], width: ['wide', 'close'] }, x: { 'width:close': { m: ['traps'] } }, h: ['traps', 'biceps'],
    how: ['Szeroki chwyt, łokcie do wysokości barków, nie wyżej.', 'Wide grip, elbows to shoulder height, not higher.'] },
  { id: 'pike-push-up', akaEn: 'pike push-ups, HSPU', aka: 'pompki pike, pompki w staniu na rękach', g: 'shoulders', pl: 'Pompki z biodrami w górze', en: 'Pike push-up', u: 'reps', m: ['shoulders'], h: ['triceps'], r: [6, 12],
    o: { eq: ['bw'] }, v: [['pike', 'pike', 'pike'], ['hspu', 'w staniu na rękach', 'handstand']],
    how: ['Biodra wysoko, głowa schodzi przed dłonie.', 'Hips high, head goes down in front of the hands.'] },

  // ---------- biceps ----------
  { id: 'curl', only: { 'eq:bb': { pos: ['stand', 'preacher', 'chest'], side: ['both'], v: ['normal', 'drag'] }, 'eq:ez': { pos: ['stand', 'preacher', 'chest'], side: ['both'], v: ['normal', 'drag'] }, 'eq:db': { pos: ['stand', 'seat', 'incline', 'preacher', 'conc', 'chest'] }, 'eq:cb': { pos: ['stand', 'seat', 'preacher', 'behind', 'overhead'], v: ['normal', 'cross'] }, 'eq:mc': { pos: ['preacher', 'seat'] }, 'eq:kb': { pos: ['stand', 'seat', 'conc'] }, 'eq:bd': { pos: ['stand', 'seat'] } }, akaEn: 'curls, bicep curls, hammer curls, preacher curls, spider curls, Bayesian curls, Zottman', aka: 'biceps, młotki, modlitewnik, uginanie ze sztangą łamaną', g: 'biceps', pl: 'Uginanie ramion', en: 'Biceps curl', m: ['biceps'], h: ['forearms'], r: [8, 12],
    o: { eq: ['db', 'bb', 'ez', 'cb', 'mc', 'kb', 'bd'], pos: ['stand', 'seat', 'incline', 'preacher', 'conc', 'behind', 'chest', 'overhead'], grip: ['under', 'neutral', 'over'], side: ['both', 'one'] },
    k: 'młotkowe hammer modlitewnik spider bayesian odwrotne reverse drag zottman',
    v: [['normal', 'klasycznie', 'classic'], ['drag', 'wzdłuż tułowia (drag)', 'drag curl'], ['zottman', 'Zottmana', 'Zottman', { m: ['forearms'] }], ['cross', 'w poprzek tułowia', 'cross-body']], vwhen: { eq: ['db', 'bb', 'ez', 'cb'], pos: ['stand', 'seat'] },
    x: { 'grip:neutral': { m: ['forearms'] }, 'grip:over': { m: ['forearms'], d: ['biceps'] } },
    how: ['Łokcie przy tułowiu, pełny zakres, powoli w dół.', 'Elbows at the sides, full range, slow on the way down.'] },
  // ---------- triceps ----------
  { id: 'pushdown', akaEn: 'pushdowns, rope pushdown, tricep pressdown', aka: 'triceps na wyciągu, prostowanie na wyciągu, ściąganie linki w dół', g: 'triceps', pl: 'Prostowanie ramion w dół (pushdown)', en: 'Triceps pushdown', m: ['triceps'], r: [10, 12],
    o: { eq: ['cb', 'bd'], grip: ['over', 'under'], side: ['both', 'one'] }, v: [['rope', 'lina', 'rope'], ['bar', 'drążek', 'bar'], ['vbar', 'V-uchwyt', 'V-bar']], vwhen: ['cb'],
    how: ['Łokcie przyklejone do boków, prostuj do końca.', 'Elbows pinned to the sides, lock out fully.'] },
  { id: 'overhead-ext', only: { 'eq:mc': { pos: ['seat'] }, 'eq:ez': { side: ['both'] } }, akaEn: 'overhead extension, French press, katana extension', aka: 'francuz nad głową', g: 'triceps', pl: 'Prostowanie ramion nad głową', en: 'Overhead triceps extension', m: ['triceps'], r: [10, 12],
    o: { eq: ['cb', 'db', 'ez', 'mc'], pos: ['stand', 'seat'], side: ['both', 'one'] }, v: [['rope', 'lina', 'rope'], ['bar', 'drążek', 'bar'], ['katana', 'w poprzek ciała (katana)', 'cross-body (katana)']], vwhen: ['cb'],
    how: ['Łokcie przy głowie, opuszczaj głęboko za głowę.', 'Elbows by the head, lower deep behind the head.'] },
  { id: 'skull-crusher', akaEn: 'skull crushers, lying triceps extension, LTE', aka: 'francuz, francuskie', g: 'triceps', pl: 'Wyciskanie francuskie', en: 'Skull crusher', m: ['triceps'], r: [8, 10],
    o: { eq: ['ez', 'bb', 'db', 'cb'], angle: ['flat', 'incline', 'decline'] }, how: ['Ramiona nieruchome, ciężar za głowę, wypchnij.', 'Upper arms still, weight behind the head, extend.'] },
  { id: 'kickback', akaEn: 'kickbacks', aka: 'kickback', g: 'triceps', pl: 'Prostowanie ramienia w opadzie tułowia (kickback)', en: 'Triceps kickback', m: ['triceps'], r: [10, 15],
    o: { eq: ['db', 'cb'], side: ['one', 'both'] }, how: ['Ramię równolegle do podłogi, prostuj tylko łokieć.', 'Upper arm parallel to the floor, extend only the elbow.'] },
  { id: 'dip-machine', akaEn: 'seated dip machine', aka: 'dipy na maszynie', g: 'triceps', pl: 'Prostowanie ramion na maszynie do dipów', en: 'Machine dip', m: ['triceps'], h: ['chest'], r: [8, 12],
    o: { eq: ['mc'] }, how: ['Siedząc, wypychaj uchwyty w dół do wyprostu.', 'Seated, press the handles down to lockout.'] },
  { id: 'jm-press', akaEn: 'JM press', aka: 'JM press', g: 'triceps', pl: 'Wyciskanie JM (JM press)', en: 'JM press', m: ['triceps'], h: ['chest'], r: [6, 10],
    o: { eq: ['bb', 'sm', 'ez'] }, how: ['Wąsko, sztanga schodzi w stronę brody, łokcie w przód.', 'Close grip, bar travels toward the chin, elbows forward.'] },

  // ---------- forearms ----------
  { id: 'wrist-curl', akaEn: 'wrist curls, reverse wrist curls', aka: 'nadgarstki', g: 'forearms', pl: 'Uginanie nadgarstków', en: 'Wrist curl', m: ['forearms'], r: [12, 20],
    o: { eq: ['bb', 'db', 'cb'], grip: ['under', 'over'] }, how: ['Przedramiona na ławce, ruch tylko w nadgarstku.', 'Forearms on a bench, move only the wrist.'] },
  { id: 'farmer', only: { 'eq:hx': { side: ['both'] } }, akaEn: "farmer's carry, farmer carries, suitcase carry", aka: 'farmerski, spacer farmera, suitcase carry (jednorącz)', g: 'forearms', pl: 'Spacer farmera', en: "Farmer's walk", m: ['forearms', 'traps'], h: ['abs', 'obliques', 'glutes'], r: [20, 40],
    o: { eq: ['db', 'kb', 'hx'], side: ['both', 'one'] }, x: { 'side:one': { m: ['obliques'] } },
    how: ['Wyprostowany, krótkie kroki, barki w dół.', 'Tall posture, short steps, shoulders down.'] },

  // ---------- quads ----------
  { id: 'squat', only: { 'eq:sm': { v: ['back', 'front', 'box'] } }, akaEn: 'squats, back squat, front squat, ATG, box squat', aka: 'przysiady, przysiad ze sztangą, front squat', g: 'quads', pl: 'Przysiad', en: 'Squat', m: ['quads', 'glutes'], h: ['adductors', 'lowerback'], r: [6, 10],
    o: { eq: ['bb', 'sm'], stance: ['normal', 'wide', 'narrow'] },
    v: [['back', 'sztanga z tyłu', 'back squat'], ['front', 'przedni', 'front squat', { h: ['abs'] }], ['zercher', 'Zerchera', 'Zercher', { h: ['abs', 'biceps', 'upperback'] }], ['box', 'do skrzyni', 'box squat'], ['overhead', 'nad głową (overhead squat)', 'overhead squat', { h: ['shoulders', 'upperback', 'abs'] }]],
    x: { 'stance:wide': { m: ['adductors'] } },
    how: ['Kolana w linii stóp, plecy proste, schodź co najmniej do równoległej.', 'Knees in line with the feet, flat back, go at least to parallel.'] },
  { id: 'hack-squat', only: { 'eq:bb': { stance: ['normal'] } }, akaEn: 'hack squat', aka: 'hack, hacken', g: 'quads', pl: 'Przysiad hack', en: 'Hack squat', m: ['quads'], h: ['glutes', 'adductors'], r: [8, 12],
    o: { eq: ['mc', 'bb'], stance: ['normal', 'narrow', 'wide'] }, how: ['Plecy na oparciu, głęboko w dół, kolana do przodu.', 'Back on the pad, deep, knees travel forward.'] },
  { id: 'pendulum', akaEn: 'pendulum', aka: 'wahadło', g: 'quads', pl: 'Przysiad na maszynie wahadłowej', en: 'Pendulum squat', m: ['quads'], h: ['glutes'], r: [8, 12],
    o: { eq: ['mc'] }, how: ['Pełny zakres, kolana daleko w przód.', 'Full range, knees far forward.'] },
  { id: 'leg-press', akaEn: 'leg press, 45° leg press', aka: 'suwnica, wypychanie nóg', g: 'quads', pl: 'Wypychanie nóg na suwnicy', en: 'Leg press', m: ['quads', 'glutes'], h: ['adductors', 'hamstrings'], r: [8, 12],
    o: { eq: ['mc'], stance: ['normal', 'wide', 'narrow'], side: ['both', 'one'] },
    v: [['mid', 'stopy na środku', 'feet in the middle'], ['high', 'stopy wysoko', 'feet high'], ['low', 'stopy nisko', 'feet low']],
    how: ['Dolna część pleców przy oparciu, nie blokuj kolan na górze.', 'Lower back on the pad, do not lock the knees at the top.'] },
  { id: 'lunge', only: { 'eq:sm': { v: ['fwd', 'rev'] } }, akaEn: 'lunges, walking lunges, reverse lunges', aka: 'wykroki, zakroki (w tył)', g: 'quads', pl: 'Wykroki', en: 'Lunge', m: ['quads', 'glutes'], h: ['adductors', 'hamstrings'], r: [8, 12],
    o: { eq: ['db', 'bb', 'sm', 'kb', 'bw'] }, uq: { bw: 'reps' },
    v: [['fwd', 'w przód', 'forward'], ['rev', 'w tył', 'reverse'], ['walk', 'chodzone', 'walking'], ['side', 'w bok', 'lateral', { m: ['adductors'] }]],
    how: ['Długi krok, tylne kolano prawie do ziemi, tułów prosto.', 'Long step, back knee near the floor, upright torso.'] },
  { id: 'split-squat', akaEn: 'Bulgarians, BSS, Bulgarian split squat', aka: 'bułgary, przysiad bułgarski', g: 'quads', pl: 'Przysiad wykroczny (split squat)', en: 'Split squat', m: ['quads', 'glutes'], h: ['adductors'], r: [8, 12],
    o: { eq: ['db', 'bb', 'sm', 'kb', 'bw'] }, uq: { bw: 'reps' }, v: [['bulgarian', 'bułgarski (tylna noga na ławce)', 'Bulgarian (rear foot elevated)'], ['floor', 'obie stopy na podłodze', 'both feet on the floor'], ['front', 'przednia stopa wyżej', 'front foot elevated']], how: ['Tułów prosto, schodź pionowo w dół, przednie kolano nad stopą.', 'Upright torso, go straight down, front knee over the foot.'] },
  { id: 'step-up', akaEn: 'step-ups, box step-ups', aka: 'step-upy, wchodzenie na skrzynię', g: 'quads', pl: 'Wejścia na skrzynię', en: 'Step-up', m: ['quads', 'glutes'], h: ['hamstrings', 'adductors'], r: [8, 12],
    o: { eq: ['db', 'bb', 'kb', 'bw'] }, uq: { bw: 'reps' }, how: ['Pchaj piętą z góry, nie odbijaj się dolną nogą.', 'Drive through the top heel, no push from the bottom leg.'] },
  { id: 'leg-extension', akaEn: 'leg extensions, quad extensions', aka: 'prostowanie nóg, czwórki na maszynie', g: 'quads', pl: 'Prostowanie nóg na maszynie', en: 'Leg extension', m: ['quads'], r: [10, 15],
    o: { eq: ['mc'], side: ['both', 'one'] }, how: ['Wyprost do końca, pauza, powoli w dół.', 'Full lockout, pause, slow on the way down.'] },
  { id: 'sissy-squat', akaEn: 'sissy squat', aka: 'sissy', g: 'quads', pl: 'Przysiad sissy', en: 'Sissy squat', u: 'reps', m: ['quads'], r: [8, 15],
    o: { eq: ['bw', 'mc', 'pl'] }, uq: { mc: 'kg', pl: 'kg' }, how: ['Kolana daleko w przód, biodra wyprostowane.', 'Knees far forward, hips extended.'] },

  // ---------- hamstrings + glutes ----------
  { id: 'deadlift', only: { 'eq:db': { stance: ['normal', 'wide'] } }, akaEn: 'deadlift, DL, deads, sumo, trap bar deadlift, rack pull', aka: 'martwy, MC, sumo, rack pull', g: 'post', pl: 'Martwy ciąg', en: 'Deadlift', m: ['glutes', 'hamstrings', 'lowerback'], h: ['quads', 'upperback', 'traps', 'forearms'], r: [3, 6],
    o: { eq: ['bb', 'hx', 'db', 'kb'], stance: ['normal', 'wide'] }, x: { 'stance:wide': { m: ['quads', 'adductors'] }, 'eq:hx': { m: ['quads'] } }, k: 'sumo trap bar rack pull deficyt',
    v: [['floor', 'z podłogi', 'from the floor'], ['deficit', 'z podwyższenia (deficyt)', 'deficit'], ['rack', 'z podpórek (rack pull)', 'rack pull', { m: ['upperback', 'traps'], d: ['hamstrings'] }]], vwhen: ['bb', 'hx'],
    how: ['Ciężar blisko nóg, plecy proste, pchaj podłogę nogami.', 'Weight close to the legs, flat back, push the floor away.'] },
  { id: 'rdl', only: { 'eq:sm': { v: ['rdl', 'sldl'] } }, akaEn: 'RDL, SLDL, stiff-legged deadlift, single-leg RDL', aka: 'rumuński, RDL, martwy na prostych nogach', g: 'post', pl: 'Martwy ciąg rumuński', en: 'Romanian deadlift', m: ['hamstrings', 'glutes'], h: ['lowerback', 'forearms'], r: [8, 10],
    o: { eq: ['bb', 'db', 'sm', 'kb'] }, v: [['rdl', 'kolana lekko ugięte', 'soft knees'], ['sldl', 'na sztywnych nogach', 'stiff-legged'], ['single', 'na jednej nodze', 'single-leg']],
    how: ['Biodra do tyłu, ciężar blisko nóg, schodź do rozciągnięcia.', 'Hips back, weight close to the legs, lower to a stretch.'] },
  { id: 'leg-curl', only: { 'eq:db': { pos: ['lying'], side: ['both'] }, 'eq:cb': { pos: ['stand', 'lying'], side: ['one'] } }, akaEn: 'hamstring curl, lying/seated leg curl', aka: 'dwójki na maszynie, uginanie nóg', g: 'post', pl: 'Uginanie nóg (leg curl)', en: 'Leg curl', m: ['hamstrings'], h: ['calves'], r: [10, 12],
    o: { eq: ['mc', 'cb', 'db'], pos: ['seat', 'lying', 'stand'], side: ['both', 'one'] },
    how: ['Biodra dociśnięte, uginaj do końca, powoli wracaj. Siedząc dwugłowe są bardziej rozciągnięte i lepiej rosną.', 'Hips pressed down, curl fully, return slowly. Seated puts the hamstrings in more stretch – better growth.'] },
  { id: 'nordic', akaEn: 'Nordics, Nordic hamstring curl', aka: 'nordyki, nordic curl', g: 'post', pl: 'Uginanie nordyckie', en: 'Nordic curl', u: 'reps', m: ['hamstrings'], r: [3, 8],
    o: { eq: ['bw', 'bd'] }, how: ['Kolana na macie, opadaj jak najwolniej w przód.', 'Knees on a mat, fall forward as slowly as you can.'] },
  { id: 'hip-thrust', akaEn: 'hip thrusts, glute thrust', aka: 'hip thrusty, mostki ze sztangą', g: 'post', pl: 'Wypychanie bioder (hip thrust)', en: 'Hip thrust', m: ['glutes'], h: ['hamstrings', 'quads'], r: [8, 12],
    o: { eq: ['bb', 'sm', 'mc', 'db', 'bd'], side: ['both', 'one'] }, how: ['Łopatki na ławce, broda w dół, wypchnij biodra do linii prostej.', 'Shoulder blades on a bench, chin down, drive the hips to a straight line.'] },
  { id: 'glute-bridge', only: { 'eq:bb': { v: ['classic'] } }, akaEn: 'glute bridges, frog pumps', aka: 'mostki, unoszenie bioder', g: 'post', pl: 'Mostek biodrowy', en: 'Glute bridge', u: 'reps', m: ['glutes'], h: ['hamstrings'], r: [10, 20],
    o: { eq: ['bw', 'bb', 'db', 'bd'], side: ['both', 'one'] }, v: [['classic', 'klasycznie', 'classic'], ['frog', 'żabka (frog pump)', 'frog pump']], uq: { bb: 'kg', db: 'kg' }, how: ['Leżąc, pięty blisko, unoś biodra, pauza na górze.', 'Lying, heels close, lift the hips, pause at the top.'] },
  { id: 'glute-kickback', akaEn: 'cable kickbacks, donkey kicks', aka: 'kopnięcia w tył, kickback pośladka', g: 'post', pl: 'Wymachy nogi w tył (kickback)', en: 'Glute kickback', m: ['glutes'], h: ['hamstrings'], r: [10, 15],
    o: { eq: ['cb', 'mc', 'bd'] }, how: ['Biodra nieruchome, noga w tył bez wyginania pleców.', 'Still hips, leg back without arching the back.'] },
  { id: 'hip-abduction', only: { 'eq:mc': { pos: ['seat'] }, 'eq:cb': { pos: ['stand'] }, 'eq:bw': { pos: ['sidelying', 'kneel'] }, 'pos:seat': { v: ['straight'] }, 'pos:stand': { v: ['straight'] }, 'pos:kneel': { v: ['straight'] } }, akaEn: 'abductor machine, clamshells, fire hydrants', aka: 'odwodziciele, muszelki, fire hydrant (w klęku)', g: 'post', pl: 'Odwodzenie nóg', en: 'Hip abduction', m: ['glutes'], r: [12, 20],
    o: { eq: ['mc', 'cb', 'bd', 'bw'], pos: ['seat', 'stand', 'sidelying', 'kneel'] }, uq: { bw: 'reps' }, v: [['straight', 'prosta noga', 'straight leg'], ['clam', 'muszelki (kolana zgięte)', 'clamshell']], vwhen: ['bw', 'bd'], how: ['Pracuje pośladek średni; pauza przy pełnym rozwarciu.', 'Works the glute medius; pause when fully open.'] },
  { id: 'hip-adduction', akaEn: 'adductor machine', aka: 'przywodziciele', g: 'post', pl: 'Przywodzenie nóg', en: 'Hip adduction', m: ['adductors'], r: [12, 20],
    o: { eq: ['mc', 'cb'] }, how: ['Kontrolowane zamknięcie, bez odbijania.', 'Controlled squeeze, no bouncing.'] },
  { id: 'kb-swing', akaEn: 'KB swings, Russian swing', aka: 'swingi, wymachy', g: 'post', pl: 'Wymachy kettlebell (swing)', en: 'Kettlebell swing', m: ['glutes', 'hamstrings'], h: ['lowerback', 'shoulders', 'forearms'], r: [12, 20],
    o: { eq: ['kb', 'db'] }, how: ['Ruch z bioder, nie z ramion; mocny wyprost na górze.', 'Hinge from the hips, not the arms; snap to lockout.'] },
  { id: 'pull-through', akaEn: 'pull-throughs', aka: 'pull-through', g: 'post', pl: 'Przeciąganie liny między nogami (pull-through)', en: 'Pull-through', m: ['glutes', 'hamstrings'], h: ['lowerback'], r: [12, 15],
    o: { eq: ['cb', 'bd'] }, how: ['Tyłem do wyciągu, biodra do tyłu, wypchnij w przód.', 'Back to the cable, hips back, drive forward.'] },

  // ---------- calves ----------
  { id: 'calf-raise', only: { 'eq:sm': { pos: ['stand', 'seat'] }, 'eq:bb': { pos: ['stand', 'seat'] }, 'eq:db': { pos: ['stand', 'seat'] }, 'eq:bw': { pos: ['stand'] } }, akaEn: 'calf raises, calves, donkey calf raise', aka: 'łydki, wspięcia', g: 'calves', pl: 'Wspięcia na palce', en: 'Calf raise', m: ['calves'], r: [12, 15],
    o: { eq: ['mc', 'sm', 'bb', 'db', 'bw'], pos: ['stand', 'seat', 'legpress', 'donkey'], side: ['both', 'one'] }, uq: { bw: 'reps' }, k: 'łydki calves',
    how: ['Pełny zakres z pauzą w rozciągnięciu. Siedząc pracuje głównie płaszczkowaty.', 'Full range with a pause in the stretch. Seated works mostly the soleus.'] },

  // ---------- core ----------
  { id: 'crunch', only: { 'eq:bw': { pos: ['lying', 'incline', 'ball'] }, 'eq:pl': { pos: ['lying', 'incline', 'ball'] }, 'eq:cb': { pos: ['kneel', 'stand', 'seat'] }, 'eq:mc': { pos: ['seat'] } }, akaEn: 'crunches, cable crunch, kneeling cable crunch', aka: 'brzuszki, allahy (na wyciągu klęcząc), sięganie do stóp', g: 'core', pl: 'Spięcia brzucha', en: 'Crunch', u: 'reps', m: ['abs'], h: ['obliques'], r: [10, 20],
    o: { eq: ['bw', 'cb', 'mc', 'pl'], pos: ['lying', 'kneel', 'seat', 'incline', 'stand', 'ball'] }, uq: { cb: 'kg', mc: 'kg', pl: 'kg' }, k: 'allahy brzuszki toe touch',
    v: [['classic', 'klasycznie', 'classic'], ['legsup', 'nogi w górze (sięganie do stóp)', 'legs up (toe touches)']], vwhen: { eq: ['bw', 'pl'], pos: ['lying'] },
    how: ['Zwijaj tułów kręg po kręgu, wydech na górze.', 'Curl the spine one vertebra at a time, exhale at the top.'] },
  { id: 'leg-raise', only: { 'pos:captain': { v: ['bent', 'straight', 'oblique'] }, 'pos:lying': { v: ['bent', 'straight'] }, 'pos:incline': { v: ['bent', 'straight'] } }, akaEn: "hanging leg raise, captain's chair, knee raise, toes to bar, T2B", aka: 'unoszenie nóg na poręczach, kapitańskie krzesło, T2B, palce do drążka', g: 'core', pl: 'Unoszenie nóg', en: 'Leg raise', u: 'reps', m: ['abs'], h: ['obliques'], r: [10, 15],
    o: { eq: ['bw', 'db'], pos: ['captain', 'hang', 'lying', 'incline'] }, uq: { db: 'kg' }, v: [['bent', 'kolana zgięte', 'bent knees'], ['straight', 'nogi proste', 'straight legs'], ['oblique', 'skośnie na boki', 'to the sides', { m: ['obliques'] }], ['t2b', 'stopy do drążka (toes to bar)', 'toes to bar', { h: ['lats', 'forearms'] }]],
    how: ['Podwiń miednicę na górze, bez bujania.', 'Tuck the pelvis at the top, no swinging.'] },
  { id: 'plank', akaEn: 'plank, front plank, side plank, RKC plank', aka: 'deska, plank', g: 'core', pl: 'Deska (plank)', en: 'Plank', u: 's', m: ['abs'], h: ['obliques', 'shoulders'], r: [30, 60],
    o: { eq: ['bw', 'pl'] }, v: [['front', 'przodem', 'front'], ['side', 'bokiem', 'side', { m: ['obliques'] }], ['updown', 'z przejściem na dłonie', 'up-downs', { h: ['triceps'] }], ['taps', 'z dotykaniem barków', 'shoulder taps', { m: ['obliques'] }], ['rkc', 'z maksymalnym napięciem (RKC)', 'RKC']],
    how: ['Ciało w linii, pośladki i brzuch napięte.', 'Body in a line, glutes and abs tight.'] },
  { id: 'ab-wheel', only: { 'eq:bb': { v: ['knees', 'standing'] } }, akaEn: 'ab wheel, rollouts', aka: 'kółko, roller', g: 'core', pl: 'Rolowanie kółkiem do brzucha', en: 'Ab wheel rollout', u: 'reps', m: ['abs'], h: ['lats', 'obliques'], r: [6, 12],
    o: { eq: ['bw', 'bb'] }, v: [['knees', 'z kolan', 'from the knees'], ['standing', 'ze stania', 'standing'], ['ball', 'na piłce', 'on a stability ball']],
    how: ['Plecy zaokrąglone, nie zapadaj się w lędźwiach.', 'Rounded back, do not sag in the lower back.'] },
  { id: 'pallof', akaEn: 'Pallof, anti-rotation press', aka: 'antyrotacja, Pallof', g: 'core', pl: 'Wyciskanie Pallofa (Pallof press)', en: 'Pallof press', m: ['obliques', 'abs'], r: [10, 12],
    o: { eq: ['cb', 'bd'], pos: ['stand', 'kneel'] }, how: ['Bokiem do wyciągu, wypchnij przed siebie, pauza 2 s, nie daj się obrócić.', 'Side-on to the cable, press out, hold 2 s, do not rotate.'] },
  { id: 'woodchop', akaEn: 'woodchoppers, cable chop', aka: 'drwal, woodchop', g: 'core', pl: 'Drwal (woodchop)', en: 'Woodchop', m: ['obliques'], h: ['abs'], r: [10, 15],
    o: { eq: ['cb', 'bd'] }, v: [['highlow', 'z góry na dół', 'high to low'], ['lowhigh', 'z dołu do góry', 'low to high']],
    how: ['Obrót z tułowia, ręce prawie proste.', 'Rotate from the torso, arms almost straight.'] },
  { id: 'russian-twist', akaEn: 'Russian twists', aka: 'skręty rosyjskie', g: 'core', pl: 'Rosyjskie skręty', en: 'Russian twist', u: 'reps', m: ['obliques'], h: ['abs'], r: [10, 20],
    o: { eq: ['bw', 'pl', 'db'] }, uq: { pl: 'kg', db: 'kg' }, how: ['Siedząc, stopy w górze, skręcaj tułów na boki.', 'Seated, feet up, rotate the torso side to side.'] },
  { id: 'side-bend', akaEn: 'side bends', aka: 'skłony w bok', g: 'core', pl: 'Skłony boczne', en: 'Side bend', m: ['obliques'], r: [12, 15],
    o: { eq: ['db', 'cb', 'kb'] }, how: ['Ciężar w jednej ręce, skłon w bok i powrót.', 'Weight in one hand, bend to the side and back.'] },
  // ---------- fourth round ----------
  { id: 'cuban-press', akaEn: 'Cuban rotation', aka: 'kubańskie', g: 'shoulders', pl: 'Wyciskanie kubańskie (Cuban press)', en: 'Cuban press', m: ['shoulders', 'reardelts'], h: ['traps', 'upperback'], r: [8, 12],
    o: { eq: ['db', 'bb', 'ez'] }, how: ['Podciągnij łokcie do barków, obróć przedramiona w górę i wyciśnij nad głowę. Lekko.', 'Raise the elbows to shoulder height, rotate the forearms up, press overhead. Light weight.'] },
  { id: 'wall-sit', akaEn: 'wall sit, static squat', aka: 'krzesełko, siad przy ścianie', g: 'quads', pl: 'Krzesełko przy ścianie (wall sit)', en: 'Wall sit', u: 's', m: ['quads'], h: ['glutes'], r: [30, 90],
    o: { eq: ['bw', 'pl', 'db'] }, how: ['Plecy przy ścianie, uda poziomo, trzymaj.', 'Back against the wall, thighs level, hold.'] },
  { id: 'jumps', akaEn: 'box jumps, jump squats, broad jumps, plyos', aka: 'skoki na skrzynię, wyskoki, box jump', g: 'full', pl: 'Skoki (plyometria)', en: 'Jumps (plyometrics)', u: 'reps', m: ['quads', 'glutes'], h: ['calves', 'hamstrings'], r: [5, 10],
    o: { eq: ['bw', 'db'] }, v: [['box', 'na skrzynię', 'box jump'], ['squat', 'z przysiadu', 'jump squat'], ['broad', 'w dal', 'broad jump'], ['lunge', 'wykroczne', 'jumping lunge']],
    how: ['Wybuchowo w górę, miękkie lądowanie na ugiętych nogach.', 'Explode up, land softly on bent legs.'] },
  { id: 'forearm-rotation', akaEn: 'pronation/supination, wrist rotations', aka: 'rotacje nadgarstka, pronacja, supinacja', g: 'forearms', pl: 'Obroty przedramienia (pronacja i supinacja)', en: 'Forearm rotation', m: ['forearms'], r: [12, 20],
    o: { eq: ['db', 'bd'] }, v: [['both', 'w obie strony', 'both ways'], ['pron', 'do środka (pronacja)', 'pronation'], ['sup', 'na zewnątrz (supinacja)', 'supination']],
    how: ['Przedramię oparte, trzymaj hantel z jednej strony i obracaj nadgarstek.', 'Forearm supported, hold a dumbbell by one end and rotate the wrist.'] },
  { id: 'gripper', akaEn: 'grippers, hand grip, CoC', aka: 'ściskacz, gripper', g: 'forearms', pl: 'Zaciskanie ściskacza (gripper)', en: 'Hand gripper', u: 'reps', m: ['forearms'], r: [10, 20],
    o: { eq: ['bw'] }, how: ['Zamknij ściskacz do końca, pauza, powoli puść.', 'Close the gripper fully, pause, release slowly.'] },
  { id: 'tibialis-raise', akaEn: 'tib raises, tib bar', aka: 'piszczele, tib raise', g: 'calves', pl: 'Unoszenie palców stóp (tibialis raise)', en: 'Tibialis raise', u: 'reps', m: ['calves'], r: [15, 25],
    o: { eq: ['bw', 'pl', 'mc', 'bd'] }, uq: { pl: 'kg', mc: 'kg' }, how: ['Plecy przy ścianie, pięty na ziemi, unoś palce stóp jak najwyżej.', 'Back against the wall, heels down, lift the toes as high as you can.'] },
  // ---------- core, third round ----------
  { id: 'knee-tuck', akaEn: 'knee tucks, jackknife on ball, TRX pike', g: 'core', aka: 'przyciąganie kolan do klatki, podciąganie kolan', pl: 'Przyciąganie kolan do klatki', en: 'Knee tuck', u: 'reps', m: ['abs'], h: ['obliques'], r: [10, 20],
    o: { eq: ['bw', 'db'] }, uq: { db: 'kg' },
    v: [['bench', 'siedząc na ławce', 'seated on a bench'], ['ball', 'w podporze na piłce', 'on a stability ball'], ['trx', 'w podporze na taśmach', 'on suspension straps'], ['pike', 'pike (proste nogi)', 'pike']],
    how: ['Podwiń miednicę, kolana do klatki, powoli wracaj.', 'Curl the pelvis, knees to the chest, return slowly.'] },
  { id: 'flutter', akaEn: 'flutter kicks, scissor kicks', g: 'core', aka: 'nożyce, scissors, flutter kicks', pl: 'Nożyce', en: 'Flutter kicks', u: 'reps', m: ['abs'], r: [20, 40],
    o: { eq: ['bw'] }, v: [['vert', 'pionowe', 'vertical'], ['horiz', 'poziome', 'horizontal (scissors)']],
    how: ['Leżąc, lędźwia przy podłodze, naprzemienne ruchy prostych nóg nisko nad ziemią.', 'Lying, lower back down, alternate straight legs low above the floor.'] },
  { id: 'wipers', only: { 'eq:db': { pos: ['lying'] } }, akaEn: 'windshield wipers', g: 'core', aka: 'wycieraczki, windshield wipers', pl: 'Wycieraczki', en: 'Windshield wipers', u: 'reps', m: ['obliques'], h: ['abs'], r: [8, 16],
    o: { eq: ['bw', 'db'], pos: ['lying', 'hang'] }, uq: { db: 'kg' }, v: [['bent', 'kolana zgięte', 'bent knees'], ['straight', 'nogi proste', 'straight legs']],
    how: ['Nogi w górze, opuszczaj je na boki bez odrywania łopatek.', 'Legs up, lower them side to side without lifting the shoulder blades.'] },
  { id: 'dragon-flag', akaEn: 'dragon flags', g: 'core', aka: 'flaga, Bruce Lee', pl: 'Flaga smoka (dragon flag)', en: 'Dragon flag', u: 'reps', m: ['abs'], h: ['obliques', 'lats'], r: [3, 8],
    o: { eq: ['bw'] }, v: [['full', 'pełna', 'full'], ['tuck', 'z ugiętymi nogami', 'tucked']],
    how: ['Trzymając ławkę za głową, opuszczaj sztywne ciało oparte tylko na łopatkach.', 'Holding the bench behind your head, lower a rigid body resting only on the shoulder blades.'] },
  { id: 'l-sit', akaEn: 'L-sit', g: 'core', aka: 'L-sit, siad prosty w podporze', pl: 'Siad w podporze (L-sit)', en: 'L-sit', u: 's', m: ['abs'], h: ['triceps', 'shoulders', 'quads'], r: [10, 30],
    o: { eq: ['bw'] }, v: [['floor', 'na podłodze', 'on the floor'], ['bars', 'na poręczach', 'on parallel bars'], ['hang', 'w zwisie', 'hanging']],
    how: ['Proste nogi w poziomie, barki w dół, trzymaj.', 'Straight legs level, shoulders down, hold.'] },
  { id: 'mountain-climber', akaEn: 'climbers', g: 'core', aka: 'wspinaczka, mountain climbers', pl: 'Wspinaczka (mountain climbers)', en: 'Mountain climbers', u: 'reps', m: ['abs'], h: ['obliques', 'shoulders', 'quads'], r: [20, 40],
    o: { eq: ['bw'] }, v: [['straight', 'prosto', 'straight'], ['cross', 'kolano do przeciwnego łokcia', 'cross-body', { m: ['obliques'] }]],
    how: ['W podporze jak do pompki szybko przyciągaj kolana na zmianę.', 'In a push-up position drive the knees in, alternating fast.'] },
  { id: 'heel-touch', akaEn: 'heel taps, alternating heel touches', g: 'core', aka: 'dotykanie pięt, heel taps', pl: 'Dotykanie pięt', en: 'Heel touches', u: 'reps', m: ['obliques'], h: ['abs'], r: [20, 40],
    o: { eq: ['bw'] }, how: ['Łopatki lekko w górze, sięgaj dłonią na zmianę do pięt.', 'Shoulder blades slightly up, reach to each heel in turn.'] },
  { id: 'torso-rotation', akaEn: 'rotary torso, ab twist machine', g: 'core', aka: 'maszyna do skrętów, rotary torso', pl: 'Skręty tułowia na maszynie', en: 'Rotary torso machine', m: ['obliques'], h: ['abs'], r: [10, 15],
    o: { eq: ['mc'] }, how: ['Biodra nieruchome, obracaj tułów powoli w obie strony.', 'Still hips, rotate the torso slowly both ways.'] },
  { id: 'stir-pot', akaEn: 'stir the pot', g: 'core', aka: 'stir the pot', pl: 'Mieszanie w garnku (stir the pot)', en: 'Stir the pot', u: 'reps', m: ['abs', 'obliques'], h: ['shoulders'], r: [6, 12],
    o: { eq: ['bw'] }, how: ['Deska z łokciami na piłce, zataczaj nimi małe kółka.', 'Plank with the elbows on a ball, draw small circles.'] },
  { id: 'copenhagen', akaEn: 'Copenhagen, Copenhagen adduction', g: 'core', aka: 'kopenhaska', pl: 'Deska kopenhaska (Copenhagen plank)', en: 'Copenhagen plank', u: 's', m: ['adductors', 'obliques'], h: ['abs'], r: [15, 40],
    o: { eq: ['bw'] }, v: [['knee', 'kolano na ławce', 'knee on the bench'], ['foot', 'stopa na ławce', 'foot on the bench']],
    how: ['Deska bokiem, górna noga na ławce, dolna w powietrzu.', 'Side plank, top leg on a bench, bottom leg in the air.'] },
  { id: 'bird-dog', akaEn: 'bird dogs', g: 'core', aka: 'bird dog, pies myśliwski', pl: 'Wyprost ręki i nogi w klęku (bird dog)', en: 'Bird dog', u: 'reps', m: ['lowerback'], h: ['glutes', 'abs'], r: [8, 15],
    o: { eq: ['bw', 'bd'] }, how: ['W klęku podpartym prostuj przeciwną rękę i nogę, plecy nieruchome.', 'On all fours extend the opposite arm and leg, back still.'] },
  { id: 'superman', akaEn: 'supermans, back raises on the floor', g: 'core', aka: 'superman, łódka na brzuchu', pl: 'Unoszenie rąk i nóg leżąc przodem (superman)', en: 'Superman', u: 'reps', m: ['lowerback'], h: ['glutes', 'upperback'], r: [10, 20],
    o: { eq: ['bw'] }, how: ['Leżąc przodem, unieś ręce i nogi, pauza na górze.', 'Lying face down, lift the arms and legs, pause at the top.'] },
  { id: 'bear-crawl', akaEn: 'bear crawls, bear plank', g: 'core', aka: 'niedźwiedź, bear crawl', pl: 'Chód niedźwiedzia (bear crawl)', en: 'Bear crawl', u: 's', m: ['abs', 'shoulders'], h: ['quads', 'triceps'], r: [20, 45],
    o: { eq: ['bw'] }, v: [['crawl', 'chód', 'crawl'], ['hold', 'trzymanie kolan nad ziemią', 'hold']],
    how: ['W podporze, kolana tuż nad ziemią, idź małymi krokami.', 'On all fours, knees just off the floor, move in small steps.'] },
  { id: 'ball-slam', akaEn: 'med ball slams, slams', g: 'full', aka: 'slam, rzut piłką', pl: 'Rzuty piłką o ziemię (slam)', en: 'Medicine ball slam', m: ['abs', 'lats', 'shoulders'], h: ['triceps', 'glutes'], r: [8, 15],
    o: { eq: ['pl'] }, how: ['Piłka nad głową, rzuć ją mocno w ziemię zginając tułów.', 'Ball overhead, slam it down hard by flexing the trunk.'] },
  { id: 'wall-ball', akaEn: 'wall balls, wall ball shots', g: 'full', aka: 'wall ball', pl: 'Przysiad z wyrzutem piłki (wall ball)', en: 'Wall ball', m: ['quads', 'shoulders', 'glutes'], h: ['triceps', 'abs'], r: [10, 20],
    o: { eq: ['pl'] }, how: ['Przysiad z piłką przy klatce i wyrzut do celu na ścianie.', 'Squat with the ball at the chest and throw it to the wall target.'] },
  // ---------- more (second research round) ----------
  { id: 'svend-press', akaEn: 'plate squeeze press', aka: 'Svend', g: 'chest', pl: 'Wyciskanie talerza ściśniętego (Svend press)', en: 'Svend press', m: ['chest'], h: ['shoulders'], r: [10, 15],
    o: { eq: ['pl', 'db'] }, how: ['Ściskaj talerz dłońmi przed klatką i wypychaj go prosto przed siebie.', 'Squeeze the plate between the palms and press it straight out.'] },
  { id: 'muscle-up', akaEn: 'muscle-ups, MU', aka: 'wyjście siłowe', g: 'back', pl: 'Wyjście siłowe (muscle-up)', en: 'Muscle-up', u: 'reps', m: ['lats', 'triceps'], h: ['chest', 'biceps', 'shoulders', 'abs'], r: [1, 6],
    o: { eq: ['bw', 'pl'] }, uq: { pl: 'kg' }, v: [['bar', 'na drążku', 'bar'], ['rings', 'na kółkach', 'rings']],
    how: ['Mocne podciągnięcie do pasa, przerzuć łokcie nad drążek i wypchnij się do góry.', 'Explosive pull to the waist, turn the elbows over the bar, press to lockout.'] },
  { id: 'landmine-row', akaEn: 'landmine row, Meadows row', aka: 'wiosłowanie Meadowsa, wiosło z miną', g: 'back', pl: 'Wiosłowanie Meadowsa (landmine)', en: 'Meadows row', m: ['lats', 'upperback'], h: ['biceps', 'reardelts', 'forearms'], r: [8, 12],
    o: { eq: ['bb'], side: ['one', 'both'] }, how: ['Bokiem do końca sztangi, chwyt za końcówkę, ciągnij łokieć wysoko do tyłu.', 'Side-on to the bar end, grip the sleeve, drive the elbow up and back.'] },
  { id: 'renegade-row', akaEn: 'renegade rows', aka: 'renegade', g: 'back', pl: 'Wiosłowanie w podporze (renegade row)', en: 'Renegade row', m: ['lats', 'upperback'], h: ['abs', 'obliques', 'triceps'], r: [6, 12],
    o: { eq: ['db', 'kb'] }, how: ['W podporze na hantlach, przyciągnij jedną do biodra bez obracania bioder.', 'Plank on the dumbbells, row one to the hip without twisting.'] },
  { id: 'scap-pull-up', akaEn: 'scap pulls', aka: 'łopatki na drążku', g: 'back', pl: 'Podciąganie łopatek w zwisie', en: 'Scapular pull-up', u: 'reps', m: ['traps', 'upperback'], h: ['lats'], r: [8, 15],
    o: { eq: ['bw'] }, how: ['Ręce proste, unoś ciało tylko ściągając łopatki w dół.', 'Arms straight, lift the body only by pulling the shoulder blades down.'] },
  { id: 'rear-delt-row', only: { 'eq:cb': { pos: ['stand', 'seat'] }, 'eq:db': { pos: ['chest'] }, 'eq:mc': { pos: ['seat'] } }, akaEn: 'rear delt row, face-away row', aka: 'wiosło na tył barków', g: 'back', pl: 'Wiosłowanie na tył barków', en: 'Rear delt row', m: ['reardelts'], h: ['upperback', 'biceps'], r: [10, 15],
    o: { eq: ['cb', 'db', 'mc'], pos: ['stand', 'seat', 'chest'] }, how: ['Łokcie szeroko na wysokości barków, ciągnij do tyłu.', 'Elbows wide at shoulder height, pull back.'] },
  { id: 'push-press', akaEn: 'push press', aka: 'push press, wybicie', g: 'shoulders', pl: 'Wyciskanie z wybicia (push press)', en: 'Push press', m: ['shoulders'], h: ['triceps', 'quads', 'glutes', 'traps'], r: [3, 6],
    o: { eq: ['bb', 'db', 'kb'], side: ['both', 'one'] }, how: ['Krótkie ugięcie kolan i mocne wybicie, ręce kończą ruch nad głową.', 'Short dip of the knees, drive up, arms finish overhead.'] },
  { id: 'y-raise', only: { 'eq:cb': { pos: ['stand'] }, 'eq:bd': { pos: ['stand'] } }, akaEn: 'Y-raise, trap raise', aka: 'Y-raise', g: 'shoulders', pl: 'Unoszenie ramion w Y', en: 'Y-raise', m: ['shoulders', 'traps'], h: ['reardelts', 'upperback'], r: [10, 15],
    o: { eq: ['db', 'cb', 'pl', 'bd'], pos: ['chest', 'stand'] }, how: ['Ramiona w kształt litery Y, kciuki w górę, unoś do linii uszu.', 'Arms in a Y, thumbs up, raise to ear level.'] },
  { id: 'ext-rotation', only: { 'eq:cb': { pos: ['stand'] }, 'eq:bd': { pos: ['stand'] }, 'eq:db': { pos: ['lying'] } }, akaEn: 'rotator cuff, ER, cable external rotation', aka: 'rotatory, rotacja zewnętrzna', g: 'shoulders', pl: 'Rotacja zewnętrzna ramienia', en: 'External rotation', m: ['reardelts'], h: ['upperback'], r: [12, 20],
    o: { eq: ['cb', 'db', 'bd'], pos: ['stand', 'lying'], side: ['one', 'both'] }, k: 'stożek rotatorów rotator cuff',
    how: ['Łokieć przy boku zgięty 90°, obracaj przedramię na zewnątrz, lekki ciężar.', 'Elbow at the side bent 90°, rotate the forearm out, light weight.'] },
  { id: 'bench-dip', akaEn: 'bench dips, chair dips', aka: 'dipy na ławce, pompki tyłem', g: 'triceps', pl: 'Pompki w podporze tyłem', en: 'Bench dip', u: 'reps', m: ['triceps'], h: ['chest', 'shoulders'], r: [8, 15],
    o: { eq: ['bw', 'pl'] }, uq: { pl: 'kg' }, how: ['Dłonie na ławce za plecami, zejdź do 90° w łokciu.', 'Hands on a bench behind you, lower to 90° at the elbow.'] },
  { id: 'tate-press', akaEn: 'Tate press, elbows-out extension', aka: 'Tate', g: 'triceps', pl: 'Wyciskanie Tate', en: 'Tate press', m: ['triceps'], r: [10, 12],
    o: { eq: ['db'], angle: ['flat', 'incline'] }, how: ['Hantle nad klatką, łokcie na boki, opuszczaj główki hantli do klatki.', 'Dumbbells over the chest, elbows out, lower the heads to the chest.'] },
  { id: 'wrist-roller', akaEn: 'wrist roller', aka: 'zwijanie ciężarka, wałek do nadgarstków', g: 'forearms', pl: 'Zwijanie linki z ciężarem', en: 'Wrist roller', m: ['forearms'], r: [2, 5],
    o: { eq: ['pl'] }, how: ['Ręce wyprostowane przed sobą, nawijaj linkę obracając nadgarstki.', 'Arms straight in front, wind the rope by turning the wrists.'] },
  { id: 'plate-pinch', akaEn: 'pinch grip, plate pinches', aka: 'szczypanie talerzy', g: 'forearms', pl: 'Trzymanie talerzy w palcach', en: 'Plate pinch', u: 's', m: ['forearms'], r: [20, 45],
    o: { eq: ['pl'] }, how: ['Ściśnij dwa talerze gładką stroną na zewnątrz i trzymaj.', 'Pinch two plates smooth side out and hold.'] },
  { id: 'goblet-squat', akaEn: 'goblet squat, DB squat, KB squat', aka: 'goblet, przysiad z kettlebell, sumo z hantlą', g: 'quads', pl: 'Przysiad z hantlami lub kettlebell', en: 'Dumbbell or kettlebell squat', m: ['quads', 'glutes'], h: ['adductors', 'abs'], r: [8, 15],
    o: { eq: ['db', 'kb'], stance: ['normal', 'wide'] }, x: { 'stance:wide': { m: ['adductors'] } }, v: [['goblet', 'goblet (ciężar przy klatce)', 'goblet'], ['sides', 'hantle po bokach', 'dumbbells at the sides']],
    how: ['Ciężar przy klatce, łokcie między kolanami na dole.', 'Weight at the chest, elbows between the knees at the bottom.'] },
  { id: 'belt-squat', akaEn: 'belt squat', aka: 'belt squat, przysiad z pasem', g: 'quads', pl: 'Przysiad z pasem (belt squat)', en: 'Belt squat', m: ['quads', 'glutes'], h: ['adductors'], r: [8, 12],
    o: { eq: ['mc', 'pl'] }, how: ['Ciężar na pasie przy biodrach – plecy nie są obciążone.', 'Load on a hip belt – the spine is not loaded.'] },
  { id: 'pistol', akaEn: 'pistols, single-leg squat', aka: 'pistolet', g: 'quads', pl: 'Przysiad na jednej nodze (pistolet)', en: 'Pistol squat', u: 'reps', m: ['quads', 'glutes'], h: ['abs'], r: [3, 10],
    o: { eq: ['bw', 'db', 'kb'] }, uq: { db: 'kg', kb: 'kg' }, v: [['free', 'swobodnie', 'free'], ['box', 'na ławkę', 'to a box']],
    how: ['Druga noga prosto przed sobą, zejdź jak najniżej z kontrolą.', 'Other leg straight in front, lower as deep as you control.'] },
  { id: 'cossack', akaEn: 'Cossacks, side squat', aka: 'kozacki', g: 'quads', pl: 'Przysiad kozacki', en: 'Cossack squat', u: 'reps', m: ['quads', 'adductors'], h: ['glutes'], r: [6, 12],
    o: { eq: ['bw', 'db', 'kb'] }, uq: { db: 'kg', kb: 'kg' }, how: ['Szeroki rozkrok, schodź na jedną nogę, druga prosta z palcami w górę.', 'Wide stance, sit onto one leg, the other straight with toes up.'] },
  { id: 'reverse-nordic', akaEn: 'reverse Nordics', aka: 'odwrotne nordyki', g: 'quads', pl: 'Odwrotne uginanie nordyckie', en: 'Reverse Nordic', u: 'reps', m: ['quads'], r: [6, 12],
    o: { eq: ['bw', 'pl', 'bd'] }, uq: { pl: 'kg' }, how: ['Klęcząc, odchylaj prosty tułów do tyłu i wróć siłą ud.', 'Kneeling, lean the straight torso back and return with the thighs.'] },
  { id: 'glute-ham', akaEn: 'GHR, GHD raise', aka: 'GHR, GHD', g: 'post', pl: 'Uginanie na GHD (glute-ham raise)', en: 'Glute-ham raise', u: 'reps', m: ['hamstrings'], h: ['glutes', 'calves'], r: [5, 10],
    o: { eq: ['bw', 'pl'] }, uq: { pl: 'kg' }, how: ['Na maszynie GHD: z poziomu podnieś tułów uginając kolana.', 'On a GHD: from horizontal, raise the torso by bending the knees.'] },
  { id: 'reverse-hyper', akaEn: 'reverse hypers', aka: 'reverse hyper', g: 'post', pl: 'Odwrotne wyprosty (reverse hyper)', en: 'Reverse hyperextension', m: ['glutes', 'hamstrings'], h: ['lowerback'], r: [10, 15],
    o: { eq: ['mc', 'bw', 'bd'] }, uq: { bw: 'reps' }, how: ['Leżąc przodem na ławce, unoś proste nogi do linii tułowia.', 'Lying face down on a bench, raise straight legs to body line.'] },
  { id: 'sit-up', akaEn: 'sit-ups, decline sit-ups', aka: 'brzuszki pełne, siady', g: 'core', pl: 'Brzuszki', en: 'Sit-up', u: 'reps', m: ['abs'], h: ['obliques'], r: [10, 20],
    o: { eq: ['bw', 'pl', 'db'], pos: ['lying', 'incline'] }, uq: { pl: 'kg', db: 'kg' }, how: ['Unoś cały tułów do siadu, stopy zablokowane.', 'Raise the whole torso to sitting, feet anchored.'] },
  { id: 'reverse-crunch', only: { 'eq:cb': { pos: ['lying'] } }, akaEn: 'reverse crunches, butt-ups', aka: 'rewersy, odwrotne brzuszki, świeca', g: 'core', pl: 'Odwrotne spięcia brzucha', en: 'Reverse crunch', u: 'reps', m: ['abs'], h: ['obliques'], r: [10, 20],
    o: { eq: ['bw', 'cb'], pos: ['lying', 'incline'] }, uq: { cb: 'kg' }, v: [['classic', 'klasycznie', 'classic'], ['vertical', 'świeca (biodra w górę)', 'vertical hip raise']], how: ['Leżąc, podwijaj miednicę i kolana do klatki.', 'Lying, roll the pelvis and knees towards the chest.'] },
  { id: 'v-up', akaEn: 'V-ups, jackknives', aka: 'scyzoryk, scyzoryki', g: 'core', pl: 'Scyzoryki (V-up)', en: 'V-up', u: 'reps', m: ['abs'], r: [8, 15],
    o: { eq: ['bw', 'db', 'pl'] }, uq: { db: 'kg', pl: 'kg' }, how: ['Jednocześnie unieś proste nogi i tułów, dłonie do stóp.', 'Lift straight legs and torso together, hands to feet.'] },
  { id: 'bicycle', akaEn: 'bicycles, bicycle crunches', aka: 'rowerek', g: 'core', pl: 'Rowerek', en: 'Bicycle crunch', u: 'reps', m: ['obliques', 'abs'], r: [10, 20],
    o: { eq: ['bw'] }, how: ['Łokieć do przeciwnego kolana, druga noga prostuje się.', 'Elbow to the opposite knee, the other leg straightens.'] },
  { id: 'dead-bug', akaEn: 'dead bugs', aka: 'robak', g: 'core', pl: 'Martwy robak (dead bug)', en: 'Dead bug', u: 'reps', m: ['abs'], h: ['obliques'], r: [8, 15],
    o: { eq: ['bw', 'db', 'bd'] }, how: ['Lędźwia przy podłodze, prostuj przeciwną rękę i nogę.', 'Lower back on the floor, extend the opposite arm and leg.'] },
  { id: 'hollow', akaEn: 'hollow body, hollow hold, hollow rocks', aka: 'łódka, hollow', g: 'core', pl: 'Łódka (hollow hold)', en: 'Hollow hold', u: 's', m: ['abs'], r: [20, 45],
    o: { eq: ['bw', 'pl'] }, v: [['hold', 'trzymanie', 'hold'], ['rock', 'kołysanie (hollow rock)', 'hollow rock']], how: ['Lędźwia przy podłodze, nogi i ramiona nisko nad ziemią.', 'Lower back down, legs and arms low above the floor.'] },
  { id: 'landmine-rot', akaEn: 'landmine 180s, landmine twist', aka: 'obroty miny, landmine 180', g: 'core', pl: 'Obroty landmine', en: 'Landmine rotation', m: ['obliques'], h: ['abs', 'shoulders'], r: [8, 12],
    o: { eq: ['bb'] }, how: ['Ręce proste nad głową, prowadź koniec sztangi łukiem od biodra do biodra.', 'Arms straight, move the bar end in an arc hip to hip.'] },
  { id: 'oblique-crunch', only: { 'eq:bw': { pos: ['lying', 'sidelying', 'deg45', 'roman'] }, 'eq:cb': { pos: ['stand'] }, 'eq:db': { pos: ['roman'] }, 'eq:pl': { pos: ['roman'] } }, akaEn: 'oblique crunches, side crunches, side jackknife, Roman chair side bend', aka: 'skośne, scyzoryk bokiem (leżąc bokiem), skłony bokiem na ławce rzymskiej', g: 'core', pl: 'Spięcia skośne', en: 'Oblique crunch', u: 'reps', m: ['obliques'], h: ['abs'], r: [10, 20],
    o: { eq: ['bw', 'cb', 'db', 'pl'], pos: ['lying', 'sidelying', 'stand', 'deg45', 'roman'] }, uq: { cb: 'kg', db: 'kg', pl: 'kg' }, how: ['Skręt i spięcie w bok, bez szarpania szyją. Na ławce rzymskiej: bokiem, biodro na poduszce, ciężar w dolnej ręce – opuść tułów w dół i unieś bokiem w górę.', 'Twist and crunch to the side, no neck pulling. On a Roman chair: sideways, hip on the pad, weight in the lower hand – lower the torso and lift it sideways.'] },
  { id: 'power-clean', akaEn: 'cleans, hang clean', aka: 'zarzut', g: 'full', pl: 'Zarzut siłowy (power clean)', en: 'Power clean', m: ['glutes', 'hamstrings', 'quads', 'traps'], h: ['upperback', 'shoulders', 'lowerback', 'calves', 'forearms'], r: [2, 5],
    o: { eq: ['bb', 'db', 'kb'] }, v: [['floor', 'z podłogi', 'from the floor'], ['hang', 'ze zwisu', 'hang']],
    how: ['Wybuchowy wyprost bioder, szybko podbij łokcie i przyjmij sztangę na barki.', 'Explosive hip extension, fast elbows, catch on the shoulders.'] },
  { id: 'snatch', akaEn: 'snatch, power snatch', aka: 'rwanie', g: 'full', pl: 'Rwanie', en: 'Snatch', m: ['glutes', 'hamstrings', 'quads', 'shoulders', 'traps'], h: ['upperback', 'lowerback', 'triceps', 'abs'], r: [1, 3],
    o: { eq: ['bb', 'db', 'kb'] }, v: [['power', 'siłowe', 'power'], ['full', 'pełne', 'full'], ['hang', 'ze zwisu', 'hang']],
    how: ['Jednym ruchem z podłogi nad głowę; sztanga szerokim chwytem.', 'From the floor to overhead in one move; barbell with a wide grip.'] },
  { id: 'clean-jerk', akaEn: 'C&J, clean and jerk', aka: 'podrzut', g: 'full', pl: 'Podrzut', en: 'Clean and jerk', m: ['glutes', 'quads', 'shoulders', 'hamstrings'], h: ['traps', 'triceps', 'upperback', 'abs'], r: [1, 3],
    o: { eq: ['bb', 'kb'] }, how: ['Zarzut na klatkę, potem wybicie nogami i wyrzut nad głowę.', 'Clean to the shoulders, then dip, drive and jerk overhead.'] },
  { id: 'thruster', akaEn: 'thrusters', aka: 'thrustery', g: 'full', pl: 'Przysiad z wyciśnięciem (thruster)', en: 'Thruster', m: ['quads', 'shoulders', 'glutes'], h: ['triceps', 'abs'], r: [6, 12],
    o: { eq: ['bb', 'db', 'kb'] }, how: ['Przysiad przedni i z wyjścia od razu wyciśnij nad głowę.', 'Front squat and press overhead straight out of the bottom.'] },
  { id: 'tgu', akaEn: 'TGU, get-ups', aka: 'TGU, get-up', g: 'full', pl: 'Tureckie wstawanie (Turkish get-up)', en: 'Turkish get-up', m: ['shoulders', 'abs', 'obliques'], h: ['glutes', 'triceps', 'quads'], r: [1, 5],
    o: { eq: ['kb', 'db'] }, how: ['Ciężar cały czas nad głową, krok po kroku z leżenia do stania i z powrotem.', 'Weight always overhead, step by step from lying to standing and back.'] },
  { id: 'sled-push', akaEn: 'sled, prowler push', aka: 'sanie, prowler', g: 'full', pl: 'Pchanie i ciągnięcie sań', en: 'Sled push and pull', u: 's', m: ['quads', 'glutes', 'calves'], h: ['hamstrings', 'shoulders', 'triceps'], r: [15, 40],
    o: { eq: ['mc'] }, v: [['push', 'pchanie', 'push'], ['pull', 'ciągnięcie tyłem', 'backward drag']], how: ['Tułów pochylony, krótkie mocne kroki.', 'Lean forward, short powerful steps.'] },
  { id: 'burpee', akaEn: 'burpees', aka: 'burpees, padnij-powstań', g: 'full', pl: 'Padnij-powstań (burpees)', en: 'Burpee', u: 'reps', m: ['quads', 'chest'], h: ['shoulders', 'triceps', 'glutes', 'abs'], r: [10, 20],
    o: { eq: ['bw'] }, how: ['Przysiad, wyrzut nóg do podporu, pompka, powrót i wyskok.', 'Squat, kick back to a plank, push-up, back and jump.'] },
  { id: 'battle-ropes', akaEn: 'battle ropes, ropes', aka: 'liny', g: 'full', pl: 'Liny bojowe', en: 'Battle ropes', u: 's', m: ['shoulders'], h: ['forearms', 'abs', 'biceps'], r: [20, 40],
    o: { eq: ['bw'] }, how: ['Szybkie fale linami na zmianę, kolana lekko ugięte.', 'Fast alternating waves, soft knees.'] },
  { id: 'kb-snatch', akaEn: 'KB snatch', aka: 'rwanie kulą', g: 'full', pl: 'Rwanie kettlebell', en: 'Kettlebell snatch', m: ['glutes', 'hamstrings', 'shoulders'], h: ['traps', 'forearms', 'abs'], r: [5, 15],
    o: { eq: ['kb', 'db'] }, how: ['Swing jednorącz zakończony nad głową z prostą ręką.', 'One-arm swing finished overhead with a straight arm.'] },
]

// basic-plan exercises: the same choice returns the plan's own name, so its history continues
/** @type {Record<string, [string, Record<string, string>]>} */
export const ALIASES = {
  'Wyciskanie sztangi na ławce płaskiej': ['bench-press', { eq: 'bb', angle: 'flat', width: 'normal' }],
  'Wyciskanie hantli na ławce skośnej': ['bench-press', { eq: 'db', angle: 'incline', width: 'normal' }],
  'Wyciskanie na skosie na Smithie': ['bench-press', { eq: 'sm', angle: 'incline', width: 'normal' }],
  'Rozpiętki na bramie z dołu do góry': ['fly', { eq: 'cb', v: 'lowhigh' }],
  'Rozpiętki na maszynie (butterfly)': ['fly', { eq: 'mc' }],
  'Unoszenie hantli bokiem': ['lateral-raise', { eq: 'db', pos: 'stand', side: 'both' }],
  'Unoszenie ramienia bokiem na wyciągu': ['lateral-raise', { eq: 'cb', pos: 'stand', side: 'one' }],
  'Wyciskanie francuskie leżąc': ['skull-crusher', { eq: 'ez', angle: 'flat' }],
  'Prostowanie ramion na wyciągu nad głową': ['overhead-ext', { eq: 'cb', pos: 'stand', side: 'both', v: 'rope' }],
  'Wiosłowanie hantlem jednorącz z podparciem': ['db-row', { eq: 'db', pos: 'bench', side: 'one' }],
  'Wiosłowanie na wyciągu dolnym szerokim chwytem': ['cable-row', { eq: 'cb', grip: 'over', width: 'wide', side: 'both' }],
  'Ściąganie drążka szerokim chwytem': ['lat-pulldown', { eq: 'cb', grip: 'over', width: 'wide', side: 'both' }],
  'Face pull na wyciągu': ['face-pull', { eq: 'cb', pos: 'stand' }],
  'Uginanie ramion z hantlami na ławce skośnej': ['curl', { eq: 'db', pos: 'incline', grip: 'under', side: 'both' }],
  'Uginanie ramion z hantlami chwytem młotkowym': ['curl', { eq: 'db', pos: 'stand', grip: 'neutral', side: 'both' }],
  'Unoszenie nóg w podporze na poręczach': ['leg-raise', { eq: 'bw', pos: 'captain', v: 'bent' }],
  'Allahy – spięcia brzucha na wyciągu': ['crunch', { eq: 'cb', pos: 'kneel' }],
  'Przysiad Zerchera': ['squat', { eq: 'bb', stance: 'normal', v: 'zercher' }],
  'Martwy ciąg rumuński': ['rdl', { eq: 'bb', v: 'rdl' }],
  'Prostowanie nóg na maszynie': ['leg-extension', { eq: 'mc', side: 'both' }],
  'Uginanie nóg siedząc na maszynie': ['leg-curl', { eq: 'mc', pos: 'seat', side: 'both' }],
  'Wspięcia na palce stojąc': ['calf-raise', { eq: 'mc', pos: 'stand', side: 'both' }],
  'Wspięcia na palce siedząc': ['calf-raise', { eq: 'mc', pos: 'seat', side: 'both' }],
  'Pallof press na wyciągu': ['pallof', { eq: 'cb', pos: 'stand' }],
  'Wyciskanie sztangi siedząc z oparciem': ['ohp', { eq: 'bb', pos: 'seat', side: 'both' }],
  'Seal row – wiosłowanie leżąc na ławce': ['seal-row', { eq: 'bb' }],
  'Odwrotne rozpiętki na maszynie (reverse butterfly)': ['reverse-fly', { eq: 'mc' }],
  'Wiosłowanie sztangą T (T-bar)': ['tbar-row', { eq: 'tb', pos: 'bent', grip: 'neutral', width: 'close' }],
  'Podciąganie nachwytem (wspomagane)': ['pull-up', { eq: 'as', grip: 'over', width: 'normal' }],
}

export const byId = Object.fromEntries(BASES.map(b => [b.id, b]))
const label = (ax, k, en) => AXES[ax].v[k][en ? 1 : 0]

// values of an axis the rules (`only`) still allow for the choice so far; rule key 'axis:value' → { axis: [allowed] }
function allowed(b, ax, s) {
  let list = ax === 'v' ? (b.v || []).map(v => v[0]) : b.o[ax]
  for (const [k, rule] of Object.entries(b.only || {})) {
    const [rax, val] = k.split(':')
    if (rule[ax] && s[rax] === val) list = list.filter(x => rule[ax].includes(x))
  }
  return list
}
// the full choice (defaults for anything not picked, only allowed combinations) + what the picker shows
function resolve(b, sel = {}) {
  const s = {}, vals = {}, axes = []
  for (const ax of Object.keys(b.o)) {
    const list = allowed(b, ax, s)
    s[ax] = list.includes(sel[ax]) ? sel[ax] : list[0]
    if (list.length > 1 && (!b.when?.[ax] || b.when[ax].includes(s.eq))) { axes.push(ax); vals[ax] = list }
  }
  const vw = Array.isArray(b.vwhen) ? { eq: b.vwhen } : b.vwhen || {}
  const vlist = b.v && Object.entries(vw).every(([ax, l]) => l.includes(s[ax])) ? allowed(b, 'v', s) : []
  const variants = vlist.length > 1 ? b.v.filter(v => vlist.includes(v[0])) : null
  for (const ax of Object.keys(b.o)) if (b.o[ax].length > 1 && !axes.includes(ax)) delete s[ax]
  if (variants) s.v = variants.some(v => v[0] === sel.v) ? sel.v : variants[0][0]
  return { s, axes, vals, variants }
}
/** axes and values shown for a base with the current choice */
export function axesOf(b, sel = {}) { const { axes, vals, variants } = resolve(b, sel); return { axes, vals, variants } }
/** the full choice: defaults for anything not picked */
export function fullSel(b, sel = {}) { return resolve(b, sel).s }

const ALIAS_BY_SEL = new Map(Object.entries(ALIASES).map(([name, [id, sel]]) => [id + '|' + JSON.stringify(fullSel(byId[id], sel)), name]))

/** name, unit, muscles of a chosen combination */
export function compose(b, sel = {}) {
  const { s, axes, variants } = resolve(b, sel)
  const key = b.id + '|' + JSON.stringify(s)
  const parts = [], partsEn = []
  if (b.o.eq.length > 1) { parts.push(label('eq', s.eq)); partsEn.push(label('eq', s.eq, true)) }
  for (const ax of axes) if (ax !== 'eq' && s[ax] !== b.o[ax][0]) { parts.push(label(ax, s[ax])); partsEn.push(label(ax, s[ax], true)) }
  const vv = variants?.find(v => v[0] === s.v)
  if (vv && vv[0] !== b.v[0][0]) { parts.push(vv[1]); partsEn.push(vv[2]) }
  const name = ALIAS_BY_SEL.get(key) || (parts.length ? `${b.pl} – ${parts.join(', ')}` : b.pl)
  const nameEn = parts.length ? `${b.en} – ${partsEn.join(', ')}` : b.en
  let main = [...b.m], help = [...(b.h || [])]
  const effects = Object.entries(s).filter(([k]) => k !== 'v').map(([k, v]) => b.x?.[k + ':' + v]).concat(vv?.[3] ? [vv[3]] : [])
  for (const e of effects) {
    if (!e) continue
    for (const m of e.d || []) if (main.includes(m)) { main = main.filter(x => x !== m); if (!help.includes(m)) help.push(m) }
    for (const m of e.m || []) { help = help.filter(x => x !== m); if (!main.includes(m)) main.push(m) }
    for (const m of e.h || []) if (!main.includes(m) && !help.includes(m)) help.push(m)
  }
  if (!main.length) main = [help.shift()]
  let unit = b.uq?.[s.eq] || b.u || 'kg'
  if (unit === 'kg' && (s.eq === 'bd' || s.eq === 'bw')) unit = 'reps' // a band or bodyweight has no kg to log
  return { id: key, name, nameEn, unit, assisted: !!b.assisted?.includes(s.eq), main, help, sel: s, range: b.r || [8, 12] }
}

/** the base + choice behind a name (plan aliases, or a composed "Base – a, b" name) */
export function byName(name) {
  if (ALIASES[name]) { const [id, sel] = ALIASES[name]; return { base: byId[id], sel: fullSel(byId[id], sel) } }
  const [head, tail] = String(name).split(' – ')
  const b = BASES.find(x => x.pl === head)
  if (!b) return null
  const sel = {}
  for (const p of (tail || '').split(', ').filter(Boolean)) {
    for (const ax of Object.keys(b.o)) { const k = b.o[ax].find(v => label(ax, v) === p); if (k) sel[ax] = k }
    const v = b.v?.find(x => x[1] === p); if (v) sel.v = v[0]
  }
  const c = compose(b, sel)
  return c.name === name ? { base: b, sel: c.sel } : null
}

/** Polish → English phrases of the catalogue, for the English UI */
export function catalogEN() {
  const out = {}
  for (const g of GROUPS) out[g.pl] = g.en
  for (const ax of Object.values(AXES)) { out[ax.pl] = ax.en; for (const [pl, en] of Object.values(ax.v)) out[pl] = en }
  for (const b of BASES) {
    out[b.pl] = b.en
    if (b.how) out[b.how[0]] = b.how[1]
    for (const v of b.v || []) out[v[1]] = v[2]
  }
  return out
}

/** English names of the catalogue (every option one at a time, letters only) → the Polish name: for imports from other apps */
export function enIndex() {
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '')
  const out = {}
  for (const b of BASES) {
    const add = sel => { const c = compose(b, fullSel(b, sel)); if (!out[norm(c.nameEn)]) out[norm(c.nameEn)] = c.name }
    add({})
    for (const eq of b.o.eq || []) {
      add({ eq })
      for (const ax of Object.keys(b.o)) if (ax !== 'eq') for (const v of b.o[ax]) add({ eq, [ax]: v })
      for (const v of b.v || []) add({ eq, v: v[0] })
    }
    for (const en of String(b.akaEn || '').split(',').map(x => x.trim()).filter(Boolean)) if (!out[norm(en)]) out[norm(en)] = compose(b, fullSel(b)).name
  }
  return out
}
