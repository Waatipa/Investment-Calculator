import { describe, expect, it } from "vitest";
import { CATEGORIES, ORIGINAL_QUESTIONS, QAS, findQuestion, guideForQuestion } from "@/lib/ask-investments";
import { EXTRA_QUESTIONS } from "@/lib/ask-investments-extra";
import { SEARCH_VOLUME_SOURCE } from "@/lib/ask-investments-volumes";

describe("Ask Investments", () => {
  it("retains 100 original questions and adds exactly 100", () => {
    expect(ORIGINAL_QUESTIONS).toHaveLength(100);
    expect(EXTRA_QUESTIONS).toHaveLength(100);
    expect(QAS).toHaveLength(200);
    for (const original of ORIGINAL_QUESTIONS) expect(QAS.find(q => q.q === original.q)?.cat).toBe(original.cat);
  });
  it("has unique questions", () => { expect(new Set(QAS.map(q => q.q)).size).toBe(QAS.length); });
  it("keeps only the existing six categories in their order", () => {
    expect(CATEGORIES).toEqual(["Beginners", "Calculators", "Comparing stocks", "Companies", "Ratios & research", "Risk & strategy"]);
    expect([...new Set(QAS.map(q => q.cat))]).toEqual([...CATEGORIES]);
  });
  it("ranks known exact-query volumes descending per category without treating unknown as zero", () => {
    expect(SEARCH_VOLUME_SOURCE.database).toBe("ae");
    expect(SEARCH_VOLUME_SOURCE.provisional).toBe(true);
    expect(QAS.find(q => q.q === "What is compounding?")?.volume).toBe(480);
    expect(QAS.find(q => q.q === "How do I make money from stocks?")?.volume).toBe(0);
    expect(QAS.find(q => q.q === "Why do stock prices go up and down?")?.volume).toBeNull();
    for (const cat of CATEGORIES) {
      const rows = QAS.filter(q => q.cat === cat);
      for (let i = 1; i < rows.length; i++) expect(rows[i - 1]?.volume ?? -1).toBeGreaterThanOrEqual(rows[i]?.volume ?? -1);
    }
  });
  it("assigns unique stable global references that can be retrieved by number", () => {
    expect(QAS.map(q => q.number)).toEqual(Array.from({ length: 200 }, (_, i) => i + 1));
    expect(findQuestion("#1")?.q).toBe("What is compounding?");
    expect(findQuestion("question 200")?.number).toBe(200);
    expect(findQuestion("#201")).toBeUndefined();
  });
  it("answers only explicit matches and sends unsupported questions to relevant tools", () => {
    expect(findQuestion("what is a stock")?.q).toBe("What is a stock?");
    expect(findQuestion("What will Apple cost tomorrow?")).toBeUndefined();
    expect(guideForQuestion("Compare Apple with Microsoft")).toBe("Comparing stocks");
    expect(guideForQuestion("Calculate my historical profit")).toBe("Calculators");
  });
  it("keeps educational answers roughly seventy words", () => {
    for (const qa of QAS) {
      const count = qa.a.split(/\s+/).length;
      expect(count).toBeGreaterThanOrEqual(55);
      expect(count).toBeLessThanOrEqual(110);
    }
  });
});
