import { describe, expect, it } from "vitest";
import { pdfPrefetchScreens } from "../pdf";

describe("PDF lazy rendering policy", () => {
  it("prefetches one viewport only for a fast connection", () => {
    expect(pdfPrefetchScreens({ effectiveType: "4g", downlink: 10 })).toBe(1);
  });
  it("does not prefetch on slow, metered or unknown connections", () => {
    expect(pdfPrefetchScreens()).toBe(0);
    expect(pdfPrefetchScreens({})).toBe(0);
    expect(pdfPrefetchScreens({ effectiveType: "3g" })).toBe(0);
    expect(pdfPrefetchScreens({ effectiveType: "4g", downlink: 1 })).toBe(0);
    expect(pdfPrefetchScreens({ effectiveType: "4g", saveData: true })).toBe(0);
  });
});
