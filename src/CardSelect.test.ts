import test from "node:test";
import assert from "node:assert/strict";
import { createElement as h, Fragment } from "react";
import { cardOptions } from "./CardSelect";
test("cartões preservam valores numéricos, textos compostos e opções desabilitadas", () => {
  const options = cardOptions([
    h("option", { value: 0 }, "Jogo completo"),
    h(Fragment, null, [
      h("option", { value: "p1" }, "Vidro", " · #", 11),
      h("option", { value: "", disabled: true }, "Escolher"),
    ]),
    h(
      "optgroup",
      { label: "Grupo", disabled: true },
      h("option", { value: "p2" }, "Akira"),
    ),
  ]);
  assert.deepEqual(options, [
    { value: "0", label: "Jogo completo", disabled: false },
    { value: "p1", label: "Vidro · #11", disabled: false },
    { value: "", label: "Escolher", disabled: true },
    { value: "p2", label: "Akira", disabled: true },
  ]);
  assert.deepEqual(
    cardOptions(h("option", { label: "Nome acessível" }, "Conteúdo")),
    [{ value: "Nome acessível", label: "Nome acessível", disabled: false }],
  );
});
