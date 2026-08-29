let dynamicSheet: CSSStyleSheet | null = null;
let dynamicCounter = 0;
const dynamicRules = new Map<string, CSSStyleRule>();

function getWritableSheet(): CSSStyleSheet | null {
  if (dynamicSheet !== null) {
    return dynamicSheet;
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      void sheet.cssRules;
      dynamicSheet = sheet as CSSStyleSheet;
      return dynamicSheet;
    } catch {
      continue;
    }
  }

  return null;
}

function getRule(selector: string): CSSStyleRule | null {
  const cached = dynamicRules.get(selector);
  if (cached) {
    return cached;
  }

  const sheet = getWritableSheet();
  if (!sheet) {
    return null;
  }

  for (const rule of Array.from(sheet.cssRules)) {
    if (
      rule.constructor.name === "CSSStyleRule" &&
      (rule as CSSStyleRule).selectorText === selector
    ) {
      dynamicRules.set(selector, rule as CSSStyleRule);
      return rule as CSSStyleRule;
    }
  }

  try {
    const index = sheet.insertRule(`${selector} {}`, sheet.cssRules.length);
    const rule = sheet.cssRules[index] as CSSStyleRule;
    dynamicRules.set(selector, rule);
    return rule;
  } catch {
    return null;
  }
}

export function getDynamicClass(prefix: string) {
  dynamicCounter += 1;
  return `${prefix}-${dynamicCounter}`;
}

export function upsertRule(
  selector: string,
  declarations: Record<string, string | null | undefined>
) {
  const rule = getRule(selector);
  if (!rule) {
    return;
  }

  for (const [property, value] of Object.entries(declarations)) {
    if (value === null || value === undefined || value === "") {
      rule.style.removeProperty(property);
      continue;
    }
    rule.style.setProperty(property, value);
  }
}

export function clampNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return min;
  }
  return Math.min(max, Math.max(min, parsed));
}

export function cssPx(value: unknown, min = -100000, max = 100000) {
  return `${clampNumber(value, min, max).toFixed(2)}px`;
}

export function cssEm(value: unknown, min = 0, max = 100) {
  return `${clampNumber(value, min, max).toFixed(2)}em`;
}

export function cssPercent(value: unknown, min = 0, max = 100) {
  return `${clampNumber(value, min, max).toFixed(2)}%`;
}

export function cssScale(value: unknown, min = 0.1, max = 20) {
  return `scale(${clampNumber(value, min, max).toFixed(4)})`;
}

export function safeCssColor(value: string, fallback: string) {
  if (typeof CSS !== "undefined" && CSS.supports("color", value)) {
    return value;
  }
  return fallback;
}

export function safeTextAlign(value: string) {
  return ["left", "right", "center", "start", "end"].includes(value)
    ? value
    : "center";
}
