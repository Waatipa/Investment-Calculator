import { describe, expect, it } from "vitest";
import { canGoBack, previousVisit, RETURN_HIGHLIGHT_MS, type PageVisit } from "@/lib/navigation-trail";

const visits: PageVisit[] = ["/europe", "/compare", "/about-us"].map(href => ({ href, label: href, source: null, scroll: 0 }));
describe("Navigation continuity", () => {
  it("stops Back at the page entered from outside the website", () => {
    expect(canGoBack(visits.slice(0, 1), 0)).toBe(false);
    expect(canGoBack(visits, 0)).toBe(true);
    expect(previousVisit(visits, "/europe")).toBe(0);
    expect(previousVisit(visits.slice(0, 1), "/")).toBe(-1);
  });
  it("keeps Back available inside a card on the entry page", () => {
    expect(canGoBack(visits.slice(0, 1), 1)).toBe(true);
  });
  it("highlights the returning selection for exactly one second", () => {
    expect(RETURN_HIGHLIGHT_MS).toBe(1000);
  });
  it("returns to the most recent repeated page rather than the first", () => {
    expect(previousVisit([...visits, { ...visits[0], href: "/europe", label: "Europe", source: null, scroll: 0 }, { href: "/compare", label: "Compare", source: null, scroll: 0 }], "/europe")).toBe(3);
  });
});