import { useQuery } from "@tanstack/react-query";
import { Clock, MapPin } from "lucide-react";
import type { KeyboardEvent, MouseEvent } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { COUNTRIES, setCountry, toggleLocalTime, usePrefs } from "@/lib/display-prefs";
import { getFxRate } from "@/lib/fx.functions";

export function LocationButton({ homeCurrency }: { homeCurrency: string }) {
  const { country } = usePrefs();
  const c = COUNTRIES.find(x => x.code === country);
  return <Popover>
    <PopoverTrigger asChild><Button variant="outline" size="sm" className="location-button"><MapPin className="h-4 w-4" />{c ? `${c.name} · ${c.currency}` : "Your Location"}</Button></PopoverTrigger>
    <PopoverContent align="end" className="w-64 p-2">
      <label className="grid gap-1 text-xs font-medium">Select your country
        <select aria-label="Your country" className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={country ?? ""} onChange={e => setCountry(e.target.value || null)}>
          <option value="">Company home currency ({homeCurrency})</option>
          {COUNTRIES.map(x => <option key={x.code} value={x.code}>{x.name} ({x.currency})</option>)}
        </select>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">Results convert at the live exchange rate.</p>
    </PopoverContent>
  </Popover>;
}

// Returns a converter from the company's trading currency to the visitor's chosen currency.
export function useDisplayCurrency(base: string | undefined) {
  const { country } = usePrefs();
  const target = COUNTRIES.find(x => x.code === country)?.currency ?? base;
  const enabled = !!base && !!target && base !== target;
  const fx = useQuery({ queryKey: ["fx", base, target], queryFn: () => getFxRate({ data: { from: base!, to: target! } }), enabled, staleTime: 60_000, retry: false });
  const rate = !enabled ? 1 : fx.data?.rate ?? null;
  const currency = rate != null ? target : base;
  const money = (v: number) => `${currency ?? ""} ${(v * (rate ?? 1)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const note = enabled ? fx.data ? `Converted from ${base} at the live rate 1 ${base} = ${fx.data.rate.toFixed(4)} ${target} (${new Date(fx.data.time).toLocaleString()}); historical values use today's rate.` : fx.isLoading ? `Loading ${base}→${target} rate…` : fx.error?.message ?? null : null;
  return { money, currency, note };
}

export function LocalTimeToggle() {
  const { localTime } = usePrefs();
  const act = (e: MouseEvent | KeyboardEvent) => { e.stopPropagation(); e.preventDefault(); toggleLocalTime(); };
  return <span role="button" tabIndex={0} aria-pressed={localTime} className="local-time-toggle" onClick={act} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") act(e); }}>
    <Clock className="h-3 w-3" />{localTime ? "Local time" : "ET"}
  </span>;
}
