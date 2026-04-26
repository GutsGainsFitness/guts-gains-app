// MET-based calorie estimation
// Reference: Compendium of Physical Activities

// MET values reflect AVERAGE intensity over a full training session,
// including rest periods between sets (real-world calorie burn).
// Source: Reis et al. 2017, Vezina et al. — strength training nets ~4-7 kcal/min
// for a ~75kg person, not the 8-10 kcal/min the raw Compendium MET suggests.
export const MET_VALUES = {
  hypertrofie: 2.2, // moderate weight lifting incl. rest — conservative estimate ~80 kcal/uur netto @ 80kg
  powerlift: 2.5, // heavy lifting, langere rust periodes
  uithoudingsvermogen: 2.8, // light resistance, korte rust, hogere reps
  interval: 5.5, // HIIT — bijna continue inspanning
  hardlopen_easy: 7.0, // ~8 km/u
  hardlopen_moderate: 9.8, // ~10 km/u
  hardlopen_fast: 11.5, // ~12 km/u
  wandelen: 3.5,
} as const;

export type ActivityKey = keyof typeof MET_VALUES;

/**
 * NET calories burned by the activity (above resting metabolism).
 * Formula: (MET - 1) × weight(kg) × time(hours)
 * Subtracting 1 MET removes the baseline calories you'd burn just sitting,
 * giving the actual "extra" burn from training.
 */
export function calculateCalories(activity: ActivityKey, weightKg: number, durationSeconds: number): number {
  const hours = durationSeconds / 3600;
  const netMet = Math.max(0, MET_VALUES[activity] - 1);
  return Math.round(netMet * weightKg * hours);
}

/**
 * MET based on running pace (km/h)
 */
export function metForRunningPace(kmh: number): number {
  if (kmh < 6) return 6.0;
  if (kmh < 8) return 8.3;
  if (kmh < 10) return 9.8;
  if (kmh < 12) return 11.0;
  if (kmh < 14) return 12.8;
  return 14.5;
}

export function caloriesForRun(weightKg: number, distanceKm: number, durationSeconds: number): number {
  if (durationSeconds <= 0 || weightKg <= 0) return 0;
  const hours = durationSeconds / 3600;
  const kmh = distanceKm / hours;
  const netMet = Math.max(0, metForRunningPace(kmh) - 1);
  return Math.round(netMet * weightKg * hours);
}

export function calculateAge(geboortedatum: string | null): number | null {
  if (!geboortedatum) return null;
  const birth = new Date(geboortedatum);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}
