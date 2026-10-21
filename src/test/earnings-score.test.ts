import { describe, expect, it } from "vitest";
import { FACTORS, computeScores, demoInitial } from "@/lib/earnings-score";

describe("earnings call scoring", () => {
  it("weights are 30/20/20/15/15 and total 100%", () => {
    expect(FACTORS.map(f => f.w)).toEqual([30, 20, 20, 15, 15]);
    expect(FACTORS.reduce((t, f) => t + f.w, 0)).toBe(100);
  });
  it("overall is sum of score x weight for the demo start", () => {
    // eps +14.29% -> 71.43*0.3; rev +8% -> 80*0.2; guid -7 -> -46.67*0.2; sector -4.8 -> -48*0.15; sent -32*0.15
    const { overall } = computeScores(demoInitial());
    expect(overall).toBeCloseTo(21.4286 + 16 - 9.3333 - 7.2 - 4.8, 3);
  });
  it("scores are clamped to -100..+100", () => {
    const { rows } = computeScores({ ...demoInitial(), eps: { a: 20, e: 1 } });
    expect(rows[0]!.score).toBe(100);
  });
});
