/**
 * Camisa do time, simplificada: corpo roxo, gola V e punhos pretos com filete
 * dourado, faixa branca da rede no peito e número branco com contorno dourado.
 * Líbero: branca e vermelha. Mesmas props de antes; só o desenho mudou.
 */
export function Jersey({
  number,
  libero = false,
  children,
}: {
  number: number;
  libero?: boolean;
  children?: React.ReactNode;
}) {
  const red = "#b3262e";
  const body = libero ? "#f7f5f2" : "#5e1f99";
  const trim = libero ? red : "#16121a";
  return (
    <span className={"jersey uniform " + (libero ? "libero" : "")}>
      <svg
        viewBox="0 0 64 76"
        aria-label={
          libero
            ? "Uniforme branco e vermelho de líbero"
            : "Uniforme roxo Só na Rede"
        }
        role="img"
      >
        <path
          d="M21 5 L11 9 L2 21 L10 30 L16 26 V71 H48 V26 L54 30 L62 21 L53 9 L43 5 Z"
          fill={body}
          stroke={libero ? red : "var(--c-jersey-line, transparent)"}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path
          d="M3 22.2 L10.5 29 M61 22.2 L53.5 29"
          stroke={trim}
          strokeWidth="4.5"
          fill="none"
        />
        <path
          d="M21 5 L32 18 L43 5"
          stroke={trim}
          strokeWidth="4"
          strokeLinejoin="round"
          fill="none"
        />
        {!libero && (
          <path
            d="M23.6 6.6 L32 15.6 L40.4 6.6"
            stroke="#d9a520"
            strokeWidth="1.2"
            fill="none"
          />
        )}
        <path
          d="M16 31 H48"
          stroke={libero ? red : "#ffffff"}
          strokeWidth="1.3"
        />
        <text
          x="32"
          y="59"
          textAnchor="middle"
          fontSize="24"
          fontWeight="800"
          fill={libero ? red : "#ffffff"}
          stroke={libero ? "none" : "#d9a520"}
          strokeWidth="1.1"
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {String(number).padStart(2, "0")}
        </text>
      </svg>
      {children}
    </span>
  );
}
