// Privacy policy, terms and the health note – shown in the app (/legal/:doc). Written for how the app works today:
// everything on the phone, optional backup in the user's own GitHub, optional Strava. Update when the database comes.
export const LEGAL_DATE = '2026-11-26'
export const CONTACT = 'https://github.com/Sorrger/gym/issues'

const pl = {
  privacy: {
    title: 'Polityka prywatności',
    parts: [
      ['Najważniejsze', 'Inch Up nie ma własnego serwera. Twoje treningi, waga, obwody, plan i ustawienia są zapisane tylko w pamięci telefonu (w przeglądarce). Nie wysyłamy ich nikomu, nie mamy reklam ani analityki.'],
      ['Jakie dane zapisuje apka', 'Treningi (ćwiczenia, serie, ciężary, powtórzenia, notatki), plan treningowy, nick, ustawienia, a jeśli z nich korzystasz: waga ciała i obwody. Waga, obwody i tętno to dane o zdrowiu – zapisują się tylko wtedy, gdy sam je wpiszesz lub połączysz Stravę.'],
      ['Kopia na GitHubie (opcjonalnie)', 'Jeśli wkleisz swój token GitHuba, apka zapisuje kopię w ukrytym (secret) Giście na Twoim koncie GitHub. Dane trafiają wtedy do GitHuba (GitHub, Inc.) na zasadach jego polityki prywatności. Token zostaje tylko w telefonie. Możesz to wyłączyć w Ustawienia → Kopia zapasowa.'],
      ['Strava (opcjonalnie)', 'Po połączeniu Stravy apka pobiera z Twoich aktywności siłowych tętno, kalorie i czas, a do opisu aktywności dopisuje listę ćwiczeń. Dzieje się to przez Twoją kopię na GitHubie. Połączenie możesz cofnąć w ustawieniach Stravy.'],
      ['Pliki, które sam eksportujesz', 'Plik kopii (JSON) i arkusz (CSV) zapisują się tam, gdzie wskażesz. Od tej chwili to Ty decydujesz, komu je dajesz.'],
      ['Usunięcie danych', 'Ustawienia → Kopia zapasowa → „Usuń wszystkie moje dane” czyści telefon i odłącza kopię. Gist na GitHubie usuwasz sam na swoim koncie GitHub. Usunięcie apki z ekranu początkowego też kasuje dane z telefonu.'],
      ['Twoje prawa', 'Masz wgląd we wszystkie swoje dane (eksport do pliku), możesz je poprawić w apce i usunąć. Pytania: ' + CONTACT + '.'],
      ['Zmiany', 'Gdy pojawi się konto w chmurze (logowanie Google/Apple), ta polityka się zmieni, a apka zapyta o zgodę, zanim cokolwiek wyśle na serwer.']
    ]
  },
  terms: {
    title: 'Regulamin',
    parts: [
      ['Czym jest apka', 'Inch Up to darmowy dziennik treningowy z podpowiedziami ciężarów. Korzystasz z niego na własną odpowiedzialność.'],
      ['Twoje dane', 'Dane należą do Ciebie i są w Twoim telefonie. Rób kopie (plik lub GitHub) – bez kopii utrata telefonu lub usunięcie apki oznacza utratę danych.'],
      ['Bez gwarancji', 'Apka jest dostarczana „tak jak jest”. Staramy się, żeby działała poprawnie, ale nie gwarantujemy braku błędów ani ciągłej dostępności.'],
      ['Zdrowie', 'Apka nie jest wyrobem medycznym i nie zastępuje lekarza, fizjoterapeuty ani trenera. Zobacz „Zdrowie i bezpieczeństwo”.'],
      ['Zmiany', 'Regulamin może się zmienić razem z apką; aktualna wersja jest zawsze tutaj.']
    ]
  },
  health: {
    title: 'Zdrowie i bezpieczeństwo',
    parts: [
      ['To nie jest porada medyczna', 'Podpowiedzi ciężarów, plan, lżejszy tydzień i ocena tempa zmiany wagi to ogólne zasady treningowe, a nie zalecenia medyczne.'],
      ['Słuchaj ciała', 'Przerwij ćwiczenie, jeśli czujesz ból, zawroty głowy, duszność albo ucisk w klatce. Przy chorobach, urazach, ciąży lub lekach skonsultuj trening z lekarzem.'],
      ['Technika przed ciężarem', 'Animacje i opisy pokazują ruch w uproszczeniu. Jeśli nie jesteś pewien techniki, poproś trenera. Przy ciężkich ćwiczeniach używaj asekuracji i zabezpieczeń.']
    ]
  }
}

const en = {
  privacy: {
    title: 'Privacy policy',
    parts: [
      ['In short', 'Inch Up has no server of its own. Your workouts, weight, measurements, plan and settings are stored only on your phone (in the browser). We send them to no one, and there are no ads or analytics.'],
      ['What the app stores', 'Workouts (exercises, sets, weights, reps, notes), your training plan, nickname and settings, and if you use them: body weight and measurements. Weight, measurements and heart rate are health data – they are stored only when you enter them or connect Strava.'],
      ['GitHub backup (optional)', 'If you paste your GitHub token, the app saves a backup in a secret Gist on your own GitHub account. The data then goes to GitHub (GitHub, Inc.) under its privacy policy. The token stays on your phone. You can turn it off in Settings → Backup.'],
      ['Strava (optional)', 'Once Strava is connected, the app reads heart rate, calories and time from your strength activities and adds the list of exercises to the activity description. This runs through your GitHub backup. You can revoke access in your Strava settings.'],
      ['Files you export', 'The backup file (JSON) and the sheet (CSV) are saved wherever you choose. From then on you decide who gets them.'],
      ['Deleting your data', 'Settings → Backup → “Delete all my data” clears the phone and disconnects the backup. You delete the Gist yourself on your GitHub account. Removing the app from the home screen also erases its data on the phone.'],
      ['Your rights', 'You can see all your data (export to a file), correct it in the app and delete it. Questions: ' + CONTACT + '.'],
      ['Changes', 'When cloud accounts arrive (Google/Apple sign-in), this policy will change and the app will ask for your consent before sending anything to a server.']
    ]
  },
  terms: {
    title: 'Terms of use',
    parts: [
      ['What the app is', 'Inch Up is a free training log with weight suggestions. You use it at your own risk.'],
      ['Your data', 'Your data belongs to you and lives on your phone. Make backups (file or GitHub) – without one, losing the phone or removing the app means losing the data.'],
      ['No warranty', 'The app is provided “as is”. We try to keep it working, but we don’t guarantee it is free of errors or always available.'],
      ['Health', 'The app is not a medical device and does not replace a doctor, physiotherapist or coach. See “Health and safety”.'],
      ['Changes', 'These terms may change with the app; the current version is always here.']
    ]
  },
  health: {
    title: 'Health and safety',
    parts: [
      ['Not medical advice', 'Weight suggestions, the plan, the light week and the weight-trend verdicts are general training rules, not medical advice.'],
      ['Listen to your body', 'Stop the exercise if you feel pain, dizziness, shortness of breath or chest pressure. With illness, injury, pregnancy or medication, check your training with a doctor.'],
      ['Technique before weight', 'Animations and descriptions show the movement simplified. If you are unsure about technique, ask a coach. Use spotters and safety pins for heavy lifts.']
    ]
  }
}

export const LEGAL = { pl, en }
export const DOCS = ['privacy', 'terms', 'health']
