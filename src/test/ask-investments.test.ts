import { describe, expect, it } from "vitest";
import { QAS } from "@/lib/ask-investments";

describe("Ask Investments", () => {
  it("has at most 100 questions", () => { expect(QAS.length).toBeLessThanOrEqual(100); });
  it("has unique questions", () => { expect(new Set(QAS.map(q => q.q)).size).toBe(QAS.length); });
});
