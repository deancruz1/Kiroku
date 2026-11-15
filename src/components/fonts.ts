import { Newsreader, Shippori_Mincho } from "next/font/google";

export const newsreader = Newsreader({
  subsets: ["latin"],
  weight: "variable",
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-newsreader",
});

// Japanese glyphs come in unicode-range slices, so there is no single file worth preloading.
// Each weight adds about 90 KB of @font-face CSS, so only 400 and 700 are loaded.
export const shipporiMincho = Shippori_Mincho({
  weight: ["400", "700"],
  preload: false,
  adjustFontFallback: false,
  variable: "--font-shippori",
});

export const fontVariables = `${newsreader.variable} ${shipporiMincho.variable}`;
