# Tvarkaraštis

Asmeninė studijų ir praktikos tvarkaraščio programėlė (PWA). Ją galima įsidiegti telefone, ji veikia be interneto, o duomenys saugomi tik tavo įrenginyje (IndexedDB).

- **Šiandien**: dienos laiko juosta 07:00–20:00, kas vyksta dabar ir kas toliau („Kitas: Praktika 13:30, po 45 min.“).
- **Savaitė**: 5 arba 7 dienos, arba 3 dienos telefone. Braukimas kairėn ir dešinėn keičia savaitę.
- **Mėnuo**: spalvoti taškai pagal tipą. Paspaudus dieną, ji atsidaro.
- **Praktika**: atliktos ir suplanuotos valandos iš 322, savaitinė suvestinė, kiekvienam blokui galima pažymėti „įvyko“ / „neįvyko“ ir faktines valandas.
- **Daugiau**: eksportas ir importas (JSON), priminimai, „Atstatyti pradinį grafiką“.

Bet kur paspaudus tuščią laiką, kuriamas naujas įrašas tuo laiku. Paspaudus įrašą, jis atsidaro redaguoti.

---

## 1. Paleidimas kompiuteryje

Reikia [Node.js](https://nodejs.org/) 20 ar naujesnės versijos.

```bash
npm install
npm run dev
```

Atsidaryk adresą, kurį parodys terminalas (pvz. http://localhost:5173).

Kitos komandos:

| Komanda | Ką daro |
|---|---|
| `npm test` | Paleidžia testus (Vitest), tarp jų pradinio grafiko patikrą |
| `npm run build` | Sukuria produkcinę versiją aplanke `dist/` |
| `npm run preview` | Paleidžia `dist/` lokaliai (čia veikia service worker ir offline režimas) |
| `npm run icons` | Iš naujo sugeneruoja ikonas iš SVG (`scripts/gen-icons.mjs`) |

### Išbandyti telefone tame pačiame Wi-Fi tinkle

```bash
npm run build
npx vite preview --host
```

Telefone atsidaryk terminale parodytą `Network:` adresą (pvz. `http://192.168.1.10:4173`). Pastaba: be HTTPS service worker ir įdiegimas per tinklą neveikia. Juos patikrinsi tik publikavęs į GitHub Pages (žr. 2 dalį).

---

## 2. Publikavimas nemokamai per GitHub Pages

1. Susikurk paskyrą [github.com](https://github.com), jei jos dar neturi.
2. Sukurk naują repozitoriją, pvz. `tvarkarastis`. Nemokamam GitHub Pages ji turi būti **Public**.
   > Repozitorijoje bus kodas ir pradinis grafikas (datos, laikai, praktikos vadovo vardas). Tavo vėliau įvesti įrašai į GitHub **nepatenka**: jie lieka telefone (ir tavo Supabase projekte, jei įjungsi sinchronizaciją, žr. 7 dalį).
3. Įkelk kodą (šiame aplanke):
   ```bash
   git init
   git add .
   git commit -m "Tvarkaraštis"
   git branch -M main
   git remote add origin https://github.com/<tavo-vartotojas>/tvarkarastis.git
   git push -u origin main
   ```
4. GitHub repozitorijoje atsidaryk **Settings → Pages**. Skiltyje **Build and deployment → Source** pasirink **GitHub Actions**.
5. Atsidaryk skirtuką **Actions**. Workflow „Publikuoti į GitHub Pages“ paleidžia testus, sukuria build'ą ir publikuoja. Jei jis nepasileido pats, paspausk **Run workflow**.
6. Po minutės ar dviejų programėlė bus adresu
   **`https://<tavo-vartotojas>.github.io/tvarkarastis/`**

Kelias (`base`) nustatomas automatiškai pagal repozitorijos pavadinimą: workflow perduoda `BASE_PATH=/<repo>/`, o `vite.config.ts` jį naudoja. Pervadinus repozitoriją, nieko keisti nereikia.

Kiekvienas `git push` į `main` publikuoja naują versiją. Atsidaryta programėlė atsinaujina pati, kai kitą kartą ją atidarai su internetu.

---

## 3. Įsidiegimas telefone

### iPhone (Safari)
1. **Safari** naršyklėje atsidaryk `https://<tavo-vartotojas>.github.io/tvarkarastis/`. Kitos iOS naršyklės to padaryti neleidžia.
2. Apačioje paspausk **Bendrinti** (kvadratas su rodykle aukštyn).
3. Pasirink **Pridėti prie pradžios ekrano** („Add to Home Screen“) → **Pridėti**.
4. Atsidaryk programėlę nuo ikonos. Ji veiks per visą ekraną, kaip atskira programėlė.

### Android (Chrome)
1. **Chrome** naršyklėje atsidaryk tą patį adresą.
2. Paspausk **⋮** → **Įdiegti programą** („Install app“) arba **Pridėti prie pagrindinio ekrano**.
3. Programėlė atsiras tarp kitų programėlių.

Po pirmo atidarymo programėlė veikia ir be interneto.

---

## 4. Duomenys ir atsarginės kopijos

- Duomenys saugomi įrenginio **IndexedDB** ir išlieka uždarius programėlę. Programėlė taip pat prašo naršyklės jų automatiškai nevalyti. Jei nori, kad sutaptų telefone ir kompiuteryje, žr. **7. Sinchronizacija**.
- **Svarbu iPhone vartotojams:** naršyklės duomenys ir įdiegtos programėlės duomenys yra **atskiri**. Naudok programėlę nuo ikonos. Pašalinus ikoną, ištrinami ir duomenys.
- **Daugiau → Eksportuoti į JSON** sukuria atsarginę kopiją. Telefone atsidaro dalinimosi meniu (išsaugok į „Failai“ / Google Drive arba nusiųsk sau).
- **Daugiau → Importuoti iš JSON** atkuria kopiją. Dabartiniai įrašai pakeičiami. Taip galima perkelti duomenis į kitą įrenginį.
- Pradinis praktikos grafikas įkeliamas tik pirmą kartą. **Daugiau → Atstatyti pradinį grafiką** (su patvirtinimu) ištrina visus įrašus ir įkelia jį iš naujo.

---

## 5. Pradinis grafikas ir „trūksta 8 val.“

Paskaitos (pavadinimai, laikai, auditorijos, dėstytojai pastaboje) paimtos iš universiteto tvarkaraščio ir įkeliamos nuo 2026-10-12 iki 2026-12-23. Kai kurios paskaitos vyksta tik nelyginėmis semestro savaitėmis (7, 9, 11, …): trečiadienį 17:30 ir penktadienį 09:00 ir 15:30. Švenčių dienomis (11-02, 12-24, 12-25) paskaitų nėra.

Grafikas aprašytas `src/data/seed.ts`. Praktikos blokai generuojami iš savaičių šablonų (A, C, D) ir kiekvienos savaitės išimčių. Praktika vyksta 2026-10-26 – 2027-01-29, iš viso 322 val.

Grafike savaičių sumos kartu duoda 322 val., bet surašyti blokai duoda tik 290 val. Savaitėse **11-02, 11-16, 11-30 ir 12-14** blokų yra 8 val. mažiau, nei nurodyta tos savaitės sumoje (greičiausiai trūksta pilnos praktikos dienos ten, kur grafike „–“). Programėlė šių blokų **neišgalvoja**. Praktikos suvestinėje prie tų savaičių rodomas įspėjimas „trūksta 8 val. pagal grafiką“. Kai pridėsi trūkstamus praktikos blokus, įspėjimas dings.

Testas `src/data/seed.test.ts` tikrina, kad kiekvienos savaitės kiekvienos dienos blokai sutampa su grafiko lentele ir kad neatitikimas randamas būtent šiose 4 savaitėse.

---

## 6. Priminimai (pranešimai)

**Daugiau → Priminti prieš įvykį** įjungia pranešimus 5–60 min. prieš įvykį, **bet tik kol programėlė atidaryta arba neseniai naudota (gyva fone)**.

Kodėl ne visada? Kad pranešimas atsirastų uždarius programėlę, telefonas turi ją „pažadinti“. Naršyklėse tai įmanoma tik per **Web Push**, kuriam reikia serverio, siunčiančio žinutes tinkamu laiku. Chrome bandyta API vietiniams suplanuotiems pranešimams („Notification Triggers“) buvo atsisakyta, o iOS jos niekada neturėjo. Ši programėlė neturi backend'o, todėl patikimų priminimų uždarius ją nėra.

- iPhone pranešimai veikia tik **įdiegtoje** programėlėje (iOS 16.4+), ne Safari skirtuke.
- Jei reikia patikimų priminimų, paprasčiausia įvykius importuoti į telefono kalendorių arba vėliau pridėti mažą push serverį.

---

## 7. Sinchronizacija tarp telefono ir kompiuterio (Supabase)

Neprivaloma. Be jos programėlė veikia kaip anksčiau, tik viename įrenginyje.

**Kaip veikia.** Pagrindinė duomenų kopija lieka įrenginyje (IndexedDB), todėl viskas veikia ir be interneto. Kai internetas yra:
- pakeitimai išsiunčiami į tavo Supabase projektą po ~2 s;
- kitų įrenginių pakeitimai parsiunčiami atidarius programėlę, grįžus į ją ir kas minutę;
- jei tą patį įrašą pakeitei dviejuose įrenginiuose, lieka **vėlesnis** pakeitimas;
- ištrynimai taip pat sinchronizuojami;
- nepakeisti pradinio grafiko įrašai į debesį nesiunčiami, nes kiekvienas įrenginys juos susikuria pats.

### Vienkartinis paruošimas (~10 min.)

1. Susikurk paskyrą [supabase.com](https://supabase.com) ir sukurk naują projektą (Free planas). Regionas: artimiausias, pvz. *Central EU (Frankfurt)*.
2. **SQL Editor → New query**: įklijuok visą failo [`supabase/schema.sql`](supabase/schema.sql) turinį ir paspausk **Run**. Sukuriama lentelė `entries`, saugumo taisyklės (kiekvienas mato tik savo įrašus) ir funkcija `push_entries`.
3. **Authentication → Emails → Templates** (kai kur: *Email Templates*). Šablonuose **Magic Link** ir **Confirm signup** turi būti kodas `{{ .Token }}`, kitaip laiške ateis tik nuoroda. Pvz.:
   ```html
   <h2>Tvarkaraščio prisijungimo kodas</h2>
   <p>Tavo kodas: <strong style="font-size:24px">{{ .Token }}</strong></p>
   <p>Įvesk jį programėlėje. Kodas galioja ribotą laiką.</p>
   ```
   Kodėl kodas, o ne nuoroda: iPhone nuoroda atsidarytų Safari, o Safari duomenys atskiri nuo įdiegtos programėlės, todėl prisijungimas ten nepasiektų programėlės.
4. **Project Settings → API Keys** (arba *Data API*): nukopijuok **Project URL** ir **anon / publishable** raktą.
   > Šis raktas skirtas viešam naudojimui naršyklėje. Duomenis saugo saugumo taisyklės iš 2 žingsnio. **Niekada** nenaudok `service_role` / `secret` rakto.
5. Įvesk juos vienu iš būdų:
   - **Programėlėje:** **Daugiau → Sinchronizacija** → įklijuok adresą ir raktą → **Išsaugoti**. Tai reikia padaryti kiekviename įrenginyje.
   - **Arba GitHub'e** (tada nereikės nieko įvesti įrenginiuose): repozitorijoje **Settings → Secrets and variables → Actions → New repository secret**. Sukurk `VITE_SUPABASE_URL` ir `VITE_SUPABASE_ANON_KEY`, tada paleisk workflow iš naujo (**Actions → Run workflow**).
   - Kompiuteryje lokaliai: nukopijuok `.env.example` į `.env.local` ir įrašyk reikšmes.
6. **Prisijunk:** **Daugiau → Sinchronizacija** → įvesk el. paštą → **Siųsti kodą** → įvesk kodą iš laiško. Tą patį padaryk kitame įrenginyje **su tuo pačiu el. paštu**.
7. (Rekomenduojama) Prisijungęs visuose įrenginiuose, išjunk naujų paskyrų kūrimą: **Authentication → Sign In / Providers → Allow new users to sign up** → išjungti. Tada niekas kitas negalės susikurti paskyros tavo projekte.

### Pirmas prisijungimas, kai duomenų yra keliuose įrenginiuose
Pirmo prisijungimo metu įrenginys išsiunčia savo pakeitimus (tavo pridėtus įrašus, pažymėtas praktikos būsenas ir pan.) ir parsisiunčia, kas jau yra debesyje. Niekas neištrinama. Jei tas pats įrašas pakeistas abiejuose, lieka vėlesnis pakeitimas.

### Pastabos
- Nemokamas Supabase projektas, nenaudojamas 7 dienas, **sustabdomas** (paused). Duomenys neprarandami: atsidaryk supabase.com ir paspausk **Restore**. Kol projektas sustabdytas, programėlė veikia vietoje, o sinchronizacija parodys klaidą.
- Supabase nemokamas el. pašto siuntimas turi limitą (kelis laiškus per valandą). Kodo prireiks tik prisijungiant.
- Laikrodis: kuris pakeitimas „vėlesnis“, sprendžiama pagal įrenginio laiką, todėl telefono ir kompiuterio laikrodžiai turi būti teisingi (automatinis laikas).
- JSON eksportas veikia kaip anksčiau ir lieka gera atsarginė kopija.

---

## Technologijos

Vite + React + TypeScript, Tailwind CSS v4, `vite-plugin-pwa` (Workbox service worker, visi failai kešuojami), `idb` (IndexedDB), Vitest. Laikas skaičiuojamas pagal Europe/Vilnius zoną, savaitė prasideda pirmadienį, laikas rodomas 24 val. formatu.

```
src/
  data/seed.ts          pradinis grafikas (šablonai → blokai) + neatitikimų paieška
  data/seed.test.ts     grafiko testai
  lib/dates.ts          datos, Vilniaus laikas
  lib/db.ts             IndexedDB (įrašai su pakeitimo laiku, ištrynimo žymės)
  lib/syncCore.ts       sinchronizacijos logika (push / pull, vėlesnis laimi) + testai
  lib/sync.ts           Supabase: prisijungimas kodu, sinchronizavimas, būsena
supabase/schema.sql     lentelė, saugumo taisyklės, push_entries funkcija
  lib/entries.ts        pasikartojimai, konfliktai, praktikos valandos
  lib/backup.ts         JSON eksportas / importas
  lib/notify.ts         priminimai
  components/           laiko juosta, įrašo forma, dialogai
  views/                Šiandien, Savaitė, Mėnuo, Praktika, Nustatymai
```
