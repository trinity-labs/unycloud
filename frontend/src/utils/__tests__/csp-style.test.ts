import { describe, expect, it } from "vitest";
import {
  cssPx,
  cssPercent,
  cssScale,
  cssTranslateScale,
  safeTextAlign,
} from "../cspStyle";

describe("CSP style value boundaries", () => {
  it("does not pass CSS declarations through numeric inputs", () => {
    expect(cssPx("1px; background:url(https://example.org)", 0, 100)).toBe(
      "0.00px"
    );
    expect(cssPercent("expression(alert(1))")).toBe("0.00%");
  });

  it("bounds non-finite and oversized values", () => {
    expect(cssPx(Infinity, 0, 100)).toBe("0.00px");
    expect(cssPercent(-10)).toBe("0.00%");
    expect(cssPercent(1000)).toBe("100.00%");
    expect(cssScale(1000)).toBe("scale(20.0000)");
  });

  it("constructs transforms only from bounded numbers", () => {
    expect(cssTranslateScale("url(https://example.org)", 2, 1, 0, 100)).toBe(
      "translate(0.00px, 2.00px) scale(1.0000)"
    );
  });

  it("restricts text alignment to known keywords", () => {
    expect(safeTextAlign("left; color:red")).toBe("center");
    expect(safeTextAlign("start")).toBe("start");
  });
});
