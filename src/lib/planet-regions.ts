/** Decorative identities only; no quotes or market values. */
export const PLANET_REGIONS = [
  { name: "US", path: "/markets", token: "--space-cyan", companies: ["NVDA", "AAPL", "MSFT", "GOOGL"] },
  { name: "EUROPE", path: "/europe", token: "--space-violet", companies: ["ASML", "LVMH", "SAP", "NESTLÉ"] },
  { name: "AFRICA", path: "/africa", token: "--space-green", companies: ["NASPERS", "FIRSTRAND", "MTN", "DANGCEM"] },
  { name: "MIDDLE EAST", path: "/middle-east", token: "--space-gold", companies: ["ARAMCO", "AL RAJHI", "TAQA", "ADNOC GAS"] },
] as const;
export function planetRegion(path: string) {
  return path === "/" ? PLANET_REGIONS[0] : PLANET_REGIONS.find(region => region.path === path);
}
export const PLANET_SPIN = 0.28;
export const COMPANY_ORBIT_SPEED = 0.65;
