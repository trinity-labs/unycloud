import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const mobileCss = readFileSync(resolve(__dirname, "../mobile.css"), "utf8");

const normalizedCss = mobileCss.replace(/\s+/g, " ");

describe("mobile file listing styles", () => {
  it("keeps the open sidebar free of horizontal padding", () => {
    const css = readFileSync(resolve(__dirname, "../unycloud.css"), "utf8");
    const active = css.match(/nav\.active\s*\{([^}]+)\}/)?.[1];
    expect(active).toBeDefined();
    expect(active).toMatch(/padding:\s*0\s*;/);
    expect(css).toMatch(/nav \.action\s*\{\s*width:\s*100%;/);
  });

  it("hides file row metadata without hiding list header sort controls", () => {
    expect(normalizedCss).toContain(
      "#listing.list .item:not(.header) .size { display: none;"
    );
    expect(normalizedCss).toContain(
      "#listing.list .item:not(.header) .modified { display: none;"
    );

    expect(normalizedCss).not.toMatch(
      /#listing\.list \.item \.(size|modified) \{ display: none;/
    );
  });
});
