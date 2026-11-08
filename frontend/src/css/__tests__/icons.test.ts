import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(__dirname, file), "utf8");

describe("consistent application icons", () => {
  it("uses the outlined font for existing icon markup", () => {
    const fonts = read("../fonts.css");
    expect(fonts).toContain("material-icons/iconfont/outlined.css");
    expect(fonts).not.toContain("iconfont/filled.css");
    expect(fonts).toMatch(
      /\.material-icons\s*\{\s*font-family: "Material Icons Outlined"/
    );
    expect(fonts).toContain('font-feature-settings: "liga"');
  });

  it("keeps file type glyphs in the same font family", () => {
    const css = read("../unycloud.css");
    expect(css).not.toContain("Font Awesome");
    expect(css).not.toMatch(/content:\s*"\\[FE][0-9A-F]{3}"/);
    for (const icon of [
      "picture_as_pdf",
      "article",
      "table_chart",
      "slideshow",
      "folder_zip",
      "image",
      "movie",
      "audio_file",
    ]) {
      expect(css).toContain(`content: "${icon}"`);
    }
    expect(read("../../main.ts")).not.toContain("fontawesome-free/css");
    expect(read("../dashboard.css")).not.toContain(
      'font-family: "Material Icons"'
    );
  });
});
