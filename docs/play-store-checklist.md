# Google Play Store launch checklist — Guts & Gains Coach

Praktische, stap-voor-stap checklist om de Android-app van **PWA → interne bèta → publieke release** in de Play Store te krijgen. Bedoeld als werklijst: vink af terwijl je gaat.

> **App-context**
> - Bundle ID: `app.lovable.54326becdaf944dcbc9e1d0d403cba65`
> - App-naam: `guts-gains-coach`
> - Doelgroep: Nederlandse PT-klanten van Pablo Ramos (Den Haag)
> - Distributiemodel: gratis app, fysieke PT-diensten via Stripe op de website (niet via Play Billing — zie §10)

---

## 1. Google Play Console-account ($25 eenmalig)

- [ ] Ga naar https://play.google.com/console/signup
- [ ] Log in met een **dedicated** Google-account (gebruik niet je persoonlijke Gmail; maak `apps@gutsgainsfitness.com` o.i.d. — kan later niet meer veranderen)
- [ ] Kies **Organisatie** als account-type (niet "Mezelf"). Vereist een D-U-N-S Number — gratis aan te vragen via https://www.dnb.com/duns-number/get-a-duns.html (~30 dagen)
  - **Sneller alternatief:** kies "Mezelf" als je solo-onderneming bent; je naam wordt dan publiek zichtbaar als developer
- [ ] Betaal eenmalig **$25 USD** via creditcard
- [ ] Identiteitsverificatie (paspoort/ID upload) — duurt 1-3 werkdagen
- [ ] Vul je **publieke developer-naam** in (verschijnt onder de app — kies "Guts & Gains Fitness", niet je persoonlijke naam)
- [ ] Vul betaalprofiel in (alleen vereist als je later betaalde apps of in-app aankopen wilt; voor onze gratis app niet nodig)

---

## 2. Vereiste juridische pagina's op de website

Beide moeten publiek bereikbaar zijn vóór je een listing inlevert.

- [ ] **Privacy Policy URL** — verplicht
  - Plek: `https://gutsgainsfitness.com/privacy`
  - Moet expliciet vermelden: welke data we verzamelen (e-mail, naam, gewicht, foto's, hartslag), waar het wordt opgeslagen (Lovable Cloud / Supabase EU), of we het delen, en hoe gebruikers data kunnen verwijderen
  - Generator-tip: https://app-privacy-policy-generator.firebaseapp.com — gratis, vink "Health & Fitness" categorie aan
- [ ] **Account Deletion URL** — sinds 2024 verplicht voor apps met login
  - Plek: `https://gutsgainsfitness.com/account-verwijderen`
  - Of in-app via `/app/profiel` met een "Verwijder account"-knop (aanbevolen — minder support-tickets)
- [ ] **Terms of Service / Algemene voorwaarden** — al aanwezig op `/algemene-voorwaarden` ✅

---

## 3. App-assets (grafisch materiaal)

Alle assets in de **Guts & Gains brand** (zwart `#000`, rood `#dc2626`, wit `#fff`, Oswald-logo).

### App-icoon
- [ ] **512 × 512 px**, PNG, 32-bit met alpha, **max 1 MB**
- [ ] Geen rondingen toevoegen (Play voegt ze automatisch toe)
- [ ] Geen tekst behalve de letters "G&G" of het logo zelf

### Feature graphic (banner bovenaan listing)
- [ ] **1024 × 500 px**, PNG of JPG, max 1 MB
- [ ] Geen belangrijke tekst in de onderste 100 px (mobiel knipt af)
- [ ] Suggestie: zwart vlak, Oswald display-font "TRAIN HARDER" + foto van Pablo of een atleet

### Screenshots (telefoon)
- [ ] **Minimaal 2, maximaal 8**
- [ ] Resolutie tussen **1080 × 1920** en **1920 × 1080** (16:9 of 9:16), JPG/PNG
- [ ] Aanbevolen schermen om te tonen:
  1. Dashboard met rank-badge
  2. Workout in actie (interval timer of set-logger)
  3. Leaderboard
  4. Voortgangsfoto's-tijdlijn
  5. Hartslag-grafiek (na een sessie)
- [ ] Tip: gebruik https://screenshots.pro of https://previewed.app om device-frames + tagline overlays te bouwen — verhoogt installs aantoonbaar

### Optioneel maar aanbevolen
- [ ] **7-inch tablet screenshots** (1024 × 600 min) — 2 stuks
- [ ] **Promo video** (YouTube-link, 30 sec demo) — verhoogt conversie ~25%

---

## 4. Store listing-tekst (NL)

### Korte beschrijving (max 80 tekens)
- [ ] Bijv: `Persoonlijke trainings-app van Guts & Gains Fitness Den Haag.`

### Volledige beschrijving (max 4000 tekens)
- [ ] Schrijf in 3 secties:
  1. **Voor wie** — PT-klanten + zelfstandige sporters in NL
  2. **Wat je krijgt** — workouts, rank-systeem, hartslagmeting, voortgangsfoto's, leaderboard, achievements
  3. **Waarom Guts & Gains** — Pablo Ramos, AALO-gecertificeerd, 10+ jaar, Den Haag
- [ ] Eindig met "Maak gratis een account aan en train mee."

### Categorisering
- [ ] App-categorie: **Health & Fitness**
- [ ] Tags: `personal trainer`, `workout tracker`, `fitness app`
- [ ] Contact-e-mail: `info@gutsgainsfitness.com` (publiek zichtbaar)
- [ ] Website: `https://gutsgainsfitness.com`

---

## 5. Content rating (IARC)

Verplicht — gratis vragenlijst die de leeftijdscategorie bepaalt.

- [ ] Ga naar **Policy → App content → Content ratings → Start questionnaire**
- [ ] Selecteer categorie: **Reference, News, or Educational** (NIET "Game")
- [ ] Beantwoord eerlijk: geen geweld, geen seksuele content, geen alcohol, geen gokken
- [ ] Verwacht resultaat: **PEGI 3 / Everyone** ✅
- [ ] Certificaat wordt direct uitgegeven — bewaar de PDF

---

## 6. Data Safety-formulier (verplicht sinds 2022)

Het strengste deel. Wees eerlijk — Google audits steekproefsgewijs.

- [ ] **Welke data verzamel je?**
  - Persoonlijk: e-mail, naam ✅
  - Gezondheid & fitness: gewicht, lichaamsmetingen, hartslag, workouts ✅
  - Foto's: voortgangsfoto's ✅
  - App-activiteit: gebruiksstatistieken (alleen als we analytics toevoegen)
- [ ] **Wordt data versleuteld in transit?** → Ja (HTTPS)
- [ ] **Kunnen gebruikers data verwijderen?** → Ja (link naar `/account-verwijderen` of in-app knop)
- [ ] **Wordt data gedeeld met derden?** → Ja: Lovable Cloud (Supabase EU) als verwerker; Stripe alleen voor betalingen op de website
- [ ] **Voldoet de app aan Google's Families Policy?** → N.v.t. (geen kinder-app)

---

## 7. Target API level (technisch — automatisch via Capacitor)

- [ ] Capacitor 8 target standaard **Android 14 (API 34)** — voldoet aan Play's eis voor 2025 ✅
- [ ] Check in `android/app/build.gradle`: `targetSdkVersion 34` of hoger
- [ ] Bij elke nieuwe Capacitor-major-versie: `npx cap update android` om bij te blijven

---

## 8. App-bundle (.aab) bouwen voor upload

> Voor releases gebruikt Google **Android App Bundles (.aab)** — niet meer .apk.
> Moet **gesigneerd** zijn met een keystore die je **NOOIT mag verliezen** (anders kun je nooit meer updates uploaden onder dezelfde app).

### 8a. Keystore eenmalig genereren (op je Mac/PC)

```bash
keytool -genkey -v -keystore guts-gains-release.keystore \
  -alias guts-gains -keyalg RSA -keysize 2048 -validity 10000
```

- [ ] Bewaar `guts-gains-release.keystore` op **2 veilige plekken** (bijv. 1Password + externe SSD)
- [ ] Noteer: keystore-wachtwoord, alias-naam, alias-wachtwoord
- [ ] **Verlies dit niet** — er is GEEN herstel mogelijk

### 8b. Vóór de productie-build: server-block uit Capacitor halen

Open `capacitor.config.ts` en **verwijder tijdelijk** het hele `server`-block:

```ts
// VERWIJDER dit voor production:
server: {
  url: 'https://...lovableproject.com?forceHideBadge=true',
  cleartext: true,
},
```

Anders laadt de geïnstalleerde Play Store-app remote code in plaats van de gebundelde assets — keiharde afkeuring door Google's reviewers.

### 8c. Production-bundle bouwen

```bash
# 1. Web-bundle bouwen
npm run build

# 2. Naar Android syncen
npx cap sync android

# 3. Android Studio openen
npx cap open android

# 4. In Android Studio:
#    Build → Generate Signed Bundle / APK → Android App Bundle
#    → kies je keystore → release-variant → Finish
#    → resultaat: android/app/release/app-release.aab
```

- [ ] Zet de `server`-block daarna **terug** in `capacitor.config.ts` (anders werkt hot-reload niet meer voor dev)

---

## 9. Interne test-track (BÈTA voor je klanten) ⭐

**Doe dit eerst.** Zo testen jouw bestaande PT-klanten de app voordat hij publiek staat.

### 9a. Internal testing aanmaken
- [ ] Play Console → **Testing → Internal testing → Create new release**
- [ ] Upload `app-release.aab`
- [ ] Release-naam: `0.1.0-beta` (of vergelijkbaar)
- [ ] Release notes (NL):
  ```
  Eerste interne bèta. Hartslagband-koppeling werkt nu native (Bluetooth).
  Geef feedback in de app of via WhatsApp.
  ```
- [ ] Klik **Save → Review release → Start rollout to Internal testing**

### 9b. Tester-lijst maken
- [ ] **Testers tab → Create email list**
- [ ] Lijstnaam: `gg-bèta-klanten`
- [ ] Voeg max 100 e-mailadressen toe (één per regel of CSV-upload). Het moeten Google-accounts zijn (Gmail of Workspace)
- [ ] Optioneel: feedback-URL = `mailto:info@gutsgainsfitness.com`

### 9c. Opt-in link delen met klanten
- [ ] Kopieer de **opt-in URL** (verschijnt na rollout — ziet eruit als `https://play.google.com/apps/internaltest/...`)
- [ ] Stuur naar je klanten via WhatsApp / e-mail met instructie:
  > 1. Klik op de link en accepteer "Become a tester"
  > 2. Wacht 5-10 min, open daarna de Play Store-link in dezelfde mail
  > 3. Installeer "Guts & Gains Coach"

- [ ] Internal testing heeft **geen Google-review** → live binnen ~1 uur na upload
- [ ] Updates pushen: nieuwe `.aab` uploaden onder dezelfde release → testers krijgen automatische update

### 9d. (Optioneel) Closed testing — bredere bèta van 100-1000 personen
- [ ] Pas inzetten als interne bèta stabiel is
- [ ] Vereist 14 dagen opt-in test door min. 12 mensen vóór je naar Production mag — Google's nieuwe policy sinds 2023

---

## 10. Belangrijk: Geen Google Play Billing nodig ✅

Onze betalingen (PT-pakketten, intake, small group) lopen via **Stripe op de website**, niet binnen de app. Dat mag, mits:

- [ ] De app **geen knop** heeft die direct naar onze Stripe checkout linkt vanuit een digitale-content-flow
- [ ] In de app-listing duidelijk maken: "Boekingen en betalingen vinden plaats op gutsgainsfitness.com"
- [ ] Fysieke diensten (PT-sessies) zijn expliciet **vrijgesteld** van Google's Play Billing-eis (https://support.google.com/googleplay/android-developer/answer/9858738)

→ Als we ooit een **digitaal premium-abonnement in-app** willen verkopen, móet dat via Play Billing (Google neemt 15-30%). Maar dat is nu niet aan de orde.

---

## 11. Production-release (publiek in de Play Store)

Pas doen na minimaal 2 weken stabiele interne bèta met >12 actieve testers.

- [ ] **Production → Create new release**
- [ ] Upload nieuwe `.aab` (versionCode +1, versionName bijv. `1.0.0`)
- [ ] Selecteer doellanden: **Nederland** (later eventueel uitbreiden naar BE, DE)
- [ ] Vul "What's new"-tekst in (max 500 tekens, NL)
- [ ] **Submit for review** → Google review duurt **2-7 dagen** voor een eerste app
- [ ] Bij goedkeuring: app live binnen enkele uren in de Play Store ✨

---

## 12. Na launch — onderhoud

- [ ] Reageer op reviews binnen 48 uur (zichtbaar in Play Console → Ratings & reviews)
- [ ] Push elke 4-8 weken een update (Google straft "verlaten" apps in zoekresultaten)
- [ ] Houd target SDK level up-to-date (jaarlijkse Google deadline, meestal augustus)
- [ ] Bewaar je keystore + wachtwoorden in 1Password met label "🔑 PRODUCTIE — niet verliezen"

---

## Snelle samenvatting van kosten

| Item | Kosten | Frequentie |
|---|---|---|
| Google Play Console-account | $25 USD | Eenmalig |
| Privacy policy generator | €0 | Eenmalig |
| Domain (al in bezit) | — | — |
| Screenshot-tool (optioneel) | €0-15 | Eenmalig/maand |
| Apple Developer (later voor iOS) | $99 USD | Per jaar |
| **Totaal voor Android-launch** | **~$25 USD** | **Eenmalig** |

---

## Volgende stappen ná deze checklist

1. Native BLE-plugin toevoegen (`@capacitor-community/bluetooth-le`) zodat hartslagbanden werken in de Android-app
2. Brand-icons + splash screen genereren (1024×1024 master, Capacitor genereert de rest)
3. Local notifications wiring voor de interval timer (cues blijven werken met scherm uit)
4. Eerste `.aab` bouwen en uploaden naar internal testing track
