---
name: timer-sounds
description: Exact audio specs voor alle countdown/rest/interval timers — RestTimer is de bron van waarheid
type: design
---

# Timer Sounds (Source of Truth: RestTimer)

Alle timers in de app moeten EXACT deze audio + countdown gebruiken.
RestTimer (`src/components/app/RestTimer.tsx`) is de referentie — niet aanpassen.

## Pre-start countdown (3-2-1 voordat timer begint)
- Telt af van 3 naar 1 (1 beep per seconde)
- Beep per cijfer: **1200Hz, 0.3s** duur
- Bij 0 → "GO" tone: **1400Hz, 1.5s**

## Tijdens lopende timer (laatste seconden)
- Op `r <= 3 && r >= 2` (dus seconden 3 en 2): **1200Hz, 1.5s** beep
- Op `r <= 1` (laatste seconde): geen aparte korte beep — direct de eindtoon

## Einde timer / fase-overgang
- Dubbeltoon: **1400Hz, 1.5s** + na 400ms delay **1600Hz, 1.5s**

## Volume / mute
- Persisted in localStorage: `rest_timer_sound_on`, `rest_timer_volume` (0-100, default 70)
- Gain mapping: `(volume / 100) * 0.6` als peak (Web Audio gain >1 = clipping)
- Exponential ramp naar 0.001 over `dur` seconden voor schone fade-out

## Implementatie referentie
```ts
const beep = (freq = 1200, dur = 1.5) => {
  if (!soundOnRef.current) return;
  if (!audioRef.current) audioRef.current = new AudioContext();
  const ctx = audioRef.current;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.frequency.value = freq;
  const peak = Math.max(0, Math.min(100, volumeRef.current)) / 100 * 0.6;
  gain.gain.setValueAtTime(peak, ctx.currentTime);
  gain.gain.setValueAtTime(peak, ctx.currentTime + dur * 0.7);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.start(); osc.stop(ctx.currentTime + dur);
};
```

## Visuele match
- Pre-start: groot pulserend cijfer + label "KLAAR?" in primary kleur
- Lopende: mm:ss tabular-nums + fase label eronder
- Cirkel SVG: radius 45, strokeWidth 6, primary stroke, transition-all duration-500
