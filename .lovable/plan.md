

# Betalingssysteem afronden — Alle producten + opzegregels

## Samenvatting
Alle producten worden aangemaakt in het betalingssysteem. Maandkaarten en Small Group 2p worden abonnementen met automatische incasso elke 4 weken. Rittenkaarten zijn eenmalige betalingen. De opzegregels worden vastgelegd en getoond op de website.

## Opzegbeleid (jouw regels)
- Klanten zitten **minimaal 8 weken** (2 betaalcycli) vast
- Na 8 weken kunnen ze **op elk moment opzeggen** per e-mail naar jou
- Ze maken de lopende betaalperiode af (geen restitutie)
- Jij geeft het aan mij door, en ik stop het abonnement voor je

## Wat er gebeurt

### 1. Producten aanmaken

**Abonnementen — elke 4 weken automatische incasso:**

| Product | Prijs per 4 weken |
|---------|-------------------|
| Maandkaart 1x PT/week | €280 |
| Maandkaart 2x PT/week | €520 |
| Maandkaart 3x PT/week | €720 |
| Maandkaart 4x PT/week | €880 |
| Small Group 2p · 1x/week | €140 p.p. |
| Small Group 2p · 2x/week | €280 p.p. |
| Small Group 2p · 3x/week | €420 p.p. |

De batch tool ondersteunt `week` als interval — ik gebruik `recurring_interval: "week"` met een 4-wekelijkse cyclus.

**Eenmalige betalingen (rittenkaarten):**

| Product | Prijs |
|---------|-------|
| Power-Up Pack (5 sessies) | €350 |
| Warrior Pack (10 sessies) | €665 |
| HIIT Pack (20 sessies) | €1.260 |
| Guts Regiment (25 sessies) | €1.522,50 |
| Saiyan Training (36 sessies) | €2.142 |

### 2. Checkout flow aanpassen
- `create-checkout`: detecteert of een prijs recurring is en schakelt automatisch naar `mode: "subscription"`
- Rittenkaarten blijven `mode: "payment"`

### 3. Webhook uitbreiden
- Subscription events toevoegen: `customer.subscription.created`, `updated`, `deleted`
- Opslaan in een `subscriptions` tabel

### 4. Database: subscriptions tabel
Nieuwe tabel om actieve abonnementen bij te houden (wie, welk pakket, wanneer volgende afschrijving, status).

### 5. CheckoutPage opschonen
- Small group 3p en 4p verwijderen (staan niet meer op de site)

### 6. Opzegvoorwaarden op de website
- Bij de tarieven-sectie een kleine tekst toevoegen over de opzegregels: minimaal 8 weken, opzeggen per e-mail, lopende periode afmaken

### 7. Memory bijwerken
- Opzegbeleid vastleggen: 8 weken minimum, opzeggen per e-mail naar Pablo, lopende periode afmaken, Pablo geeft het door aan het systeem

## Volgorde
1. Producten aanmaken (batch tool)
2. `create-checkout` updaten (subscription mode)
3. `payments-webhook` updaten (subscription events)
4. `subscriptions` tabel aanmaken (migratie)
5. `CheckoutPage.tsx` opschonen
6. Opzeginfo op tarieven-pagina
7. Memory bijwerken

