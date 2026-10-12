import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Menu, Home, ChartNoAxesColumnIncreasing, Mail, Phone, ChevronRight, TrendingUp } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { AcademyBrand } from "@/components/academy-brand";

const menuItems = [
  { to: "/about-us", label: "About Us", icon: Home },
  { to: "/markets", label: "Markets", icon: ChartNoAxesColumnIncreasing },
  { to: "/subscribe", label: "Subscribe", icon: Mail },
  { to: "/contact-us", label: "Contact Us", icon: Phone },
] as const;

export function SiteHeader() {
  return <header className="border-b border-border bg-background">
    <div className="mx-auto grid max-w-[1600px] grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-5 sm:px-6 lg:px-10">
      <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Investico Academy home">
        <AcademyBrand />
      </Link>
      <nav aria-label="Main menu" className="hidden gap-1 md:flex">
        {([
          ["/about-us", "About Us"], ["/markets", "Markets"],
          ["/subscribe", "Subscribe"], ["/contact-us", "Contact Us"],
        ] as const).map(([to, label]) => <Button key={to} variant="ghost" className="h-11 justify-start md:h-9 md:justify-center md:px-3" asChild>
          <Link to={to} activeProps={{ className: "bg-accent text-primary-deep" }}>{label}</Link>
        </Button>)}
      </nav>
      <div className="md:hidden">
        <Sheet>
          <SheetTrigger asChild><Button size="icon" aria-label="Open menu" className="h-10 w-10"><Menu /></Button></SheetTrigger>
          <SheetContent className="mobile-menu flex w-[76%] max-w-sm flex-col overflow-y-auto px-5 pb-6 pt-20" aria-describedby="mobile-menu-description">
            <SheetTitle className="flex min-w-0 items-center gap-2 border-b border-border pb-5 font-display text-base">
              <AcademyBrand />
            </SheetTitle>
            <SheetDescription id="mobile-menu-description" className="sr-only">Investico Academy navigation</SheetDescription>
            <nav aria-label="Mobile menu" className="grid gap-2 border-b border-border py-4">
              {menuItems.map(({ to, label, icon: Icon }) => <SheetClose asChild key={to}>
                <Button asChild variant="ghost" className="h-14 justify-start px-1 text-sm">
                  <Link to={to}><Icon className="mr-2" />{label}<ChevronRight className="ml-auto text-primary-deep" /></Link>
                </Button>
              </SheetClose>)}
            </nav>
            <div className="mt-2 flex items-center gap-3 rounded-lg bg-accent p-4">
              <TrendingUp className="h-8 w-8 shrink-0 text-primary-deep" />
              <div className="min-w-0"><p className="text-xs font-semibold">Learn. Invest. Grow.</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Your journey to smarter investing starts here.</p></div>
            </div>
            <SheetClose asChild><Button className="mt-auto h-12 shrink-0"><ArrowUpRight />Close Menu</Button></SheetClose>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  </header>;
}