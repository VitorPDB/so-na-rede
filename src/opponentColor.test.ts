import assert from "node:assert/strict";
import test from "node:test";
import {
  contrast,
  hexToRgb,
  pickDominant,
  themVars,
  tooCloseToUs,
} from "./opponentColor";

const px = (...colors: [number, number, number, number][]) => colors.flat();

test("cor predominante ignora transparente, branco e preto", () => {
  const red: [number, number, number, number] = [180, 30, 40, 255];
  const pixels = px(
    [255, 255, 255, 255],
    [255, 255, 255, 255],
    [0, 0, 0, 255],
    [0, 0, 255, 0],
    red,
    red,
    [20, 120, 60, 255],
  );
  assert.deepEqual(pickDominant(pixels), [180, 30, 40]);
  assert.equal(pickDominant(px([255, 255, 255, 255], [10, 10, 10, 255])), null);
});

test("roxo parecido com o nosso cai no padrão", () => {
  assert.equal(tooCloseToUs([100, 40, 160]), true);
  assert.equal(tooCloseToUs([180, 30, 40]), false);
});

test("texto dos visitantes fica legível na superfície", () => {
  const vars = themVars([232, 178, 28], [255, 255, 255], [28, 24, 32]);
  assert.ok(contrast(hexToRgb(vars["--c-them-ink"]), [255, 255, 255]) >= 4.5);
  assert.equal(vars["--c-on-them"], "#17141a");
});
