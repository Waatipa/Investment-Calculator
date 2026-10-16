import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { AcademyBrand } from "@/components/academy-brand";

type To = "/" | "/about-us" | "/markets" | "/europe" | "/africa" | "/middle-east" | "/compare" | "/ask-investments" | "/subscribe" | "/contact-us";
type Item = { label: string; to: To; hint?: string };

const REGIONS: { label: string; to: To; companies: string[] }[] = [
  { label: "US", to: "/markets", companies: ["NVIDIA", "Apple", "Microsoft", "Amazon", "Alphabet"] },
  { label: "Europe", to: "/europe", companies: ["SAP", "ASML", "Nestlé", "LVMH", "Novo Nordisk"] },
  { label: "Africa", to: "/africa", companies: ["Naspers", "FirstRand", "Standard Bank", "MTN Group", "Dangote Cement"] },
  { label: "Middle East", to: "/middle-east", companies: ["Saudi Aramco", "Al Rajhi Bank", "TAQA Group", "ADNOC Gas", "Mashreq"] },
];
const STOCKS: Item[] = [{ label: "Company charts", to: "/markets" }, { label: "Top movers", to: "/" }];
const CALCULATORS: Item[] = [
  { label: "Compare Stocks", to: "/compare" }, { label: "Earnings per share", to: "/markets" }, { label: "Price to earnings ratio", to: "/markets" },
  { label: "Liquidity ratios", to: "/markets" }, { label: "Balance sheet", to: "/markets" }, { label: "Return on investment", to: "/markets" },
];
const NEWS: Item[] = [
  { label: "Fundamental analysis", to: "/ask-investments", hint: "Your companies, analysed" },
  { label: "Company reports", to: "/ask-investments", hint: "Earnings and filings explained" },
  { label: "Market news", to: "/markets", hint: "What moved the markets today" },
];
const START: Item[] = [{ label: "Choose a broker", to: "/subscribe" }, { label: "Open an account", to: "/subscribe" }, { label: "Your first investment", to: "/subscribe" }];
const COURSES: Item[] = [{ label: "Free first course", to: "/subscribe" }, { label: "All courses", to: "/subscribe" }, { label: "My downloads", to: "/subscribe" }];
const TOP: Item[] = [{ label: "Home", to: "/" }, { label: "About Us", to: "/about-us" }];
const AFTER: Item[] = [{ label: "Ask Investments", to: "/ask-investments" }, { label: "Subscribe", to: "/subscribe" }, { label: "Contact Us", to: "/contact-us" }];

function MegaLink({ item, onClick }: { item: Item; onClick?: () => void }) {
  return <Link to={item.to} onClick={onClick} className="mega-link"><span>{item.label}</span>{item.hint && <small>{item.hint}</small>}</Link>;
}

function Dropdown({ label, open, setOpen, children, align = "left" }: { label: string; open: boolean; setOpen: (v: boolean) => void; children: React.ReactNode; align?: "left" | "right" }) {
  return <div className="nav-drop" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
    <button type="button" className={`nav-drop-trigger ${open ? "nav-active" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>{label}<ChevronDown /></button>
    {open && <div className={`mega-panel ${align === "right" ? "mega-right" : ""}`}>{children}</div>}
  </div>;
}

function DesktopNav() {
  const [open, setOpen] = useState<null | "markets" | "start" | "courses">(null);
  const [regions, setRegions] = useState(false);
  const [region, setRegion] = useState(1);
  const close = () => { setOpen(null); setRegions(false); };
  const set = (k: "markets" | "start" | "courses") => (v: boolean) => { setOpen(v ? k : null); if (!v) setRegions(false); };
  const navLink = (i: Item) => <Link key={i.label} to={i.to} className="nav-plain" activeProps={{ className: "nav-active" }} activeOptions={{ exact: true }}>{i.label}</Link>;
  return <nav aria-label="Main menu" className="desktop-nav">
    {TOP.map(navLink)}
    <Dropdown label="Markets" open={open === "markets"} setOpen={set("markets")}>
      <div className="mega-col"><h4>Stocks</h4>
        <button type="button" className={`mega-link ${regions ? "mega-on" : ""}`} onMouseEnter={() => setRegions(true)} onClick={() => setRegions(true)}><span>Browse by region ›</span></button>
        {STOCKS.map(i => <MegaLink key={i.label} item={i} onClick={close} />)}
      </div>
      {regions ? <>
        <div className="mega-col"><h4>Regions</h4>{REGIONS.map((r, idx) => <Link key={r.label} to={r.to} onClick={close} onMouseEnter={() => setRegion(idx)} className={`mega-link ${region === idx ? "mega-on" : ""}`}><span>{r.label}{region === idx ? " ›" : ""}</span></Link>)}</div>
        {(() => { const r = REGIONS[region] ?? REGIONS[0]!; return <div className="mega-col"><h4>{r.label}</h4>{r.companies.map(c => <Link key={c} to={r.to} onClick={close} className="mega-link"><span>{c}</span></Link>)}</div>; })()}
      </> : <>
        <div className="mega-col"><h4>Calculators</h4>{CALCULATORS.map(i => <MegaLink key={i.label} item={i} onClick={close} />)}</div>
        <div className="mega-col"><h4>Analysis &amp; News</h4>{NEWS.map(i => <MegaLink key={i.label} item={i} onClick={close} />)}</div>
      </>}
    </Dropdown>
    {AFTER.map(navLink)}
    <Dropdown label="Start Investing" open={open === "start"} setOpen={set("start")} align="right">
      <div className="mega-col">{START.map(i => <MegaLink key={i.label} item={i} onClick={close} />)}</div>
    </Dropdown>
    <Dropdown label="Courses" open={open === "courses"} setOpen={set("courses")} align="right">
      <div className="mega-col">{COURSES.map(i => <MegaLink key={i.label} item={i} onClick={close} />)}</div>
    </Dropdown>
  </nav>;
}

function Row({ label, open, onToggle, level = 0 }: { label: string; open: boolean; onToggle: () => void; level?: number }) {
  return <button type="button" className={`m-row m-l${level} ${open ? "m-open" : ""}`} aria-expanded={open} onClick={onToggle}><span>{label}</span>{open ? <ChevronDown /> : <ChevronRight />}</button>;
}
function MLink({ item, level = 0 }: { item: Item; level?: number }) {
  return <SheetClose asChild><Link to={item.to} className={`m-row m-l${level}`} activeProps={{ className: "m-open" }} activeOptions={{ exact: true }}><span>{item.label}</span>{level > 0 && <ChevronRight />}</Link></SheetClose>;
}

function MobileNav() {
  const [o, setO] = useState<Partial<Record<"m"|"s"|"c"|"n"|"si"|"co"|`r${string}`, boolean>>>({});
  const t = (k: "m"|"s"|"c"|"n"|"si"|"co"|`r${string}`) => () => setO(s => ({ ...s, [k]: !s[k] }));
  return <nav aria-label="Mobile menu" className="m-nav">
    {TOP.map(i => <MLink key={i.label} item={i} />)}
    <Row label="Markets" open={!!o.m} onToggle={t("m")} />
    {o.m && <>
      <Row label="Stocks" level={1} open={!!o.s} onToggle={t("s")} />
      {o.s && REGIONS.map(r => <div key={r.label}>
        <Row label={r.label} level={2} open={!!o[`r${r.label}` as const]} onToggle={t(`r${r.label}` as const)} />
        {o[`r${r.label}` as const] && <SheetClose asChild><Link to={r.to} className="m-companies">{r.companies.join(" · ")}</Link></SheetClose>}
      </div>)}
      {o.s && STOCKS.map(i => <MLink key={i.label} item={i} level={2} />)}
      <Row label="Calculators" level={1} open={!!o.c} onToggle={t("c")} />
      {o.c && CALCULATORS.map(i => <MLink key={i.label} item={i} level={2} />)}
      <Row label="Analysis & News" level={1} open={!!o.n} onToggle={t("n")} />
      {o.n && NEWS.map(i => <MLink key={i.label} item={i} level={2} />)}
    </>}
    {AFTER.map(i => <MLink key={i.label} item={i} />)}
    <Row label="Start Investing" open={!!o.si} onToggle={t("si")} />
    {o.si && START.map(i => <MLink key={i.label} item={i} level={1} />)}
    <Row label="Courses" open={!!o.co} onToggle={t("co")} />
    {o.co && COURSES.map(i => <MLink key={i.label} item={i} level={1} />)}
  </nav>;
}

export function SiteHeader() {
  return <header className="site-header"><div className="header-inner">
    <Link to="/" aria-label="Investico Academy home" className="min-w-0"><AcademyBrand /></Link>
    <DesktopNav />
    <div className="mobile-nav"><Sheet><SheetTrigger asChild><Button size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>
      <SheetContent className="mobile-menu reference-menu" aria-describedby="mobile-menu-description">
        <SheetTitle><AcademyBrand /></SheetTitle><SheetDescription id="mobile-menu-description" className="sr-only">Investico Academy navigation</SheetDescription>
        <MobileNav />
      </SheetContent></Sheet></div>
  </div></header>;
}
