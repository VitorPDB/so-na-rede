import { useEffect } from "react";

/**
 * Cor dos visitantes a partir do escudo enviado.
 * Só define as variáveis --c-them*; sem escudo, sem cor clara o bastante ou com
 * um roxo parecido com o nosso, os temas usam o azul-ardósia padrão.
 */

type Rgb = [number, number, number];
const OUR_PURPLE: Rgb = [0x5e, 0x1f, 0x99];

const toHex = (c: Rgb) =>
  "#" +
  c
    .map((v) =>
      Math.round(Math.max(0, Math.min(255, v)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export const hexToRgb = (h: string): Rgb => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const mix = (a: Rgb, b: Rgb, t: number): Rgb =>
  a.map((v, i) => v + (b[i] - v) * t) as Rgb;
const luminance = (c: Rgb) => {
  const [r, g, b] = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export const contrast = (a: Rgb, b: Rgb) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const hue = ([r, g, b]: Rgb) => {
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  if (!d) return 0;
  const h =
    max === r
      ? ((g - b) / d) % 6
      : max === g
        ? (b - r) / d + 2
        : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};

/** Cor predominante entre pixels opacos e com cor (ignora fundo, branco, preto e cinza). */
export function pickDominant(pixels: ArrayLike<number>): Rgb | null {
  const buckets = new Map<number, { n: number; sum: Rgb }>();
  for (let i = 0; i + 3 < pixels.length; i += 4) {
    const r = pixels[i],
      g = pixels[i + 1],
      b = pixels[i + 2],
      a = pixels[i + 3];
    if (a < 128) continue;
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    if (max - min < 28 || max < 40 || min > 225) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const bucket = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] as Rgb };
    bucket.n++;
    bucket.sum[0] += r;
    bucket.sum[1] += g;
    bucket.sum[2] += b;
    buckets.set(key, bucket);
  }
  let best: { n: number; sum: Rgb } | null = null;
  for (const b of buckets.values()) if (!best || b.n > best.n) best = b;
  return best ? (best.sum.map((v) => v / best!.n) as Rgb) : null;
}

/** Roxo perto do nosso confundiria os lados no placar. */
export function tooCloseToUs(c: Rgb, ours: Rgb = OUR_PURPLE) {
  const gray = Math.max(...c) - Math.min(...c) < 28;
  const oursGray = Math.max(...ours) - Math.min(...ours) < 28;
  if (gray !== oursGray) return false;
  if (gray) return Math.hypot(...c.map((v, i) => v - ours[i])) < 65;
  const d = Math.abs(hue(c) - hue(ours));
  return Math.min(d, 360 - d) < 28;
}

/** Variáveis do lado "eles" para uma cor e as superfícies do tema atual. */
export function themVars(color: Rgb, surface: Rgb, text: Rgb) {
  const white: Rgb = [255, 255, 255],
    dark: Rgb = [0x17, 0x14, 0x1a];
  const on = contrast(color, white) >= contrast(color, dark) ? white : dark;
  let ink = color;
  for (let t = 0.1; contrast(ink, surface) < 4.5 && t <= 1; t += 0.1)
    ink = mix(color, text, t);
  return {
    "--c-them": toHex(color),
    "--c-on-them": toHex(on),
    "--c-them-hover": toHex(mix(color, [0, 0, 0], 0.15)),
    "--c-them-muted": toHex(mix(color, on, 0.7)),
    "--c-them-ink": toHex(ink),
  };
}

const NAMES = [
  "--c-them",
  "--c-on-them",
  "--c-them-hover",
  "--c-them-muted",
  "--c-them-ink",
];

function readColor(src: string): Promise<Rgb | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 48;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0, 48, 48);
        resolve(pickDominant(ctx.getImageData(0, 0, 48, 48).data));
      } catch {
        // Imagem de outro domínio sem CORS: fica a cor padrão.
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function cssRgb(name: string): Rgb | null {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return /^#[0-9a-f]{6}$/i.test(v) ? hexToRgb(v) : null;
}

function apply(color: Rgb | null) {
  const root = document.documentElement.style;
  NAMES.forEach((n) => root.removeProperty(n));
  if (!color) return;
  if (tooCloseToUs(color, cssRgb("--c-us") ?? OUR_PURPLE)) return;
  const surface = cssRgb("--c-surface-1") ?? [255, 255, 255];
  const text = cssRgb("--c-text") ?? [28, 24, 32];
  Object.entries(themVars(color, surface, text)).forEach(([k, v]) =>
    root.setProperty(k, v),
  );
}

/** Aplica a cor do escudo enquanto o componente estiver montado. */
export function useOpponentColor(logo?: string | null) {
  useEffect(() => {
    let color: Rgb | null = null;
    let alive = true;
    // O texto "eles" depende da superfície do tema: recalcula ao trocar o tema.
    const observer = new MutationObserver(() => apply(color));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    if (logo)
      void readColor(logo).then((c) => {
        if (!alive) return;
        color = c;
        apply(color);
      });
    return () => {
      alive = false;
      observer.disconnect();
      apply(null);
    };
  }, [logo]);
}
