import { Settings2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { setChart, resetChart, useChartSettings, type ChartSettings, type ChartType } from "@/lib/chart-settings";

const TYPES: [ChartType, string][] = [["candle", "Candlestick"], ["line", "Line"], ["area", "Area"], ["bar", "Bar"]];

function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return <div role="group" aria-label={label} className="chart-seg">{options.map(([v, l]) => <button key={v} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}</div>;
}
const Color = ({ label, k }: { label: string; k: keyof ChartSettings }) => {
  const s = useChartSettings();
  return <label className="chart-color">{label}<input type="color" value={String(s[k])} onChange={e => setChart({ [k]: e.target.value })} /></label>;
};
const Toggle = ({ label, k }: { label: string; k: keyof ChartSettings }) => {
  const s = useChartSettings();
  return <label className="chart-toggle"><input type="checkbox" checked={Boolean(s[k])} onChange={e => setChart({ [k]: e.target.checked })} />{label}</label>;
};

/** Chart type selector shown next to every chart. */
export function ChartTypeSwitch({ only }: { only?: ChartType[] }) {
  const s = useChartSettings();
  return <Seg label="Chart type" value={s.type} options={TYPES.filter(([t]) => !only || only.includes(t))} onChange={type => setChart({ type })} />;
}

export function ChartSettingsMenu() {
  const s = useChartSettings();
  return <Popover>
    <PopoverTrigger className="chart-settings-btn" aria-label="Chart settings"><Settings2 className="h-4 w-4" />Settings</PopoverTrigger>
    <PopoverContent align="end" className="chart-settings max-h-[70dvh] w-[min(92vw,330px)] overflow-y-auto">
      <h4>Chart type</h4><ChartTypeSwitch />
      <h4>Background</h4><Seg label="Background" value={s.bg} options={[["white", "White"], ["dark", "Dark"], ["custom", "Custom"]]} onChange={bg => setChart({ bg })} />
      {s.bg === "custom" && <Color label="Custom background" k="bgCustom" />}
      <h4>Text colour</h4><Seg label="Text colour" value={s.text} options={[["black", "Black"], ["white", "White"], ["custom", "Custom"]]} onChange={text => setChart({ text })} />
      {s.text === "custom" && <Color label="Custom text" k="textCustom" />}
      <p className="chart-hint">Text switches automatically if it would be hard to read on the background.</p>
      <h4>Bullish candles</h4><div className="chart-colors"><Color label="Body" k="bullBody" /><Color label="Border" k="bullBorder" /><Color label="Wick" k="bullWick" /></div>
      <h4>Bearish candles</h4><div className="chart-colors"><Color label="Body" k="bearBody" /><Color label="Border" k="bearBorder" /><Color label="Wick" k="bearWick" /></div>
      <h4>Trend line</h4><Color label="Line colour" k="trend" />
      <h4>Candle thickness and spacing</h4>
      <label className="chart-range">Thickness <input type="range" min="1" max="12" step="0.5" value={s.thickness} onChange={e => setChart({ thickness: Number(e.target.value) })} /></label>
      <label className="chart-range">Spacing <input type="range" min="0.1" max="0.8" step="0.05" value={s.spacing} onChange={e => setChart({ spacing: Number(e.target.value) })} /></label>
      <h4>Display</h4>
      <Toggle label="Horizontal grid lines" k="gridH" /><Toggle label="Vertical grid lines" k="gridV" />
      <Toggle label="Price labels" k="priceLabels" /><Toggle label="Logarithmic price scale" k="log" />
      <Toggle label="Volume bars (where available)" k="volume" /><Toggle label="Price and date pointer" k="crosshair" />
      <button type="button" className="chart-reset" onClick={resetChart}>Reset to Investico default</button>
    </PopoverContent>
  </Popover>;
}
