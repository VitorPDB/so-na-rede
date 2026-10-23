# Só na Rede — design system (fase 1)

## Arquivos

| Arquivo                                         | Papel                                                                                                                                                                                                           |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/styles/tokens.css`                         | Fonte única de cor, tipografia, espaço (grade de 4 px), raios, sombras, movimento e camadas. Temas `dark`, `team` e `light`.                                                                                    |
| `src/styles/ui.css`                             | Primitivas (`ui-btn`, `ui-icon-btn`, `ui-segmented`, `ui-switch`, `ui-rating`, `ui-eyebrow`, `ui-skeleton`) e estrutura do app: barra lateral, barra inferior, cabeçalho, snackbar, drawer, desfazer flutuante. |
| `src/styles/live.css`                           | Tela Ao vivo: placar, quadra, registro de ação, pulso, últimas ações e seletor de jogador.                                                                                                                      |
| `src/live/*.tsx`                                | Componentes da tela Ao vivo, extraídos do `App.tsx`.                                                                                                                                                            |
| `src/styles/prep.css`, `src/prep/*.tsx`         | Tela Preparação: stepper, dados da partida, editor de formação (`FormationEditor`) e conferência.                                                                                                               |
| `src/styles/pages.css`, `src/pages/*.tsx`       | Análise, Estatísticas (`Report`), Time (`Roster`, perfil, formações) e Ajustes (`Settings`). Componentes compartilhados: `ui-chips`, `ui-table`, `ui-meter`, `ui-empty`, `ui-note`.                             |
| `src/theme.ts`                                  | Leitura, gravação e aplicação do tema (também atualiza `theme-color`).                                                                                                                                          |
| `src/styles/index.css`, `src/styles/legacy.css` | Entrada única e compatibilidade para avaliação, pós-jogo e componentes compartilhados. Seletores sem uso foram removidos; as cores seguem os tokens.                                                            |

## Regras

- **Cores:** use apenas `var(--c-*)`. Rampas: neutros (`bg`, `surface-1…4`, `border*`, `text*`), `accent` (roxo), `gold`, `pos` (Bom/nosso), `warn` (Gafe), `neg` (deles), `info`. Somente cores sólidas.
- **Espaço:** `--sp-1` (4 px) a `--sp-16` (64 px).
- **Alvos de toque:** `--tap` e `--tap-sm` têm 56 px. Variações compactas reduzem texto e padding, sem reduzir o alvo de toque.
- **Movimento:** `--dur-1…4` (90–320 ms) com `--ease-out` / `--ease-spring`. Nada atrasa o próximo toque. `prefers-reduced-motion` zera as durações.
- **Breakpoints:** celular < 640 · tablet 640–959 · paisagem ≥ 960 (barra lateral compacta) · amplo ≥ 1280 (barra lateral completa). Ajustes extras para altura ≤ 700 px (Galaxy Tab A9 em paisagem).
- **Fonte:** Atkinson Hyperlegible Next Variable no texto e Big Shoulders Display Variable nos títulos/placares, ambas empacotadas localmente, pré-carregada pelo service worker para funcionar offline.

## Fora do escopo desta reestruturação

Pós-jogo mantém sua ficha completa com cores por token. A página pública foi migrada para `src/styles/public.css`, compartilhando tokens, cartões e controles de 56 px. O CSS de compatibilidade está consolidado em `src/styles/legacy.css`; os dois arquivos antigos foram removidos. O Tailwind examina somente src, sem incluir backups ou cópias de revisão.

## Refinamentos — 23/10/2026

- Placar da comissão em celular: times em duas colunas; números em linha própria. Preservar as cores aprovadas.
- Painéis modais usam dialog nativo, fundo inerte e retorno de foco.
- Feed: capacidade de entrada define deslize ou botões; largura define somente composição. Controles de teclado continuam acessíveis no toque.
- Alternadores usam grupo compacto com seleção explícita; filtros de vídeos ficam em expansor com resumo e limpeza.
- Login dos jogadores separa escolha e senha em duas etapas.
- Temas e tipografia existentes preservados; indicadores de foco usam tokens do tema.
