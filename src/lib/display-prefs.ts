import { useSyncExternalStore } from "react";

// Browser-safe shared display preferences: visitor's chosen country (currency) and local-time toggle.
export const COUNTRIES = [
  { code: "US", name: "United States", currency: "USD" }, { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" }, { code: "FR", name: "France", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" }, { code: "IT", name: "Italy", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" }, { code: "CH", name: "Switzerland", currency: "CHF" },
  { code: "DK", name: "Denmark", currency: "DKK" }, { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "NO", name: "Norway", currency: "NOK" }, { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" }, { code: "QA", name: "Qatar", currency: "QAR" },
  { code: "KW", name: "Kuwait", currency: "KWD" }, { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "NG", name: "Nigeria", currency: "NGN" }, { code: "KE", name: "Kenya", currency: "KES" },
  { code: "EG", name: "Egypt", currency: "EGP" }, { code: "MA", name: "Morocco", currency: "MAD" },
  { code: "GH", name: "Ghana", currency: "GHS" }, { code: "TZ", name: "Tanzania", currency: "TZS" },
  { code: "UG", name: "Uganda", currency: "UGX" }, { code: "IN", name: "India", currency: "INR" },
  { code: "CN", name: "China", currency: "CNY" }, { code: "JP", name: "Japan", currency: "JPY" },
  { code: "SG", name: "Singapore", currency: "SGD" }, { code: "HK", name: "Hong Kong", currency: "HKD" },
  { code: "AU", name: "Australia", currency: "AUD" }, { code: "CA", name: "Canada", currency: "CAD" },
  { code: "BR", name: "Brazil", currency: "BRL" }, { code: "MX", name: "Mexico", currency: "MXN" },
] as const;
export const FX_CURRENCIES = [...new Set<string>(["USD", "EUR", "GBP", "CHF", "DKK", "SAR", "AED", "ZAR", "MAD", "NGN", ...COUNTRIES.map(c => c.currency)])];

type Prefs = { country: string | null; localTime: boolean };
let prefs: Prefs = { country: null, localTime: false };
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const set = (p: Partial<Prefs>) => { prefs = { ...prefs, ...p }; listeners.forEach(l => l()); };
const server: Prefs = { country: null, localTime: false };
export function usePrefs() { return useSyncExternalStore(subscribe, () => prefs, () => server); }
export const setCountry = (country: string | null) => set({ country });
export const toggleLocalTime = () => set({ localTime: !prefs.localTime });
