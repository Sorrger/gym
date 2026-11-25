# Przegląd projektu i porównanie z aplikacjami komercyjnymi (25.11.2026)

## 1. Jak jest zbudowany projekt teraz
- `src/` – logika w zwykłych modułach JS: `store.js` (treningi, IndexedDB, podpowiedzi dnia, deload), `coach.js` (progresja), `plan.js` (plan, etapy), `stats.js`, `prefs.js` (ustawienia), `account.js`, `cloud.js` (kopia GitHub), `weight.js`, `strava.js`, `i18n.js` + `i18n-en.js`, `theme.js`.
- `src/views/` – ~22 ekrany Vue (Ionic). Największy: `WorkoutView.vue` (~800 linii) – kandydat do podziału na komponenty (seria, minutnik, podsumowanie, rozgrzewka).
- `scripts/` – deploy + Strava (GitHub Action). `tests/` – testy logiki (`npm test`, 154 przypadki) i skrypty Playwright (od 25.11 w repo, wcześniej tylko w /tmp).
- Dane: offline-first (IndexedDB), każda jednostka danych ma zasady łączenia (nowszy wygrywa / nagrobki) → gotowe pod bazę danych per konto.

## 2. Co poprawić w strukturze (kolejność od najważniejszego)
1. **CI**: GitHub Action uruchamia `npm test` + `npm run build` przy każdym pushu (dodane).
2. **Warstwa synchronizacji**: jeden adapter zamiast wywołań Gista w 4 plikach – potrzebne przed bazą danych i logowaniem.
3. **Podział dużych ekranów** na komponenty (`WorkoutView`, `SettingsView`, `ProgressView`).
4. **Tłumaczenia**: teraz tłumaczenie „w locie” na stronie (szybkie wdrożenie). Do sklepów lepiej przejść na klucze (`vue-i18n`), żeby dodać kolejne języki i mieć pewność, że nic nie zostaje po polsku.
5. **TypeScript + ESLint** stopniowo (najpierw logika: store/coach/stats) – mniej błędów przy rozbudowie.
6. **Raporty błędów** (np. Sentry, za zgodą użytkownika) i numer wersji widoczny w Ustawieniach.
7. **Capacitor** (Ionic ma go „w pakiecie”) – ta sama apka jako aplikacja na iOS/Android, z powiadomieniami, wibracjami, Apple Health.

## 3. Co mają aplikacje komercyjne (Hevy, Strong, HeavySet, Alpha Progression), a nam brakuje
- **Minutnik przerwy** – startuje sam po odhaczeniu serii, z dźwiękiem/powiadomieniem (każda z nich to ma; u nas jest tylko minutnik wiszenia). ← największa luka
- **Typy serii**: rozgrzewkowa, normalna, drop set, do upadku; **superserie** w logowaniu (u nas tylko w notatce).
- **Katalog ćwiczeń** z opisami/animacjami + **własne ćwiczenia** (na liście TODO).
- **Kalkulator talerzy** dla każdej serii (u nas tylko przy rozgrzewce).
- **Notatki do ćwiczenia/serii**, **pomiary ciała** (obwody, % tłuszczu, zdjęcia sylwetki).
- **Gotowe programy** (biblioteka planów dla różnych poziomów) i **import z Hevy/Strong (CSV)**, **eksport CSV**.
- **Zegarek** (Apple Watch / Wear OS), wersja w przeglądarce, opcjonalnie społeczność.

## 4. Co mamy, za co inni każą płacić
- Automatyczna progresja (podwójna) z zapasem powtórzeń, rady w trakcie serii, automatyczny lżejszy tydzień, kalkulator rozgrzewki, etapy nauki podciągania, ocena tempa wagi – w Hevy kalkulator rozgrzewki i rekomendacje są w wersji Pro.

## 5. Model biznesowy (jak robią inni)
- Darmowa wersja z limitami (np. kilka zapisanych planów, kilka własnych ćwiczeń, ograniczona historia wykresów) + Pro na rok (Hevy ok. 24 $/rok) albo jednorazowo (Strong).
- U nas naturalny podział: darmowe logowanie + historia, Pro = trener (progresja, deload, rady), synchronizacja między urządzeniami, Strava/Garmin, eksport.
