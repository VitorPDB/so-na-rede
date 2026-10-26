import type { SocialCardData } from "./socialCardData";
export async function renderSocialCard(
  data: SocialCardData,
  story: boolean,
  hero = 0,
) {
  const highlight = !!data.highlight,
    photo = data.player.photo?.dataUrl ?? "";
  const choices = data.metrics.filter((m) => !m.label.includes("ERROS"));
  const principal =
    hero === -1
      ? {
          label: "NOTA NA PARTIDA",
          value:
            data.rating === null
              ? "—"
              : data.rating.toFixed(1).replace(".", ","),
        }
      : (choices[hero] ?? choices[0]);
  const secondary = choices.filter((m) => m !== principal).slice(0, 2);
  await document.fonts.ready;
  await Promise.all([
    document.fonts.load('750 120px "Big Shoulders Display Variable"'),
    document.fonts.load('500 28px "Atkinson Hyperlegible Next Variable"'),
  ]);
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = story ? 1920 : 1350;
  const c = canvas.getContext("2d")!,
    h = canvas.height,
    top = story ? 170 : 70,
    white = highlight ? "#23162e" : "#efecf2",
    gold = highlight ? "#35203f" : "#f0c66a",
    muted = highlight ? "#503747" : "#c9c2ce",
    bg = highlight ? "#e6bd66" : "#18161b";
  c.fillStyle = bg;
  c.fillRect(0, 0, 1080, h);
  if (highlight) {
    c.fillStyle = "#35203f";
    c.fillRect(0, 0, 1080, top + 78);
    c.fillStyle = "#c99a43";
    c.beginPath();
    c.moveTo(780, top + 78);
    c.lineTo(1080, top + 78);
    c.lineTo(1080, h);
    c.lineTo(500, h);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = highlight ? "#b1863b" : "#32283b";
  c.lineWidth = 2;
  c.strokeRect(60, top + 125, 960, story ? 1070 : 700);
  c.beginPath();
  c.moveTo(60, top + 430);
  c.lineTo(1020, top + 430);
  c.stroke();
  if (highlight) {
    c.strokeStyle = "#e6bd66";
    c.lineWidth = 3;
    c.strokeRect(16, 16, 1048, h - 32);
  }
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    color = white,
    font = "Big Shoulders Display Variable",
    max = 960,
  ) => {
    c.fillStyle = color;
    c.font = `750 ${size}px "${font}"`;
    while (c.measureText(s).width > max && size > 14) {
      size -= 2;
      c.font = `750 ${size}px "${font}"`;
    }
    c.fillText(s, x, y);
  };
  const load = async (src: string) => {
    const i = new Image();
    i.src = src;
    await i.decode();
    return i;
  };
  try {
    const logo = await load("/team-logo-transparent.png");
    c.drawImage(logo, 64, top - 12, 76, 76);
  } catch {
    /* Export remains available offline without the crest. */
  }
  text("SÓ NA REDE", 158, top + 36, 36, highlight ? "#f3d894" : white);
  text(
    highlight ? "DESTAQUE DA PARTIDA" : "MOMENTO SÓ NA REDE",
    660,
    top + 29,
    24,
    highlight ? "#f3d894" : muted,
    "Atkinson Hyperlegible Next Variable",
    350,
  );
  const imageTop = top + 100,
    imageHeight = story ? 800 : 490;
  text(
    String(data.player.number).padStart(2, "0"),
    85,
    imageTop + imageHeight - 25,
    story ? 740 : 530,
    highlight ? "#bc8b37" : "#473052",
  );
  if (photo) {
    try {
      const img = await load(photo);
      const scale = Math.min(800 / img.width, imageHeight / img.height);
      c.drawImage(
        img,
        (1080 - img.width * scale) / 2,
        imageTop + imageHeight - img.height * scale,
        img.width * scale,
        img.height * scale,
      );
    } catch {
      /* The large jersey number is the fallback. */
    }
  }
  const nameY = imageTop + imageHeight + 80;
  c.fillStyle = highlight ? "#35203f" : bg;
  c.fillRect(0, nameY - 65, 1080, 150);
  text(
    data.player.name.toUpperCase(),
    64,
    nameY,
    110,
    highlight ? "#f3d894" : white,
  );
  text(
    data.player.libero
      ? "LÍBERO"
      : (data.player.positions[0] ?? "JOGADOR").toUpperCase(),
    68,
    nameY + 43,
    24,
    highlight ? "#e1cce9" : muted,
    "Atkinson Hyperlegible Next Variable",
  );
  const primaryY = nameY + 195,
    metric = [principal.value, principal.label];
  text(
    metric[0],
    64,
    primaryY,
    150,
    gold,
    "Big Shoulders Display Variable",
    290,
  );
  text(
    metric[1],
    380,
    primaryY - 10,
    36,
    white,
    "Big Shoulders Display Variable",
    630,
  );
  if (principal.label === "PRECISÃO DE ATAQUE")
    text(
      "Ataques sem erro / total de ataques",
      380,
      primaryY + 26,
      22,
      muted,
      "Atkinson Hyperlegible Next Variable",
      630,
    );
  const bottom = primaryY + 112;
  c.strokeStyle = highlight ? "#805a2e" : "#625b6b";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(64, bottom - 55);
  c.lineTo(1016, bottom - 55);
  c.stroke();
  secondary.forEach((m, i) => {
    const x = 64 + i * 500;
    text(
      m.value,
      x,
      bottom + 5,
      58,
      white,
      "Big Shoulders Display Variable",
      120,
    );
    text(
      m.label,
      x + 130,
      bottom,
      22,
      white,
      "Atkinson Hyperlegible Next Variable",
      340,
    );
  });
  const footer = h - (story ? 180 : 88);
  text(
    `${data.team} ${data.score} ${data.opponent}`,
    64,
    footer,
    31,
    white,
    "Big Shoulders Display Variable",
  );
  text(
    `${data.date ? new Date(data.date + "T12:00:00").toLocaleDateString("pt-BR") : ""}${data.finished ? " · FIM DE JOGO" : " · PARCIAL"}`,
    64,
    footer + 40,
    20,
    muted,
    "Atkinson Hyperlegible Next Variable",
  );
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(Error("Não foi possível gerar o card."))),
      "image/png",
    ),
  );
}
