import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, ChevronRight } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { AcademyBrand } from "@/components/academy-brand";
import { COMPANIES } from "@/lib/markets";
import { EU_COMPANIES } from "@/lib/europe";
import { AF_COMPANIES } from "@/lib/africa";
import { ME_COMPANIES } from "@/lib/middle-east";
import { PlatformShare } from "@/components/platform-share";
import { AuthEntry } from "@/components/auth-entry";

type MarketTo = "/markets" | "/europe" | "/africa" | "/middle-east";
const REGIONS: { label: string; to: MarketTo; companies: readonly { name: string; symbol: string }[] }[] = [
  { label: "US", to: "/markets", companies: COMPANIES },
  { label: "Europe", to: "/europe", companies: EU_COMPANIES },
  { label: "Africa", to: "/africa", companies: AF_COMPANIES },
  { label: "Middle East", to: "/middle-east", companies: ME_COMPANIES },
];
const LINKS = [{ label: "Home", to: "/" }, { label: "About Us", to: "/about-us" }, { label: "Ask Investments", to: "/ask-investments" }, { label: "Contact Us", to: "/contact-us" }] as const;

function DesktopNav() {
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState(0);
  const selected = REGIONS[region];
  const navLink = (item: typeof LINKS[number]) => <Link key={item.label} to={item.to} className="nav-plain" activeProps={{ className: "nav-active" }} activeOptions={{ exact: true }}>{item.label}</Link>;
  return <nav aria-label="Main menu" className="desktop-nav">
    {LINKS.slice(0, 2).map(navLink)}
    <div className="nav-drop" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
      <Button variant="ghost" className={`nav-drop-trigger ${open ? "nav-active" : ""}`} aria-expanded={open} onClick={() => setOpen(!open)}>Markets<ChevronDown /></Button>
      {open && <div className="mega-panel">
        <div className="mega-col"><h4>Regions</h4>{REGIONS.map((r, i) => <Link key={r.label} to={r.to} onClick={() => setOpen(false)} onMouseEnter={() => setRegion(i)} onFocus={() => setRegion(i)} className={`mega-link ${i === region ? "mega-on" : ""}`}><span>{r.label}</span></Link>)}</div>
        {selected && <div className="mega-col"><h4>{selected.label} companies</h4>{selected.companies.map(c => <Link key={c.symbol} to={selected.to} search={{ company: c.symbol }} onClick={() => setOpen(false)} className="mega-link"><span>{c.name}</span></Link>)}</div>}
      </div>}
    </div>
    {LINKS.slice(2).map(navLink)}
  </nav>;
}
function MobileNav() {
  const [markets, setMarkets] = useState(false);
  const [region, setRegion] = useState<string | null>(null);
  const row = (item: typeof LINKS[number]) => <SheetClose asChild key={item.label}><Link to={item.to} className="m-row"><span>{item.label}</span></Link></SheetClose>;
  return <nav aria-label="Mobile menu" className="m-nav">
    <AuthEntry variant="menu" />{LINKS.slice(0, 2).map(row)}
    <Button variant="ghost" className="m-row" aria-expanded={markets} onClick={() => setMarkets(!markets)}><span>Markets</span>{markets ? <ChevronDown /> : <ChevronRight />}</Button>
    {markets && REGIONS.map(r => <div key={r.label}>
      <Button variant="ghost" className="m-row m-l1" aria-expanded={region === r.label} onClick={() => setRegion(region === r.label ? null : r.label)}><span>{r.label}</span><ChevronDown /></Button>
      {region === r.label && <><SheetClose asChild><Link to={r.to} className="m-row m-l2">All {r.label} companies</Link></SheetClose>{r.companies.map(c => <SheetClose asChild key={c.symbol}><Link to={r.to} search={{ company: c.symbol }} className="m-row m-l2"><span>{c.name}</span><ChevronRight /></Link></SheetClose>)}</>}
    </div>)}
    {LINKS.slice(2).map(row)}
  </nav>;
}

export function SiteHeader() {
  return <header className="site-header"><div className="header-inner">
    <Link to="/" aria-label="Investico Academy home" className="min-w-0"><AcademyBrand /></Link>
    <DesktopNav />
    <div className="header-actions"><AuthEntry /><PlatformShare /><div className="mobile-nav"><Sheet><SheetTrigger asChild><Button size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>
      <SheetContent className="mobile-menu reference-menu" aria-describedby="mobile-menu-description">
        <SheetTitle><AcademyBrand /></SheetTitle><SheetDescription id="mobile-menu-description" className="sr-only">Investico Academy navigation</SheetDescription>
        <MobileNav />
      </SheetContent></Sheet></div></div>
  </div></header>;
}
