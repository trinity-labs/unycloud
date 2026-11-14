import hljs from "highlight.js/lib/common";

export const codeLanguages = hljs.listLanguages();

export function codeLanguage(name: string): string {
  const suffix = name.toLowerCase().split(".").pop() || "";
  const aliases: Record<string, string> = {
    vue: "xml",
    html: "xml",
    svg: "xml",
    h: "cpp",
    ino: "cpp",
    conf: "ini",
    env: "ini",
    yml: "yaml",
    md: "markdown",
    dockerfile: "dockerfile",
    sh: "bash",
    ps1: "powershell",
  };
  const language = aliases[suffix] || suffix;
  const grammar = hljs.getLanguage(language);
  return (
    codeLanguages.find((name) => hljs.getLanguage(name) === grammar) ||
    "plaintext"
  );
}

export function highlightCode(text: string, language: string): string {
  // Bound syntax parsing, and never guess a language for arbitrary binary data.
  if (text.length <= 100_000 && hljs.getLanguage(language)) {
    return hljs.highlight(text, { language, ignoreIllegals: true }).value;
  }
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function decodeEditableText(bytes: Uint8Array): string | null {
  if (bytes.some((byte) => byte === 0 || byte < 9 || (byte > 13 && byte < 32)))
    return null;
  try {
    // Preserve a UTF-8 BOM on save; reject lossy decoding of other encodings.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
      bytes
    );
  } catch {
    return null;
  }
}

export function hexDump(bytes: Uint8Array): string {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const row = bytes.slice(offset, offset + 16);
    const hex = Array.from(row, (byte) => byte.toString(16).padStart(2, "0"))
      .join(" ")
      .padEnd(47);
    const ascii = Array.from(row, (byte) =>
      byte >= 32 && byte < 127 ? String.fromCharCode(byte) : "."
    ).join("");
    lines.push(`${offset.toString(16).padStart(8, "0")}  ${hex}  ${ascii}`);
  }
  return lines.join("\n");
}
