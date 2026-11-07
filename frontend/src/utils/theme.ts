import { theme } from "./constants";

const themeStorageKey = "unycloudTheme";
const lightThemeColor = "#5a52c8";
const darkThemeColor = "#151329";
export type ThemePreference = UserTheme | "auto";
let activePreference: ThemePreference | undefined;

export const getScheduledTheme = (date = new Date()): UserTheme =>
  date.getHours() >= 8 && date.getHours() < 20 ? "light" : "dark";

export const getThemePreference = (): ThemePreference => {
  if (activePreference !== undefined) return activePreference;
  const saved = window.localStorage.getItem(themeStorageKey);
  return saved === "auto" || saved === "light" || saved === "dark"
    ? saved
    : "auto";
};

export const startThemeSchedule = (): (() => void) => {
  const refresh = () => {
    if (getThemePreference() === "auto") setTheme("auto");
  };
  const timer = window.setInterval(refresh, 1000);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
};

const isUserTheme = (value: string | null): value is UserTheme => {
  return value === "light" || value === "dark" || value === "";
};

export const getTheme = (): UserTheme => {
  const htmlTheme = document.documentElement.className as UserTheme;
  if (htmlTheme) return htmlTheme;

  const savedTheme = window.localStorage.getItem(themeStorageKey);
  if (isUserTheme(savedTheme) && savedTheme) return savedTheme;

  return theme;
};

export const setTheme = (theme: ThemePreference, persist = false) => {
  activePreference = theme;
  const html = document.documentElement;
  if (!theme) {
    html.className = getMediaPreference();
  } else {
    html.className = theme === "auto" ? getScheduledTheme() : theme;
  }

  setThemeMetaColor(html.className as UserTheme);

  if (persist) {
    window.localStorage.setItem(themeStorageKey, theme);
  }
};

export const toggleTheme = (): void => {
  const activeTheme = getThemePreference();
  if (activeTheme === "light") {
    setTheme("dark", true);
  } else if (activeTheme === "dark") {
    setTheme("auto", true);
  } else {
    setTheme("light", true);
  }
};

export const getMediaPreference = (): UserTheme => {
  const hasDarkPreference = window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches;
  if (hasDarkPreference) {
    return "dark";
  } else {
    return "light";
  }
};

const setThemeMetaColor = (theme: UserTheme) => {
  const color = theme === "dark" ? darkThemeColor : lightThemeColor;

  document
    .querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')
    .forEach((meta) => {
      meta.setAttribute("content", color);
    });
};
