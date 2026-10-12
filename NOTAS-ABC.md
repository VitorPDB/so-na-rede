# Critérios por fundamento — 12/10/2026

Branch: `codex/notas-abc-fundamentos`, criada a partir de `codex/notas-contextuais-v2`. Inclui as notas por função, central sem líbero e vídeos das versões anteriores.

## Marcação

Recepção e defesa têm botões A/B/C no registro rápido. A ação continua sendo escolhida antes do jogador; A/B/C comuns exigem dois toques. No seletor há A/B/C e Erro direto, dificuldade e Detalhar opcional. A = bola perfeita para levantar; B = levantável com ajuste; C = ruim. Nenhuma classificação exige zona ou jogador específico. C não encerra o rally; Erro direto encerra com ponto deles.

| Fundamento | Base | Contexto / detalhes |
|---|---|---|
| Defesa | Passe A/B/C ou erro direto | Dificuldade; forte, longa, largada, bola de graça ou desvio; toque/manchete/recurso |
| Recepção | Passe A/B/C ou erro direto | Dificuldade; saque por baixo, flutuante ou viagem; toque/manchete/recurso |
| Saque | Qualidade e resultado | Dificuldade descritiva; tipo; momento normal, decisivo, após tempo ou sequência de erros |
| Ataque | Qualidade do ataque | Levantamento recebido A/B/C; dificuldade; potência, largada, colocado, explorar bloqueio ou rápida; passada boa, adaptada ou ruim; rede/fundo |
| Levantamento | Qualidade entregue | Passe recebido A/B/C; dificuldade; direção; técnica |
| Bloqueio | Qualidade/precisão individual | Dificuldade; simples, duplo ou triplo; perfeito, toque efetivo, simples, direção correta, usado, atrasado, ausência evitável ou sem oportunidade real |

Nos bloqueios coletivos, cada participante pode ter precisão própria em “Detalhar participação”. Não há multiplicação do ponto pelo número de participantes. O grupo e a responsabilidade individual foram mantidos.

## Cálculo

1. Qualidade é a base da ação. Em bola normal, A vale 9; B, 7,5; C, 3. Erro direto é separado, sem penalidade extra duplicada.
2. Ajuste de dificuldade em relação à bola normal: influência 1 em defesa/ataque, 0,75 em recepção/levantamento e 0,5 em bloqueio. São coeficientes iniciais de calibração, não percentuais somados à nota atual.
3. Tipo de bola/passe pode sugerir dificuldade quando o contexto é usado: passe/levantamento C sugere difícil; A sugere fácil; defesa forte/longa sugere difícil; desvio inesperado, emergência. Saque recebido por baixo sugere fácil; viagem, difícil. São sugestões que podem ser corrigidas manualmente; tipo não garante a dificuldade real de toda bola.
4. Escolher dificuldade manualmente prevalece sobre as sugestões. O tipo da bola não dá outro bônus pela mesma dificuldade. Salvadas não acumulam recompensas adicionais.
5. Técnica, direção, tipo de saque e momento são dados de análise, sem bônus/punição automáticos. Saque mantém nota pela qualidade. Passada ruim tem desconto máximo de 0,25 na ação positiva; não soma novo desconto a uma execução já ruim. Passada adaptada não é erro.
6. Médias por fundamento, função e cobertura permanecem sem três ações fictícias de nota 5. Quantidade de registros indica amostra, não um desconto da nota.

Pesos por posição, central sem líbero e contexto de rede/fundo continuam ativos. Um central permanecendo no fundo pode usar perfil de recepção/defesa ou defesa sem linha de passe.

## Persistência e compatibilidade

Novas ações usam avaliação v3. Eventos v1/v2 e históricos resumidos conservam suas fórmulas. Relatórios com versões diferentes avisam que a avaliação é mista. Contexto, detalhes e responsabilidade são preservados no backup e nas correções.

Pós-jogo completo usa os mesmos seletores. Fichas novas por totais aceitam critérios como filtro da tabela: cada combinação possui quantidades próprias, sem apagar outros filtros. Exportações JSON e CSV incluem os critérios. Momento automático do saque só é inferido no registro com sequência conhecida; em totais ele é informado pela comissão.

Para testar apenas os novos critérios, use uma partida de teste. A calibração ainda deve ser confrontada com observações do time; os rótulos de amostra não são uma probabilidade de certeza estatística.
