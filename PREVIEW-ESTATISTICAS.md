# Preview — estatísticas e revisão por vídeo

## Atualização mais recente — captura automática do YouTube

- Substitui a marcação manual do YouTube descrita nas seções anteriores: selecione uma gravação em Ao vivo → Marcar assistindo ao vídeo. Dê play e use os botões normais de fundamento/resultado; ao começar a ação, a API captura o horário e pausa. A seleção do jogador salva a marcação junto da ação. Use Continuar vídeo para prosseguir.
- Pós-jogo → Completar rallies também captura o horário ao clicar Marcar ação neste instante, sem digitação de segundos.
- O jogador continua sendo indicado pela comissão, não por reconhecimento facial/visual automático.
- Resumo e perfis permitem filtrar lances por jogador, outro participante, mesma ação ou mesmo rally, set, fundamento, Cartola e Emergência. Rallies são agrupados dentro de cada partida; toques sem horário também contam na identificação dos participantes quando disponíveis.
- Lances abrem três segundos antes do instante original; o horário salvo não é alterado.
- O player exige início da reprodução antes da captura e recusa horários inválidos, carregamento ou fonte diferente. CSP permite somente os caminhos oficiais do script IFrame API e widget do YouTube, mantendo iframe em youtube-nocookie.
- 131 testes passaram, incluindo captura anterior à pausa, recusa de player inválido, filtros de dupla, dados antigos, auditoria e persistência. Build passou.

17/10/2026. Implementação local, sem commit, push ou publicação.

## Abrir

`http://127.0.0.1:4175/?view=commission`

Para reiniciar: `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort`.
O build está em `dist`. Esta origem tem armazenamento separado do site publicado.

## Onde testar

- Análise → Estatísticas → Resumo: pontos de ataque, aces, duplas com mais pontos de bloqueio, distribuição do levantador e direções, com contagens e cobertura. Detalhado mantém o relatório anterior.
- Time → perfil: atacantes mais acionados na carreira, considerando partidas encerradas com vínculos disponíveis; não reconstrói dados ausentes dos resumos antigos.
- Contexto do lance: bola forçada no levantamento; motivo da devolução no ataque do tipo Passou de graça. Esses campos não alteram a nota.
- Partida → Pós-jogo → Completar rallies · vídeo: selecione um rally encerrado, abra o vídeo local e marque ações em ordem. O instante é capturado antes do preenchimento. Ações de continuidade são inseridas antes do encerramento; detalhar o ponto substitui sua classificação, preservando vencedor e placar. Desfazer e correções continuam auditados.
- O player também está na ficha completa do pós-jogo para reconstrução de uma partida.

## Limites desta versão

- Novos cartões ficam na comissão. Os critérios novos seguem o contrato de distribuição pública existente, mas os cartões e vínculos de parceria não foram adicionados à página de fãs.
- Revisão direta por rally opera sobre a partida atual, inclusive encerrada. Resumos antigos não guardam necessariamente as ações completas.
- Vídeo é aberto localmente, sem upload, análise automática ou sincronização entre aparelhos. Ao reabrir, selecione o mesmo arquivo; marcações guardam nome, tamanho e data de modificação para conferir a origem.
- O levantamento precisa ser seguido pelo ataque correspondente no mesmo rally para formar uma parceria. Sem vínculo, fica fora do denominador; não há atribuição por adivinhação.
- A fila destaca pontos ainda sem fundamento identificado; não certifica que todos os toques de um rally foram registrados.
- `robots.txt` solicita restrição a rastreadores de treinamento. Não obriga IAs a recusar cópia e não bloqueia screenshots ou cópia manual.
- O problema preexistente de nota de Tirou da cartola não foi alterado.
- Antes de publicar os novos critérios, executar o arquivo atualizado `supabase/security-schema.sql` inteiro no Supabase. Nenhum SQL remoto foi executado nesta tarefa.

## Verificação

- 124 testes passaram, incluindo seis novos testes de estatísticas/complementação, placar, rotação, serialização, correção, desfazer e reinício de set.
- Build de produção e geração do contrato SQL passaram.
- Conferido no navegador: navegação, formulário e salvamento de fundamento em rally existente preservando 1–0, relatório resumido e persistência ao recarregar.
- Reprodução com um arquivo real de partida ainda deve ser conferida no aparelho do usuário; nenhum vídeo pessoal foi fornecido ou enviado.

## Atualização — Cartola, Emergência e vídeos nos perfis

- Resumo agora tem cartões Tirou da cartola e Emergência com a lista de lances e acesso ao vídeo quando houver horário e origem identificados. Um mesmo lance pode entrar nos dois cartões. Emergência acompanha `effectiveDifficulty`, sem mudar notas.
- Perfil tem gravações das partidas e lances do jogador, incluindo participações coletivas. Novos históricos guardam as marcações; dados antigos sem marcações não são reconstruídos automaticamente.
- Na revisão de rallies, vídeos do YouTube anexados à partida podem ser associados ao lance, informando o instante em segundos. A fonte e o horário ficam juntos. A captura automática do relógio do player do YouTube ainda não foi implementada.
- Os lances do YouTube abrem dentro do site no horário marcado; há link externo alternativo se o canal bloquear a incorporação. Não há reconhecimento automático de ações por IA.
- Política de mídia permite arquivos locais via `blob:`; o player do YouTube continua restrito ao domínio já autorizado.
- 127 testes passaram e o build passou. Conferidos no navegador os novos cartões e a seção de vídeos no perfil. Nenhum vídeo do time estava anexado no armazenamento isolado do preview para validar a reprodução específica do canal.
