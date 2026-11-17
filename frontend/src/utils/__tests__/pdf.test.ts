import { describe, expect, it } from "vitest";
import { pdfCanvasSize, pdfInitialZoom } from "../pdf";

describe("PDF initial zoom", () => {
  it("fits mobile pages and keeps desktop at 75 percent", () => {
    expect(pdfInitialZoom(355, false)).toBe(1);
    expect(pdfInitialZoom(736, false)).toBe(1);
    expect(pdfInitialZoom(737, false)).toBe(0.75);
    expect(pdfInitialZoom(1280, false)).toBe(0.75);
    expect(pdfInitialZoom(1024, true)).toBe(1);
  });
});

describe("PDF canvas memory budget", () => {
  it("keeps ordinary pages crisp", () => {
    expect(pdfCanvasSize(600, 800, 2)).toEqual({
      ratio: 2,
      width: 1200,
      height: 1600,
    });
  });
  it("caps raster area and dimensions on high density devices", () => {
    for (const [width, height] of [
      [2400, 3200],
      [100, 100000],
      [100000, 100],
    ]) {
      const size = pdfCanvasSize(width, height, 4);
      expect(size.width * size.height).toBeLessThanOrEqual(4_000_000);
      expect(size.width).toBeLessThanOrEqual(4096);
      expect(size.height).toBeLessThanOrEqual(4096);
      expect(size.width).toBeGreaterThan(0);
      expect(size.height).toBeGreaterThan(0);
    }
  });
});
