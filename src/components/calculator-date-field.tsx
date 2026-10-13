import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function CalculatorDateField({ id, label, value, onChange, min, disabled, required = true }: { id: string; label: string; value: string; onChange: (value: string) => void; min?: string; disabled?: boolean; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : undefined;
  return <label className="grid gap-2 text-xs font-medium" htmlFor={id}>{label}<div className="calculator-date-input">
    <Input id={id} type="date" required={required} value={value} min={min} disabled={disabled} onChange={e => onChange(e.target.value)} className="h-12 text-base" />
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={`Choose ${label.toLowerCase()}`} title={`Choose ${label.toLowerCase()}`}><CalendarDays /></Button></PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end"><Calendar mode="single" captionLayout="dropdown" startMonth={new Date(1980, 0)} endMonth={new Date()} selected={selected} defaultMonth={selected} disabled={min ? { before: new Date(`${min}T00:00:00`) } : undefined} onSelect={date => { if (date) { onChange(format(date, "yyyy-MM-dd")); setOpen(false); } }} /></PopoverContent>
    </Popover>
  </div></label>;
}