import { Link } from "@tanstack/react-router";
import { AcademyBrand } from "@/components/academy-brand";

const footerItems = [
  { to: "/", label: "Home" },
  { to: "/about-us", label: "About Us" },
  { to: "/markets", label: "Markets" },
  { to: "/ask", label: "Ask" },
  { to: "/subscribe", label: "Subscribe" },
  { to: "/contact-us", label: "Contact Us" },
] as const;

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-inner">
    <Link to="/" aria-label="Investico Academy home"><AcademyBrand /></Link>
    <nav aria-label="Footer menu" className="footer-nav">
      {footerItems.map(({ to, label }) => <Link key={to} to={to} className="footer-link">{label}</Link>)}
    </nav>
    <p className="footer-disclaimer">Projections are hypothetical mathematical estimations for educational use only; past performance results do not guarantee future market returns. Invest responsibly.</p>
  </div></footer>;
}
