import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";

export function SiteHeader() {
  return <header className="border-b border-border bg-background">
    <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 px-4 py-5 sm:px-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center lg:px-10">
      <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Investico Academy home">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"><ArrowUpRight /></span>
        <span className="min-w-0 font-display text-lg font-semibold">Investico Academy</span>
      </Link>
      <nav aria-label="Main menu" className="grid grid-cols-1 gap-1 md:flex">
        {([
          ["/about-us", "About Us"], ["/markets", "Markets"],
          ["/subscribe", "Subscribe"], ["/contact-us", "Contact Us"],
        ] as const).map(([to, label]) => <Button key={to} variant="ghost" className="h-11 justify-start md:h-9 md:justify-center md:px-3" asChild>
          <Link to={to} activeProps={{ className: "bg-accent text-primary-deep" }}>{label}</Link>
        </Button>)}
      </nav>
    </div>
  </header>;
}