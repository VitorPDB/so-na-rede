export type Theme = "dark" | "team" | "light";
export const THEME_KEY = "so-na-rede:theme";
export const themes: { id: Theme; label: string; hint: string }[] = [
  {
    id: "dark",
    label: "Preto escuro",
    hint: "Contraste alto, ideal para ginásio",
  },
  { id: "team", label: "Só na Rede", hint: "Roxo profundo e dourado" },
  { id: "light", label: "Claro", hint: "Para ambientes muito iluminados" },
];
const metaColor: Record<Theme, string> = {
  dark: "#070708",
  team: "#0c0910",
  light: "#f4f3f6",
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
