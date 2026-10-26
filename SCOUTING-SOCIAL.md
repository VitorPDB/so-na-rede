# Scouting, cards e Reels — 25/10/2026

## Ativar online

Antes de publicar este código, rode `supabase/social-reels.sql` inteiro no SQL Editor do Supabase já configurado. Não recria PINs. Atualiza a publicação para incluir cards privados na mesma transação e libera somente os metadados dos lances de vídeos publicados para a seção pública de Reels.

Depois do deploy, republique cada partida para disponibilizar os novos cards na área dos jogadores. Reels de partidas já publicadas aproveitam as marcações existentes quando a gravação está anexada à publicação. Jogadores só obtêm seu próprio card mediante sessão válida; detalhes dos colegas permanecem privados. A comissão pode exportar os cards dos jogadores no perfil de cada um.

## Uso

- Comissão → Partida → selecione uma gravação → **Abrir scouting em tela cheia**. Escolha fundamento, Bom/Gafe/+1 nós/+1 eles, ajuste os critérios reais e escolha jogador/participantes. O horário é capturado no primeiro toque, antes de pausar; seek/replay não o substituem. Desfazer usa a auditoria existente. Vídeo e controles ficam juntos em retrato e lado a lado em paisagem. Rolagem dos detalhes não remove o player.
- Ao trocar de aba na comissão, o player é desmontado após guardar sua posição. A gravação volta pausada no mesmo instante. Posição isolada por partida, set, ID do vídeo e início configurado, na sessão deste navegador. Não sincroniza esse relógio entre aparelhos. A seleção do vídeo precisa ser refeita após recarregar a página; seu horário é recuperado ao selecioná-lo.
- Time → perfil → **Criar card da partida**. Foto e enquadramento do perfil; camisa como fallback. PNG em 1080×1350 ou 1080×1920. Compartilhar usa o menu do aparelho quando disponível; Baixar PNG funciona como alternativa.
- Jogadores → próprio perfil → **Meu card para compartilhar** → carregar e exportar. A imagem compartilhada divulga voluntariamente aqueles números ao destinatário.
- Público → **Reels** (`#reels`). Miniaturas com carregamento adiado, 36 cartões por lote, vídeos abertos sob demanda. Links `?view=public&match=…&moment=…#reels` abrem a jogada. Os perfis mantêm lances filtrados do jogador, sem criar outro feed geral.

## Definições e limites

Nota usa o cálculo do app. Pontos e aces seguem os resultados das ações. Bloqueios pontuados incluem a participação registrada na ação coletiva, sem multiplicar o placar do time. Eficiência de ataque = (pontos de ataque − erros diretos de ataque)/ataques registrados, podendo ser negativa. Líbero usa A+B/recepções com ABC, A/recepções com ABC, defesas registradas, erros de recepção e nota de passe. A amostra ABC aparece no rodapé; dados ausentes não viram porcentagens inventadas. O papel de líbero segue o cadastro do jogador. Os cards são da partida atual/selecionada, não da carreira.

## Validação

139 testes passaram: incluindo recalcular card após desfazer, templates de líbero, ausência de ABC, posições isoladas de vídeo e testes PostgreSQL de publicação atômica/retry, RLS, sessão expirada e card restrito ao dono. Conferência de UI com componentes reais e YouTube simulado: troca de aba preservou 368 s; seek posterior para 373 s não mudou o evento registrado em 368000 ms. Retrato de 390 px conferido. Build validado separadamente. A execução com YouTube real, Supabase remoto e menu nativo de compartilhamento ainda depende do ambiente publicado.

Renderização PNG ocorre somente ao abrir o exportador; nenhuma biblioteca adicional em produção. Fotos são reutilizadas da mídia existente e não duplicadas no payload dos cards. A projeção é calculada uma vez para gerar os cards da equipe por publicação. Reels não montam iframes antes da escolha. Nenhuma compactação/remoção do histórico foi feita nesta entrega.


## Atualização — 26/10/2026

- Comissão: seletor permanente de partida com busca por adversário/data, relatório do histórico e criação com adversário/data. A partida ativa não é substituída ao consultar um relatório antigo. Nova partida mantém a rotina de backup completo e arquivamento existente.
- Exclusão remove o relatório do histórico contido no jogo atual, inclusive de sua sincronização privada quando vinculada. Desfazer fica disponível enquanto este jogo/página permanecer aberto. Não apaga publicações públicas, partidas independentes da conta nem backups. O diálogo explica esse alcance.
- Precisão de ataque = (ataques − erros diretos)/ataques; bolas mantidas entram. Sem tentativas: traço. Sem aces, o card ofensivo mostra defesas sem erro com dificuldade difícil/emergência registrada; ausência de classificação não é inferida.
- Card: pôster com foto inteira (sem remoção automática de fundo), uma conquista escolhida no exportador e dois números complementares, sem erros. Formatos feed/story. Sem foto: número grande do uniforme.
- Comissão → Time → perfil: marcar Destaque da partida. Um jogador por jogo; seleção manual, persistida, sincronizada e incluída na publicação. Tema dourado predominante com roxo e preto; o jogador recebe a seleção da comissão e não pode conceder o selo no portal.
- Não exige SQL adicional à migração social-reels já entregue. Republicar a partida atualiza cards e destaque no portal. Cards antigos não republicados mantêm as métricas anteriores.
- Build e testes locais validados. Conferência visual interativa desta atualização pendente: ferramenta de controle do navegador indisponível nesta sessão. O preview aprovado permanece separado em .qa.
