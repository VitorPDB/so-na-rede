# Estatísticas dos critérios coletados

A aba Análise → Estatísticas agora inclui “Como o time joga”, com filtros por jogador e fundamento, respeitando o recorte de set da página.

- Técnica mais usada: toque, manchete, uma mão ou recurso de emergência; mostra empate quando houver.
- Distribuição de A/B/C e erro direto em recepção/defesa.
- Dificuldade normal, fácil, difícil e emergência, usando a dificuldade efetiva do registro.
- Técnica de levantamento, passe recebido e direção; saque, momento e tipo recebido; ataque, qualidade do levantamento, passada e origem; qualidade e tipo de bloqueio.
- Quantidade, participação percentual entre detalhes informados e nota média das execuções avaliáveis de cada categoria.
- A tabela individual mostra técnica mais usada; o perfil mostra os critérios da partida atual, respeitando seu filtro de função.
- Pós-jogo por totais possui a mesma análise; a ficha completa disponibiliza esses gráficos quando aplicada à partida atual.
- Exportação CSV de critérios respeita jogador, fundamento e período.

Informações ausentes são mostradas separadamente e não entram no denominador dos percentuais. Campos antigos não são inventados. A/B/C explícitos continuam sendo reconhecidos; os padrões do modelo v4 Bom=B e Gafe=C são reconhecidos quando usados. A técnica não é deduzida do fundamento ou do papel do jogador.

Na análise coletiva, cada participante avaliável de uma jogada coletiva é uma observação; o fundamento e os critérios próprios são preservados. O número de participações pode superar o de eventos. Participantes sem responsabilidade são excluídos; ações marcadas como não avaliáveis não entram na nota média, mas um detalhe técnico informado pode aparecer na frequência.

Frequência não indica técnica superior. A nota média da categoria é a média por ação ajustada ao contexto, não a nota final por função nem um percentual de sucesso. Nenhuma nota, ponto, rotação ou informação de jogo é alterada pelo relatório.

A página dos fãs também apresenta os gráficos e filtros de jogador, fundamento e set, além do CSV. O DTO público v1 recebe um campo técnico opcional com contagens e somas de qualidade por categoria; eventos, auditoria e configurações privadas não são publicados. Publicações antigas continuam funcionando e mostram um aviso quando não incluem os detalhes técnicos. Os critérios passam a aparecer nas novas publicações depois de atualizar o app da comissão e a página pública. Não há migração SQL adicional para esta atualização. Resumos históricos sem os critérios originais não podem reconstruir detalhes que não foram guardados.

Verificado com testes de distribuições, empates, ausência de dados, participantes coletivos, totais, correção/desfazer; teste de navegador com jogador/fundamento/set, CSV, perfil, tamanhos 1024/800/390 e controles de 56 px.

A demonstração pública e seu histórico incluem critérios fictícios. Testes conferem a equivalência entre análises privadas e agregadas, privacidade, legado, conjuntos por set, CSV e layout público em tablet/celular.
