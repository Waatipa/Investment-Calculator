import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { BarChart3, Square, Calculator } from "lucide-react";
import { pageHead } from "@/lib/markets";

export const Route = createFileRoute("/about-us")({
  head: () => pageHead("About Us", "Investico Academy makes the stock market easy to understand with plain-language courses, market insight and calculators."),
  component: AboutUs,
});

const CALCS = ["Compare Stocks", "Earnings per share", "Price-to-earnings ratio", "Liquidity ratios", "Balance sheet", "Return on investment"];
const DIFF = [
  ["Plain language", "Every term is explained, with no jargon left unexplained."],
  ["Calculate first", "See the numbers before you decide, not after."],
  ["Short and long term", "Tools and lessons for quick moves and lasting wealth."],
  ["Free to start", "Your first course and the core tools cost nothing."],
];

function AboutUs() {
  const [email, setEmail] = useState("");
  const join = (e: React.FormEvent) => {
    e.preventDefault();
    window.location.href = `mailto:walterchaipa16@gmail.com?subject=${encodeURIComponent("App waitlist")}&body=${encodeURIComponent(`Please add ${email} to the Investico app waitlist.`)}`;
  };
  return <main className="info-page">
    <h1>About Investico Academy</h1>
    <p className="lead">Investico Academy is an online platform that makes the stock market easy to understand. We explain how markets move, teach what every investor needs to know, and give you calculators that show what your money could become.</p>
    <div className="info-card"><h3>Our vision</h3><p className="quote">A world where anyone can understand the stock market well enough to invest with confidence.</p></div>
    <div className="info-card"><h3>Our mission</h3><p>To make stock markets simple to understand and easy to calculate. We bring plain-language courses, market insight and practical calculators together, so people can judge companies, estimate returns and decide for themselves, in the short term and the long term.</p></div>

    <h2>What we do</h2>
    <div className="what-row"><div className="what-icon"><BarChart3 /></div><div><strong>Follow the markets</strong><span>See how stocks move, region by region, with clear charts and company profiles.</span></div></div>
    <div className="what-row"><div className="what-icon"><Square /></div><div><strong>Learn the essentials</strong><span>Courses on investment terms, company fundamentals and how to read the numbers.</span></div></div>
    <div className="what-row"><div className="what-icon"><Calculator /></div><div><strong>Calculate your results</strong><span>Compare stocks and test returns before you invest a single dollar.</span></div></div>

    <h2>Why we start with calculators</h2>
    <p className="lead">Numbers make investing real. When you calculate what $1,000 could have grown into, or compare two companies side by side, the value of investing becomes clear. Our calculators do the hard maths so you can focus on the decision.</p>
    <div className="info-card"><h3 style={{ color: "var(--foreground)" }}>Our calculators</h3><ul className="dot-list">{CALCS.map(c => <li key={c}>{c}</li>)}</ul></div>

    <h2>How we are different</h2>
    {DIFF.map(([t, d]) => <div key={t} className="diff-row"><div><strong>{t}</strong><span>{d}</span></div></div>)}

    <h2>Who it is for</h2>
    <p className="lead">Anyone who wants to invest well: first-time investors learning the basics, and experienced investors who want clear numbers and fast comparisons.</p>
    <h2>Investico on every screen</h2>
    <p className="lead">Use Investico in your browser today. Our iPhone and Android apps are on the way, with the same tools and courses.</p>
    <div className="platforms"><div>Web<small>Any browser</small></div><div>iPhone<small>Coming soon</small></div><div>Android<small>Coming soon</small></div></div>
    <form onSubmit={join}>
      <input className="info-input" type="email" required placeholder="Your email address" aria-label="Your email address" value={email} onChange={e => setEmail(e.target.value)} />
      <button className="info-cta" type="submit">Join the app waitlist</button>
    </form>
    <div className="info-card"><p className="info-fine">Investico Academy provides education and general information only. It is not financial advice. Investing carries risk, including loss of capital, and past performance does not guarantee future results.</p></div>
  </main>;
}
