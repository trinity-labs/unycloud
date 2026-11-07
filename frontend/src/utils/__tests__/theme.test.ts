import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../constants", () => ({ theme: "light" }));
import {
  getScheduledTheme,
  getThemePreference,
  setTheme,
  toggleTheme,
  startThemeSchedule,
} from "../theme";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("scheduled theme", () => {
  it.each([null, "", "invalid", "light", "dark", "auto"])(
    "defaults to auto without replacing a saved choice: %s",
    async (saved) => {
      vi.resetModules();
      vi.stubGlobal("window", {
        localStorage: { getItem: () => saved },
      });
      const freshTheme = await import("../theme");
      expect(freshTheme.getThemePreference()).toBe(
        saved === "light" || saved === "dark" ? saved : "auto"
      );
    }
  );
  it.each([
    [7, 59, "dark"],
    [8, 0, "light"],
    [19, 59, "light"],
    [20, 0, "dark"],
    [0, 0, "dark"],
  ])("resolves %s:%s locally", (hour, minute, expected) => {
    expect(
      getScheduledTheme(new Date(2026, 10, 7, Number(hour), Number(minute)))
    ).toBe(expected);
  });

  it("cycles preferences, persists auto and refreshes colors at the boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 7, 19, 59, 59));
    const meta = { setAttribute: vi.fn() };
    const html = { className: "light" };
    const storage = new Map<string, string>();
    vi.stubGlobal("document", {
      documentElement: html,
      querySelectorAll: () => [meta],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      setInterval,
      clearInterval,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    setTheme("light", true);
    toggleTheme();
    expect(getThemePreference()).toBe("dark");
    toggleTheme();
    expect(getThemePreference()).toBe("auto");
    expect(storage.get("unycloudTheme")).toBe("auto");
    expect(html.className).toBe("light");
    const stop = startThemeSchedule();
    vi.advanceTimersByTime(1000);
    expect(html.className).toBe("dark");
    expect(meta.setAttribute).toHaveBeenLastCalledWith("content", "#151329");
    toggleTheme();
    expect(html.className).toBe("light");
    vi.advanceTimersByTime(1000);
    expect(html.className).toBe("light");
    stop();
    expect(vi.getTimerCount()).toBe(0);
  });
});
