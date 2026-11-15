export const THEME_STORAGE_KEY = "theme";

export const THEME_COLORS = { light: "#f4efe4", dark: "#1a1712" } as const;

export const THEME_META_ID = "theme-color";

// Runs in <head> before first paint. Kept in sync with applyTheme in theme-toggle.tsx.
// The theme-color meta is created here rather than through Next's viewport export,
// so React never claims it and it can follow the visitor's choice.
export const themeScript = `(function(){try{var s=localStorage.getItem("${THEME_STORAGE_KEY}");var d=s==="dark"||(s!=="light"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);var m=document.createElement("meta");m.name="theme-color";m.id="${THEME_META_ID}";m.content=d?"${THEME_COLORS.dark}":"${THEME_COLORS.light}";document.head.prepend(m)}catch(e){}})()`;
