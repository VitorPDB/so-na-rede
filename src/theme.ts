export type Theme = "dark" | "team" | "light";
export const THEME_KEY = "so-na-rede:theme";
export const themes: { id: Theme; label: string; hint: string }[] = [
  {
    id: "dark",
    label: "Escuro",
    hint: "Contraste alto, ideal para ginásio",
  },
  { id: "team", label: "Time", hint: "Roxo do uniforme, nós em dourado" },
  { id: "light", label: "Claro", hint: "Para ambientes muito iluminados" },
];
const metaColor: Record<Theme, string> = {
  dark: "#0f0e11",
  team: "#24122a",
  light: "#ecebef",
};
export function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === "team" || value === "light" ? value : "dark";
  } catch {
    return "dark";
  }
}
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", metaColor[theme]);
}
export function applyStoredTheme() {
  applyTheme(readTheme());
}
