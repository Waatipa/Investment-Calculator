import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Menu, Home, UserRound, ChartCandlestick, Mail, Phone, Pencil, GraduationCap } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { AcademyBrand } from "@/components/academy-brand";
const menuItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/about-us", label: "About Us", icon: UserRound },
  { to: "/markets", label: "Markets", icon: ChartCandlestick },
  { to: "/subscribe", label: "Subscribe", icon: Mail },
  { to: "/contact-us", label: "Contact Us", icon: Phone },
] as const;
export function SiteHeader() {
  return <header className="site-header"><div className="header-inner">
    <Link to="/" aria-label="Investico Academy home" className="min-w-0"><AcademyBrand /></Link>
    <nav aria-label="Main menu" className="desktop-nav">
      {menuItems.map(({to,label}) => <Button key={to} variant="ghost" asChild><Link to={to} activeProps={{className:"nav-active"}} activeOptions={{exact:true}}>{label}</Link></Button>)}
      <Button variant="ghost">Start Investing</Button><Button variant="ghost">Courses</Button>
    </nav>
    <div className="mobile-nav"><Sheet><SheetTrigger asChild><Button size="icon" aria-label="Open menu"><Menu /></Button></SheetTrigger>
      <SheetContent className="mobile-menu reference-menu" aria-describedby="mobile-menu-description">
        <SheetTitle><AcademyBrand /></SheetTitle><SheetDescription id="mobile-menu-description" className="sr-only">Investico Academy navigation</SheetDescription>
        <nav aria-label="Mobile menu">{menuItems.map(({to,label,icon:Icon}) => <SheetClose asChild key={to}><Button variant="ghost" asChild><Link to={to} activeProps={{className:"nav-active"}} activeOptions={{exact:true}}><Icon />{label}</Link></Button></SheetClose>)}
          <Button variant="ghost"><Pencil />Start Investing</Button><Button variant="ghost"><GraduationCap />Courses</Button>
        </nav>
      </SheetContent></Sheet></div>
  </div></header>;
}
