# Avaliação por fundamento — substituição do modelo anterior

Branch: `codex/notas-abc-fundamentos`. Novas ações e fichas de pós-jogo usam a versão 4. Eventos das versões 1–3 mantêm seus cálculos anteriores; o histórico não é recalculado silenciosamente.

## Interface

A ação continua sendo escolhida antes do jogador. Qualidade e dificuldade ficam à vista; os outros critérios estão no dropdown “Contexto do lance”. Foram retirados da ficha nova o catálogo de etiquetas, o seletor duplicado de resultado/execução e a responsabilidade individual genérica. Bloqueios simples, duplos e triplos e a responsabilidade de cada participante continuam disponíveis.

Os seletores têm fundo escuro, borda discreta, indicador de abertura, foco visível e alvo mínimo de 56 px. A lista de opções usa o seletor nativo do dispositivo, permitindo uso por teclado e leitor de tela.

| Fundamento | Qualidade principal | Contexto |
|---|---|---|
| Defesa | A/B/C ou erro direto | Dificuldade, bola forte/longa/largada/de graça/desvio e técnica |
| Recepção | A/B/C ou erro direto | Dificuldade, saque recebido e técnica |
| Saque | Boa/excelente/normal/gafe/erro/ponto | Dificuldade, tipo de saque e momento |
| Ataque | Boa/excelente/normal/gafe/erro/ponto | Dificuldade, levantamento recebido A/B/C, tipo, passada e rede/fundo |
| Levantamento | Qualidade da bola entregue | Dificuldade, passe recebido A/B/C, direção e técnica |
| Bloqueio | Perfeito/efetivo/simples/direção/usado/atrasado/ausência/buraco/infração | Dificuldade, simples/duplo/triplo e participação individual |

A = bola perfeita para levantar; B = levantável com ajuste; C = ruim. Nenhuma classificação exige zona ou jogador específico. C e gafe continuam o rally; erro direto encerra com ponto deles. “Sem oportunidade real” fica fora da média. Na jogada coletiva, apenas o finalizador recebe crédito do ponto, e o time soma um ponto.

## Fórmula independente

A versão 4 não chama as fórmulas antigas nem interpreta etiquetas antigas como bônus ou penalidades.

Base em bola normal: boa 7,5; excelente 9; normal 5; gafe 3; erro direto 1; ponto bem executado 9,5. A/B/C usam respectivamente 9/7,5/3.

Bloqueio: perfeito 9,5; toque efetivo 8,5; simples 5,5; direção fechada 7,5; usado 4; atrasado 2; ausência evitável 1; buraco 2,5. Infração de bloqueio, como toque na rede, vale 0, sem atenuação por dificuldade.

Nota da ação = base + ajuste da dificuldade, limitada a 0–10. Normal recebe ajuste zero. Fácil recebe −1 × influência; difícil +1 × influência; emergência +1,5 × influência. Influência: defesa/ataque 1; recepção/levantamento 0,75; bloqueio 0,5; saque 0,25. Execução neutra permanece 5. Esses valores são calibração inicial do time, não um padrão oficial.

Assim, gafe de levantamento fácil vale 2,25; normal 3; difícil 3,75. Boa execução difícil ganha mais; gafe difícil recebe desconto menor. Uma gafe não ultrapassa 4,9 apenas pela dificuldade. Passada ruim tira até 0,25 apenas de ataque positivo, sem duplicar a penalização de uma gafe.

Tipo/técnica/direção e momento de saque são informações de análise, sem bônus por estilo. Passe recebido, levantamento recebido e bola recebida podem sugerir dificuldade; o auxiliar pode escolher manualmente. O contexto é considerado uma única vez. Origem do ataque no fundo não torna a bola automaticamente difícil.

A nota por fundamento é a média das ações avaliáveis. A nota final usa os pesos da função exercida e do contexto registrado, incluindo central no fundo sem líbero. O volume determina a amostra, não uma penalização na nota. Totais de pós-jogo não inventam ordem dos rallies nem rotação. Seus critérios e dificuldades ficam preservados nos filtros, no JSON e na exportação CSV.
