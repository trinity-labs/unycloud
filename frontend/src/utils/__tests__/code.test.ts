import { describe, expect, it } from "vitest";
import {
  codeLanguage,
  decodeEditableText,
  hexDump,
  highlightCode,
} from "../code";

describe("code reader", () => {
  it("recognizes code names and escapes markup instead of executing it", () => {
    expect(codeLanguage("test.ts")).toBe("typescript");
    expect(codeLanguage("test.unknown")).toBe("plaintext");
    expect(highlightCode("<script>alert(1)</script>", "xml")).not.toContain(
      "<script>"
    );
    expect(highlightCode("const answer = 42;", "javascript")).toContain(
      "hljs-keyword"
    );
  });
  it("rejects binary and lossy text; preserves BOM and line endings", () => {
    expect(decodeEditableText(new Uint8Array([0, 1, 2]))).toBeNull();
    expect(decodeEditableText(new Uint8Array([255, 254]))).toBeNull();
    const source = "\ufeffhello\r\nworld\r\n";
    expect(decodeEditableText(new TextEncoder().encode(source))).toBe(source);
  });
  it("bounds syntax parsing and formats a non-executable hex preview", () => {
    const large = "<".repeat(100_001);
    expect(highlightCode(large, "xml")).toBe("&lt;".repeat(100_001));
    expect(hexDump(new Uint8Array([0, 65, 255]))).toContain("00 41 ff");
    expect(hexDump(new Uint8Array([0, 65, 255]))).toContain(".A.");
  });
});
