# Revisão de interface — Só na Rede

22/10/2026 · base Git 6960bd3 · modo Operate.

## Veredito

A interface tem identidade própria e coerente: uniforme, quadra, roxo/dourado, tipografia de placar e ícones de fundamentos. Preservar essa direção. As prioridades são legibilidade móvel, navegação acessível e consistência dos controles, não um rebrand.

## Método e limites

Auditoria técnica manual orientada por Impeccable audit, com inspeção visual; não é a execução formal de critique com duas avaliações independentes. O launcher de contexto e o detector foram tentados, mas o engine 0.1.16 não está instalado e o cache não pôde ser criado. Não há resultados automatizados do detector nem certificação WCAG.

PRODUCT.md e DESIGN.md não existem; usados CONTEXTO-PROJETO.md, DESIGN-SYSTEM.md e implementação atual. Nenhuma alteração de código de produção, dados de partidas, SQL ou identidade visual. Apenas este relatório e arquivos locais ignorados de inspeção.

Conferidos no navegador: Ao vivo, Preparação (etapa inicial), Pós-jogo (rallies vazios), Análise, Estatísticas/resumo, Elenco, Perfil, Ajustes, painel de substituições, página pública de demonstração e entrada dos jogadores. Feed também conferido nesta sessão anterior, com dados fictícios. PC: viewport principal e iframe 1366×900; celular: iframe 390×844. Isso verifica layout, não equivale a ensaio em telefone físico. Não foram sintetizados gestos touch.

Código inspecionado: componentes compartilhados, tokens/CSS, rotas, relatórios, perfil, área dos jogadores, vídeos, estrutura do pós-jogo e persistência já documentada. Dashboard autenticado dos jogadores, partidas longas, todos os estados de erro e matriz completa de temas/tamanhos não foram exercitados. Supabase local não configurado; isso não demonstra falha de produção. O servidor 4176 já estava em execução e foi preservado.

## Nota técnica provisória

| Dimensão | Nota / 4 | Evidência principal |
|---|---:|---|
| Acessibilidade | 2 | Foco escapa do painel modal; navegação do feed depende de toque em telas estreitas |
| Performance | 3 | Rotas lazy e fontes locais; relatório detalhado continua montado quando oculto |
| Temas | 3 | Tokens bem estabelecidos; foco do seletor publicado usa cor fixa |
| Responsividade | 2 | Placar da comissão sobrepõe nomes/números em 390 px |
| Consistência de implementação | 3 | Sistema coerente, mas controles novos divergem das primitivas existentes |
| Total | 13/20 | Aceitável, com correções importantes |

Notas são julgamento de revisão, não métricas de laboratório. Performance não foi medida em aparelho de baixo desempenho.

## Achados priorizados

### 1. [P1] Placar da comissão se sobrepõe no celular
- Local: src/styles/identity.css:155 e :178; src/styles/live.css:308; src/live/Scoreboard.tsx.
- Evidência: em 390 px, Só na Rede e Visitantes disputam o mesmo espaço dos números 00. Há corte/sobreposição já com nomes normais.
- Causa: regras de identidade carregadas depois do layout móvel voltam a ampliar tipografia. O grid precisa acomodar nomes, escudos e números separadamente.
- Impacto: leitura do elemento central durante uma partida fica prejudicada. Relacionado a reflow WCAG 1.4.10.
- Recomendação: preservar blocos de cor, mas reservar linhas/áreas próprias para nome, escudo e pontos; usar o placar público como referência de acomodação. Testar 320/390/640 px, nomes longos e zoom.
- Comando: `$impeccable adapt`.
- Evidência visual: .qa/audit-placar-mobile.png.

### 2. [P1] Foco escapa de painel anunciado como modal
- Local: src/App.tsx:1182–1218.
- Evidência reproduzida: abrir Trocas e líbero, foco em Fechar painel, Shift+Tab leva a Definir formação inicial no conteúdo atrás. `aria-modal` não torna o fundo inerte.
- Impacto: teclado pode operar conteúdo encoberto; a experiência não corresponde à semântica modal. WCAG 2.4.3 e padrão de diálogo modal.
- Recomendação: reutilizar diálogo nativo ou implementar contenção de foco, fundo inerte e retorno ao acionador. Preservar Escape e fechamento sem gravar.
- Comando: `$impeccable harden`.

### 3. [P1] Feed perde navegação em PC estreito e teclado mobile
- Local: src/styles/skill-icons.css:223; src/MomentFeed.tsx:97.
- Evidência por código: largura até 600 px oculta botões em qualquer dispositivo; a única alternativa usa onTouchStart/onTouchEnd. Um PC com janela estreita não tem como avançar com mouse/teclado. A área não recebe foco nem responde a teclas.
- Impacto: bloqueia troca de lance em condição válida; WCAG 2.1.1.
- Recomendação: manter a preferência aprovada (mobile deslize, PC botões), distinguindo capacidade de entrada de largura. Oferecer equivalente acessível por teclado/leitor sem recolocar botões visuais no mobile.
- Comando: `$impeccable adapt`.
- Limite: falha deduzida diretamente dos handlers/CSS; gesto físico não testado.

### 4. [P1] Foco com contraste insuficiente no tema claro
- Local: src/styles/player-portal.css:136–139.
- Evidência: outline fixo #c49bd4 no seletor de partidas. Contraste calculado: 2,34:1 contra branco; 2,17:1 contra surface-2; 2,01:1 contra surface-3 claros, abaixo de 3:1 para indicador de estado (WCAG 1.4.11).
- Recomendação: usar token de foco/accent do tema, não o roxo claro fixo. Verificar visualmente foco nos três temas.
- Comando: `$impeccable harden`.

### 5. [P2] Alternadores do resumo não parecem um grupo
- Local: src/pages/Report.tsx:73–104; src/styles/pages.css:162.
- Evidência visual: Resumo e Detalhado ficam em extremos opostos; Jogo completo e Set 1 também. Ambos têm aparência muito semelhante apesar de aria-pressed diferente.
- Impacto: seleção atual e relação entre opções ficam menos claras que as abas já existentes.
- Recomendação: usar o padrão segmentado/chips existente, agrupado, com seleção visual explícita e recorte em grupo separado.
- Comando: `$impeccable polish`.

### 6. [P2] Filtros e estados vazios ocupam espaço sem orientar
- Local: src/MomentBrowser.tsx:45–196; src/SimpleStats.tsx; src/PlayerProfile.tsx; src/PlayerVideos.tsx.
- Evidência: mesmo com zero vídeos, aparecem todos os filtros e botão desativado; mensagem diz que nenhum lance corresponde aos filtros, embora ainda não haja marcações. Perfil vazio repete vários cartões sem informação. Em 390 px, cinco seletores empilhados atrasam o acesso à lista.
- Recomendação: distinguir “sem vídeo/marcação” de “nenhum resultado”; primeiro oferecer próxima ação apropriada à comissão/jogador. Agrupar filtros secundários em expansor, mantendo resumo dos ativos e limpar filtros.
- Comando: `$impeccable distill` e `$impeccable clarify`.

### 7. [P2] Login exige rolar a lista inteira após escolher jogador
- Local: src/PlayerPortal.tsx:191–249; src/styles/player-portal.css:4–22.
- Evidência: em 390 px a grade vira uma coluna de 10 cartões de pelo menos 80 px com gaps. O formulário de senha é renderizado depois de todos eles. Escolher um dos primeiros nomes não aproxima nem foca o campo.
- Impacto: a pessoa toca no nome, mas o próximo passo fica longe, fora da tela. É o mesmo tipo de deslocamento que incomodava nos vídeos.
- Recomendação: escolha → etapa de senha junto ao jogador selecionado, com voltar/trocar jogador. Não alterar autenticação ou regras de privacidade.
- Comando: `$impeccable adapt`.
- Limite: autenticação real não exercitada; observação de layout e fluxo de seleção.

### 8. [P2] Relatório detalhado é calculado e montado no modo resumido
- Local: src/pages/Report.tsx:30–69 e :106.
- Evidência: cálculo de estatísticas por jogador e JSX detalhado acontecem antes/independentemente da seleção; `hidden` oculta visualmente, não evita renderização.
- Impacto potencial: trabalho desnecessário em partidas extensas, especialmente tablet. Sem medição não afirmo lentidão perceptível.
- Recomendação: montar o bloco detalhado sob demanda e compartilhar/memorizar agregações quando houver ganho medido. Medir com partida longa antes/depois.
- Comando: `$impeccable optimize`.

### 9. [P3] Documentação visual desatualizada
- Local: DESIGN-SYSTEM.md, regra de fonte.
- Evidência: documento cita Inter; tokens e fontes atuais usam Atkinson Hyperlegible Next e Big Shoulders Display. Breakpoints novos 600 px também diferem da regra geral 640 px.
- Impacto: futuras mudanças podem seguir uma referência antiga e produzir inconsistência.
- Recomendação: documentar o sistema existente, sem substituir fontes/cores. Não corrigido como efeito colateral da revisão.
- Comando: `$impeccable document`.

Total: 0 P0, 4 P1, 4 P2, 1 P3.

## Manter

- Paleta aprovada, fontes atuais, escudos, uniformes e bonequinhos dos fundamentos.
- Preparação em etapas e navegação principal por tarefas.
- Botões grandes, textos nos ícones, alvos de toque de 56 px na base.
- CardSelect com busca, Escape e retorno ao acionador; PlayerChooser já tem contenção de Tab e restauração de foco.
- Placar público com acomodação melhor no celular.
- Distinção entre zero e ausência de avaliação, amostras e explicações dos critérios.
- Modal de vídeo abre o lance sem exigir subida de página; borda dourada não depende só de cor, pois há texto Ponto nosso.
- Separação de rotas e carregamento lazy; não há motivo nesta revisão para trocar stack ou refazer marca.

## Ordem recomendada

1. `$impeccable adapt`: placar, dispositivos de entrada do feed e continuidade do login.
2. `$impeccable harden`: foco dos painéis e contraste.
3. `$impeccable distill` / `$impeccable clarify`: filtros e estados sem dados.
4. `$impeccable optimize`: só após medir partidas extensas.
5. `$impeccable document`: atualizar referência visual por pedido explícito.
6. `$impeccable polish`: unificar alternadores, espaçamento e acabamento; depois repetir auditoria.

Não aplicar redesenho amplo: a maior melhoria vem de corrigir fluxo e responsividade mantendo a identidade.

## Correções aplicadas — 23/10/2026

Os itens acima registram o diagnóstico anterior. Na branch `codex/continuidade-e-acabamento`, foram aplicadas correções aos nove itens: placar móvel, dialog nativo para painéis, navegação conforme dispositivo de entrada, foco com token do tema, alternadores agrupados, filtros recolhíveis/estados vazios, seleção seguida pelo PIN, montagem condicional dos detalhes e atualização da documentação visual.

Verificação: 134 testes e build aprovados. Conferência no navegador do placar a 390 px, foco e Escape no painel, foco da senha ao escolher jogador e avanço do feed em janela estreita com mouse. Não foi medido desempenho em partidas extensas nem testado gesto em aparelho físico; não se afirma ganho quantitativo.
