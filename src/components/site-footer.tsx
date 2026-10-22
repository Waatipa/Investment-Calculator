import { Link } from "@tanstack/react-router";

const footerItems = [
  { to: "/", label: "Home" },
  { to: "/about-us", label: "About Us" },
  { to: "/markets", label: "Markets" },
  { to: "/ask-investments", label: "Ask Investments" },
  { to: "/contact-us", label: "Contact Us" },
] as const;

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner">
    <nav aria-label="Footer menu" className="footer-nav">
      {footerItems.map(({ to, label }) => <Link key={label} to={to} className="footer-link">{label}</Link>)}
    </nav>
    <p className="footer-disclaimer">Projections are hypothetical mathematical estimations for educational use only; past performance results do not guarantee future market returns. Invest responsibly.</p>
    <p className="footer-copyright">Copyright © 2026 Investico Academy</p>
  </div></footer>;
}
