// Minimum Support Price, ₹ per quintal — set once per season by government policy,
// not live data. RMS 2026-27 rates.
export const MSP_RATES: Record<string, number> = {
  wheat: 2425,
  paddy: 2320,
};

export function mspRate(crop: string): number {
  return MSP_RATES[crop] ?? 0;
}
