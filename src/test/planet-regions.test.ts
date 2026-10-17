import { describe, expect, it } from "vitest";
import { PLANET_REGIONS, planetRegion, PLANET_SPIN, COMPANY_ORBIT_SPEED } from "@/lib/planet-regions";
describe("regional planet", () => {
  it.each(PLANET_REGIONS)("shows four companies for $name on its destination page", region => {
    expect(planetRegion(region.path)?.companies).toHaveLength(4);
    expect(planetRegion(region.path)?.name).toBe(region.name);
  });
  it("starts with US companies and stays off unrelated pages", () => {
    expect(planetRegion("/")?.name).toBe("US");
    expect(planetRegion("/compare")).toBeUndefined();
  });
  it("rotates the globe and satellites faster than the previous speeds", () => {
    expect(PLANET_SPIN).toBeGreaterThan(0.035);
    expect(COMPANY_ORBIT_SPEED).toBeGreaterThan(0.215);
  });
});
