---
name: Booking system — sessietypen en regels
description: Intake 45 min, PT-sessie 60 min, nachttarief €120 ex BTW. Datum-specifieke slots per 2 maanden.
type: feature
---
## Sessietypen
- **Intake**: 45 minuten, gratis, voor nieuwe klanten. Getoond in IntakeSection op homepage.
- **PT-sessie**: 60 minuten, voor bestaande klanten. Boeken via /boeken.
- **Nachtsessie**: 23:30–05:30, €120 ex BTW (21%), alleen op aanvraag — niet als regulier slot getoond.

## Beschikbaarheid
- Slots worden per 2 maanden opgegeven door de eigenaar met specifieke datums.
- Elke datum heeft een `specific_date` veld in `available_time_slots`.
- Zaterdagen: klanten kunnen vragen om een later tijdstip (notitie bij slot).
- Sommige doordeweekse dagen: verzoek eerder mogelijk (notitie bij slot).

## Tabellen
- `available_time_slots` — kolommen: specific_date, slot_type, notes
- `pt_bookings` — boekingen van bestaande klanten

## Pagina's
- `/boeken` — PT-sessie boeken (bestaande klanten)
- `/admin/tijdsloten` — beheer met datumpicker, type filter, notities
