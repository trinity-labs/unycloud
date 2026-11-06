import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(__dirname, "../header.css"), "utf8");
const component = readFileSync(
  resolve(__dirname, "../../components/Search.vue"),
  "utf8"
);

describe("search interaction contract", () => {
  it("uses compact grid buttons instead of circular tiles", () => {
    expect(css).toContain("grid-template-columns: repeat(2, minmax(0, 1fr))");
    expect(css).toContain("#search .boxes > div > button");
    expect(component).not.toContain('role="button"');
    expect(component).toContain('type="button"');
  });

  it("cleans up the outside pointer listener", () => {
    expect(component).toContain(
      'document.addEventListener("pointerdown", dismissOutside, true)'
    );
    expect(component).toContain(
      'document.removeEventListener("pointerdown", dismissOutside, true)'
    );
    expect(component).toContain("searchInput.value?.contains(event.target)");
    expect(component).toContain("searchContent.value?.contains(event.target)");
  });
});
