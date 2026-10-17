import { Link } from "@tanstack/react-router";
import { ComingSoonButton } from "@/components/coming-soon";

const footerItems = [
  { to: "/", label: "Home" },
  { to: "/about-us", label: "About Us" },
  { to: "/markets", label: "Markets" },
  { to: "/ask-investments", label: "Ask Investments" },
  { to: "/subscribe", label: "Subscribe" },
  { to: "/contact-us", label: "Contact Us" },
  { to: "/subscribe", label: "Start Investing" },
  { to: "/subscribe", label: "Courses" },
] as const;

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner">
    <nav aria-label="Footer menu" className="footer-nav">
      {footerItems.map(({ to, label }) => label === "Courses" || label === "Start Investing" ? <ComingSoonButton key={label} variant="ghost" className="footer-link">{label}</ComingSoonButton> : <Link key={label} to={to} className="footer-link">{label}</Link>)}
    </nav>
    <p className="footer-disclaimer">Projections are hypothetical mathematical estimations for educational use only; past performance results do not guarantee future market returns. Invest responsibly.</p>
    <p className="footer-copyright">Copyright © 2026 Investico Academy</p>
  </div></footer>;
}
