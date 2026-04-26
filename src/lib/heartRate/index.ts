/**
 * Public barrel for the heart-rate module.
 * Existing imports of `@/lib/heartRate` keep working (see ../heartRate.ts);
 * new code should prefer `@/lib/heartRate/registry` and `@/lib/heartRate/types`.
 */
export * from "./types";
export * from "./registry";