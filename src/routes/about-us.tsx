import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, ChartNoAxesCombined, Scale } from "lucide-react";
import { pageHead } from "@/lib/markets";
import { Button } from "@/components/ui/button";
import learningImage from "@/assets/about-learning.jpg";

export const Route = createFileRoute("/about-us")({
  head: () => pageHead("About Us", "Discover Investico Academy’s educational approach to historical stock prices, company research, investment possibilities and risk—without promises of profit."),
  component: AboutUs,
});
function AboutUs() {
  return <main className="about-education">
    <section className="about-cover"><img src={learningImage} width={1536} height={1024} alt="Two learners reviewing a notebook and an illustrative market chart" /><div className="about-cover-copy"><h1>About Investico Academy</h1><p>How? When? How much?<br />Understanding comes first.</p></div></section>
    <section className="about-section"><div className="about-eyebrow">Knowledge, not promises</div><h2>Understand what investing can offer.</h2><p>Investico Academy is an educational resource for people who want to understand companies, stock markets and how investments have performed over time. We explain ideas in everyday language and connect them with historical prices, comparisons and company figures.</p><p>When a company performs well and markets move in your favour, an investment may grow in value. Prices can also fall, and you can lose some or all of the money you invest. Our goal is to help you understand both possibilities—not to promise earnings or tell you what to buy.</p></section>
    <section className="about-section about-principles"><article><BookOpen /><h2>How does it work?</h2><p>Learn what shares represent, why prices change and how business results differ from a company’s share price. Clear explanations make unfamiliar ideas easier to understand.</p></article><article><ChartNoAxesCombined /><h2>When and how much?</h2><p>Explore how different dates and amounts changed historical outcomes. Compare companies over the same period, remembering that hindsight is not a forecast.</p></article><article><Scale /><h2>Should I invest?</h2><p>That choice is yours. Learning does not require investing. Consider your circumstances, ability to absorb losses and need for independent professional advice before making a decision.</p></article></section>
    <section className="about-section"><h2>A clearer view of the past.</h2><p>Our educational Stock Investment and Comparison Calculators help you understand past stock price trends and see how different assets performed over time. Read the source labels and assumptions alongside the figures: historical results do not guarantee future returns.</p><div className="about-links"><Button asChild><Link to="/markets">Explore historical markets<ArrowRight /></Link></Button><Button asChild variant="outline"><Link to="/ask-investments">Read investment explanations<BookOpen /></Link></Button></div></section>
  </main>;
}
