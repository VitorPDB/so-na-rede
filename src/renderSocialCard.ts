import type { SocialCardData } from "./socialCardData";
async function loadImage(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  return img;
}
export async function renderSocialCard(
  data: SocialCardData,
  story: boolean,
): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('750 138px "Big Shoulders Display Variable"'),
    document.fonts.load('550 30px "Atkinson Hyperlegible Next Variable"'),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = story ? 1920 : 1350;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("Não foi possível gerar a imagem.");
  const h = canvas.height,
    top = story ? 330 : 240,
    white = "#efecf2",
    gold = "#f0c66a",
    bg = "#18161b";
  const text = (
    t: string,
    x: number,
    y: number,
    size: number,
    color = white,
    display = false,
    max = 950,
  ) => {
    c.fillStyle = color;
    c.textBaseline = "top";
    let actual = size;
    do {
      c.font = `${display ? 750 : 550} ${actual}px "${display ? "Big Shoulders Display Variable" : "Atkinson Hyperlegible Next Variable"}", sans-serif`;
      if (c.measureText(t).width <= max) break;
      actual--;
    } while (actual > 14);
    c.fillText(t, x, y);
  };
  c.fillStyle = bg;
  c.fillRect(0, 0, 1080, h);
  c.fillStyle = "#0f0e11";
  c.fillRect(0, 0, 1080, 175);
  try {
    const logo = await loadImage("/team-logo-transparent.png");
    c.drawImage(logo, 62, 36, 102, 102);
  } catch {
    /* The card remains readable without the decorative crest. */
  }
  text(data.team.toLocaleUpperCase("pt-BR"), 188, 50, 58, white, true, 510);
  text(
    data.finished ? "FIM DE JOGO" : "PARCIAL",
    760,
    70,
    26,
    gold,
    false,
    260,
  );
  text(
    data.player.name.toLocaleUpperCase("pt-BR"),
    64,
    top,
    138,
    white,
    true,
    570,
  );
  text(
    `${String(data.player.number).padStart(2, "0")} / ${data.player.libero ? "LÍBERO" : (data.player.positions[0] ?? "JOGADOR")}`,
    68,
    top + 160,
    30,
    gold,
    false,
    560,
  );
  let photo: HTMLImageElement | undefined;
  if (data.player.photo?.dataUrl.startsWith("data:image/"))
    try {
      photo = await loadImage(data.player.photo.dataUrl);
    } catch {
      /* Shirt fallback for corrupt local image. */
    }
  if (photo) {
    const { x, y, zoom } = data.player.photo!;
    const px = 690,
      py = top + 12,
      w = 326,
      ph = 360;
    const scale =
      Math.max(w / photo.naturalWidth, ph / photo.naturalHeight) *
      Math.max(1, Math.min(3, zoom));
    const dw = photo.naturalWidth * scale,
      dh = photo.naturalHeight * scale;
    c.save();
    c.beginPath();
    c.roundRect(px, py, w, ph, 16);
    c.clip();
    c.drawImage(
      photo,
      px - ((dw - w) * Math.max(0, Math.min(100, x))) / 100,
      py - ((dh - ph) * Math.max(0, Math.min(100, y))) / 100,
      dw,
      dh,
    );
    c.restore();
  } else {
    const x = 700,
      y = top + 20;
    c.fillStyle = data.player.libero ? "#e7ddeb" : "#573066";
    c.beginPath();
    [
      [44, 0],
      [112, 18],
      [180, 0],
      [244, 58],
      [214, 112],
      [180, 94],
      [180, 285],
      [44, 285],
      [44, 94],
      [10, 112],
      [-20, 58],
    ].forEach(([a, b], i) =>
      i ? c.lineTo(x + a, y + b) : c.moveTo(x + a, y + b),
    );
    c.closePath();
    c.fill();
    text(
      String(data.player.number).padStart(2, "0"),
      x + 74,
      y + 100,
      100,
      data.player.libero ? "#573066" : white,
      true,
      130,
    );
  }
  text(
    data.rating === null ? "—" : data.rating.toFixed(1).replace(".", ","),
    64,
    top + 260,
    148,
    gold,
    true,
    220,
  );
  text("NOTA NA", 300, top + 315, 27);
  text("PARTIDA", 300, top + 352, 27);
  const base = top + 475,
    row = story ? 245 : 190;
  data.metrics.slice(0, 4).forEach((m, i) => {
    const x = 64 + (i % 2) * 500,
      y = base + Math.floor(i / 2) * row;
    c.fillStyle = "#514759";
    c.fillRect(x, y, 448, 2);
    text(m.value, x, y + 18, 89, i === 0 ? gold : white, true, 445);
    text(m.label, x, y + 122, 24, "#c2bac8", false, 445);
  });
  const foot = h - 194;
  text(
    data.note,
    64,
    story ? base + row * 2 + 28 : foot - 49,
    story ? 28 : 21,
    "#c2bac8",
    false,
    950,
  );
  c.fillStyle = "#573066";
  c.fillRect(0, foot, 1080, 194);
  text(
    `${data.team}  ${data.score}  ${data.opponent}`,
    64,
    foot + 26,
    43,
    white,
    true,
    950,
  );
  text(
    "DESEMPENHO INDIVIDUAL · SÓ NA REDE",
    64,
    foot + 104,
    23,
    white,
    false,
    950,
  );
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao exportar PNG."))),
      "image/png",
    ),
  );
}
