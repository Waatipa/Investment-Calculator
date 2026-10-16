import { useId, useRef } from "react";
import { usd } from "@/lib/calc";

export type PricePoint = { t: number; c: number; o: number | null; h: number | null; l: number | null };

export function PriceChart({ points, previousClose, index, onSelect, candles, dateLabel, marketOpen }: { points: PricePoint[]; previousClose: number | null; index: number; onSelect: (i: number) => void; candles: boolean; dateLabel: (t: number) => string; marketOpen: boolean }) {
  const id = useId().replace(/:/g, "");
  const dragging = useRef(false);
  const width = 1000, height = 370, left = 12, right = 890, top = 30, bottom = 325;
  const prices = points.flatMap(p => candles ? [p.c, p.h ?? p.c, p.l ?? p.c] : [p.c]);
  if (previousClose != null) prices.push(previousClose);
  const low = Math.min(...prices), high = Math.max(...prices);
  const pad = Math.max((high - low) * .12, high * .002);
  const min = Math.max(0, low - pad), max = high + pad;
  const x = (i: number) => left + i / Math.max(1, points.length - 1) * (right - left - 75);
  const y = (p: number) => bottom - (p - min) / (max - min) * (bottom - top);
  const baseline = previousClose == null ? bottom : y(previousClose);
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.c)}`).join(" ");
  const area = `${line} L${x(points.length - 1)},${baseline} L${left},${baseline} Z`;
  const selected = points[index], last = points[points.length - 1];
  const select = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width * width;
    onSelect(Math.max(0, Math.min(points.length - 1, Math.round((px - left) / (right - left - 75) * (points.length - 1)))));
  };
  const candleWidth = Math.max(.7, Math.min(10, (right - left - 75) / points.length * .65));
  return <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full touch-pan-y" role="img" aria-label={candles ? "Candlestick stock price chart" : "Stock price chart with green above and red below previous close"}
    onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); select(e.clientX, e.currentTarget); }} onPointerMove={e => { if (dragging.current || e.pointerType === "mouse") select(e.clientX, e.currentTarget); }} onPointerUp={() => { dragging.current = false; }} onPointerCancel={() => { dragging.current = false; }}>
    <defs>
      <clipPath id={`${id}-up`}><rect x="0" y="0" width={width} height={Math.max(0, baseline)} /></clipPath>
      <clipPath id={`${id}-down`}><rect x="0" y={baseline} width={width} height={height} /></clipPath>
      <linearGradient id={`${id}-green`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--success)" stopOpacity=".3"/><stop offset="100%" stopColor="var(--success)" stopOpacity=".06"/></linearGradient>
      <linearGradient id={`${id}-red`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--destructive)" stopOpacity=".06"/><stop offset="100%" stopColor="var(--destructive)" stopOpacity=".3"/></linearGradient>
    </defs>
    {[0,1,2,3,4].map(i => { const value = min + (max - min) * i / 4; return <g key={i}><line x1={left} x2={right} y1={y(value)} y2={y(value)} stroke="var(--border)"/><text x={right + 12} y={y(value) + 4} fill="var(--muted-foreground)" fontSize={k * 12}>{usd(value)}</text></g>; })}
    {previousClose != null && <g><line x1={left} x2={right} y1={baseline} y2={baseline} stroke="var(--muted-foreground)" strokeDasharray="5 5"/><text x={left + 4} y={Math.max(16, baseline - 8)} fill="var(--muted-foreground)" fontSize={k * 11}>Previous close {usd(previousClose)}</text></g>}
    {candles ? <g data-chart="candles">{points.map((p,i) => {
      if (p.o == null || p.h == null || p.l == null) return null;
      const color = p.c >= p.o ? "var(--success)" : "var(--destructive)";
      return <g key={p.t}><line x1={x(i)} x2={x(i)} y1={y(p.h)} y2={y(p.l)} stroke={color}/><rect x={x(i)-candleWidth/2} y={y(Math.max(p.o,p.c))} width={candleWidth} height={Math.max(1,Math.abs(y(p.o)-y(p.c)))} fill={color}/></g>;
    })}</g> : <g data-chart="line"><path d={area} fill={`url(#${id}-green)`} clipPath={`url(#${id}-up)`}/><path d={area} fill={`url(#${id}-red)`} clipPath={`url(#${id}-down)`}/><path d={line} fill="none" stroke="var(--success)" strokeWidth="2" clipPath={`url(#${id}-up)`}/><path d={line} fill="none" stroke="var(--destructive)" strokeWidth="2" clipPath={`url(#${id}-down)`}/></g>}
    {last && <g><line x1={x(points.length-1)} x2={right} y1={y(last.c)} y2={y(last.c)} stroke={previousClose != null && last.c < previousClose ? "var(--destructive)" : "var(--success)"} strokeDasharray="4 4"/><circle cx={x(points.length-1)} cy={y(last.c)} r="4" fill="var(--success)" className={marketOpen ? "market-endpoint" : ""}/></g>}
    {selected && <g><line x1={x(index)} x2={x(index)} y1={top} y2={bottom} stroke="var(--primary-deep)" strokeWidth="2" strokeDasharray="3 4"/><circle cx={x(index)} cy={y(selected.c)} r="5" fill="var(--primary-deep)" stroke="var(--background)" strokeWidth="2"/></g>}
    {[0,.25,.5,.75,1].map((v,i) => { const p=points[Math.round(v*(points.length-1))]; return p ? <text key={i} x={x(Math.round(v*(points.length-1)))} y={bottom+28} textAnchor={i===0 ? "start" : i===4 ? "end" : "middle"} fontSize={k * 11} fill="var(--muted-foreground)">{dateLabel(p.t)}</text> : null; })}
  </svg>;
}