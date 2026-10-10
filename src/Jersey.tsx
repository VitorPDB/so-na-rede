import { useId } from "react";
export function Jersey({
  number,
  libero = false,
  children,
}: {
  number: number;
  libero?: boolean;
  children?: React.ReactNode;
}) {
  const id = useId();
  const body = libero ? "#eeece7" : "#864b92";
  const trim = libero ? "#a14149" : "#19191b";
  const ink = libero ? "#8e323c" : "#f3e8d1";
  const shape =
    "M19 5 L27 2 Q32 10 37 2 L45 5 L62 20 L55 33 L47 28 L47 72 L17 72 L17 28 L9 33 L2 20 Z";
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
        <defs>
          <clipPath id={id}>
            <path d={shape} />
          </clipPath>
        </defs>
        <path d={shape} fill={body} stroke={trim} strokeWidth="1.2" />
        <g clipPath={"url(#" + id + ")"}>
          <path
            d="M17 5 L25 32 M47 5 L39 32 M18 72 L31 53 M46 72 L33 53"
            fill="none"
            stroke={libero ? "#d2c6c6" : "#b085b7"}
            strokeWidth="1"
            opacity=".65"
          />
          <path d="M2 24 L10 32 M54 32 L62 24" stroke={trim} strokeWidth="5" />
          <path
            d="M25 2 Q32 14 39 2"
            stroke={trim}
            strokeWidth="4"
            fill="none"
          />
          <path d="M17 26 H47 M17 39 H47" stroke={ink} strokeWidth=".8" />
          {[21, 26, 31, 36, 41, 46].map((x) => (
            <path
              key={x}
              d={"M" + x + " 26 V39"}
              stroke={ink}
              strokeWidth=".3"
              opacity=".6"
            />
          ))}
          <text
            x="32"
            y="35"
            textAnchor="middle"
            fontSize="6.3"
            fontWeight="900"
            fill={ink}
          >
            SÓ NA REDE
          </text>
          <text
            x="32"
            y="59"
            textAnchor="middle"
            fontSize="22"
            fontWeight="850"
            fill={ink}
            stroke={libero ? "#eeece7" : "#3b253f"}
            strokeWidth=".7"
            paintOrder="stroke"
          >
            {String(number).padStart(2, "0")}
          </text>
          <path d="M17 71 H47" stroke={trim} strokeWidth="2" />
        </g>
      </svg>
      {children}
    </span>
  );
}
