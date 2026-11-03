# Só na Rede — contexto para continuar em outra conversa

Atualizado em **31/10/2026**, após conferir código, documentação e Git locais. Último deploy confirmado nesta conversa: **29/10/2026**, commit `184c9e3`, produção READY na Vercel.

Este arquivo registra decisões, implementação e propostas. **Proposta não significa funcionalidade implementada nem autorização para executá-la.** Na nova conversa, leia este contexto, confira os arquivos atuais e siga o próximo pedido do Vitor. Não recomece o projeto nem implemente todo o backlog automaticamente.

## 1. Projeto, usuário e ambiente

- Usuário: Vitor. Conversa em português brasileiro, direta e informal; prefere respostas breves, explicações simples e comandos prontos para copiar.
- Aplicativo do time amador intermediário de vôlei indoor **Só na Rede**, destinado à comissão técnica e com página pública para familiares/fãs.
- Repositório: `https://github.com/VitorPDB/so-na-rede.git`.
- Pasta: `C:\Users\vitor\OneDrive\Documentos\ChatGPT\app volei`.
- Windows / PowerShell; fuso America/Sao_Paulo.
- Principal dispositivo em quadra: Samsung Galaxy Tab A9, paisagem. Funcionar também em retrato, PC e celular.
- Objetivos: registrar rallies rapidamente, manter placar/rotações, calcular estatísticas e notas por função, consultar partidas antigas e publicar informações ao vivo.
- Prioridades recorrentes: preservar dados, poucos toques, baixa taxa de erro, interface legível e nenhuma alteração visual grande sem pedido.
- Vitor já perdeu uma partida ao recarregar uma versão antiga. Preservação de dados e compatibilidade de backups são requisitos críticos.

## 2. Stack e execução

- React 19 + TypeScript + Vite 6 + Tailwind 4, com bastante CSS próprio.
- Ícones lucide-react; fontes locais Atkinson Hyperlegible Next e Big Shoulders Display.
- PWA / service worker, uso offline e persistência local com redundância.
- Supabase: Auth, Postgres, RLS, RPC e Realtime.
- Hospedagem usada: Vercel, integrada ao GitHub/main. Cloudflare também tem configuração/documentação, mas não é o fluxo atual principal.
- Site: `https://so-na-rede.vercel.app`.
- Comissão: `https://so-na-rede.vercel.app/?view=commission`.
- Fãs: `https://so-na-rede.vercel.app/?view=public`.
- Preview local mais recente: `http://127.0.0.1:4176/?view=commission`; não presumir que o processo continuará rodando.
- Demonstração pública: `/?view=public&demo=1`.
- Rotas são query parameters de uma SPA. Com cloud configurado, o acesso sem `view=commission` abre o público.

Comandos:

```powershell
cd "C:\Users\vitor\OneDrive\Documentos\ChatGPT\app volei"
npm ci
npm test
npm run security:schema
npm run build
npm run preview -- --port 4173
```

`security:schema` deve ser executado depois de alterar o contrato público/enumerações usadas nas estatísticas. O build não o executa automaticamente: usa o SQL gerado que está no repositório.

Em sessões anteriores, Node/esbuild/Playwright e alterações em `.git` exigiram execução com permissão ampliada. Não mascarar falhas de ferramenta como sucesso. Vite Preview sozinho não instala os headers da Vercel.

## 3. Estado do Git e publicação

- Branch verificada: **main**, HEAD `184c9e3b8b3b227b322c8c019dc8cd4d2ec3250e` — `Permite selecionar o libero da partida pelas tags do elenco`.
- Commit e push realizados a pedido do usuário em 29/10. A referência local `origin/main` coincide com HEAD em 31/10; não foi feito novo fetch nesta revisão documental.
- Deploy Git de produção confirmado como READY, com o mesmo SHA e aliases atribuídos: `dpl_Cc396q6mJLzTSVqtuYBZAVVX2UEd`, domínio `https://so-na-rede.vercel.app`. Projeto Vercel `so-na-rede` (`prj_Tn82xRebq8kRyzs27y4LoXD1XGqb`), time `so-na-rede` (`team_VneHRHB9ulmmfjjE6Z4ECNxb`). Não foi necessário redeploy manual duplicado: o push iniciou a publicação.
- Commits anteriores relevantes, todos ancestrais de HEAD:
  - `dd5c9d8`: miniquadras, bonecos, fundamentos e trajetórias.
  - `d8a0282`: IndexedDB e redução de duplicação de fotos/históricos.
  - `9b5c54b`: retomada da publicação após transferência entre aparelhos.
  - `93acea4`: foto do card, toggle de craque e quota.
  - `d59682c`: troca integral de contexto histórico e filtro de publicações parciais.
  - `cd967da`: portal público sem PIN e direção do ataque.
  - `cc02252`: seleção de partidas e destaque manual dourado.
  - `69dce19` / `5ae929c`: Reels/cards e scouting fullscreen/posição do vídeo.
  - `eed6580`: continuidade privada entre aparelhos.
- **Código local não commitado: tentativa de corrigir Samsung Internet, cancelada pelo usuário porque no Chrome funciona.** Arquivos: `src/FoundationCourt.tsx` (SVGs internos substituídos por grupos com transform), `src/styles/foundation-atlas.css` (cores/opacidade/color-scheme) e `src/criteriaStats.test.ts` (asserções relacionadas). Esses ajustes NÃO foram incluídos em `184c9e3` nem publicados. Não concluir a tarefa cancelada, descartar ou incluir esses diffs em outro commit automaticamente.
- Quatro JPGs do usuário seguem não rastreados: `modal-simplificado.jpg`, `notas-contextuais-preview.jpg`, `pos-jogo-preview.jpg`, `rebrand-preview.jpg`. Não apagar nem incluir automaticamente.
- A atualização deste arquivo em 31/10 é somente documental, ainda sem commit/push. Não há pedido novo de implementação em aberto; aguardar o próximo pedido.
- Vitor passou a preferir main. Conferir o pedido atual antes de criar branch. Commit, push e deploy são etapas distintas; confirmar o SHA/ambiente publicado. Se pedir comandos, incluir o `cd` completo e comandos prontos para copiar.

## Estado funcional atual — leitura rápida antes do histórico

- **Jogadores:** `/?view=player` é público e não pede senha. Por autorização explícita, qualquer pessoa pode consultar todas as estatísticas publicadas. Código/SQL antigo de PIN é legado, não deve ser reintroduzido. Auditoria, credenciais e partidas privadas não se tornam públicas.
- **Comissão/histórico:** selecionar uma partida finalizada substitui TODO o contexto visível (placar, elenco, análise, perfis, vídeos); modo consulta somente leitura com retorno à original. Não permite consultar outra enquanto a original não terminou. Partidas/fontes integrais ficam preservadas; históricos antigos sem fonte exigem recuperação de backup, sem inventar eventos.
- **Histórico público:** oculta parciais antigas, mantendo finalizados e a parcial da transmissão atual. Não agrupa jogos diferentes só por terem mesmo adversário/data e não apaga os registros de origem.
- **Continuidade:** implementada e já utilizada pelo usuário entre aparelhos. Mesma conta da comissão, partida completa, revisão e transferência explícita do dispositivo editor; partidas diferentes podem ser editadas simultaneamente. Não há merge simultâneo da mesma partida. Publicar e salvar na conta são operações diferentes.
- **Persistência:** IndexedDB principal, fotos deduplicadas por hash, fontes históricas sob demanda, fila ordenada e controle de conflito. JSON exportado/sincronizado continua completo. Auditoria de desfazer não foi compactada/apagada. Ver ARMAZENAMENTO.md.
- **Scouting:** modal com vídeo próximo dos controles; fundamento → qualidade (Bom/Gafe/+1 nós/+1 eles) → especificações/jogador. Timestamp capturado ao iniciar a marcação. Trocar abas guarda a posição do vídeo na sessão, não sincroniza o relógio entre aparelhos.
- **Vídeos/Reels:** trechos delimitados do vídeo original no modal; celular navega por deslize, PC por botões. Não gera MP4 nem reconhece automaticamente jogadores/ações. Reels têm seção pública própria, lazy loading e deep links; perfis mantêm seus lances filtrados.
- **Cards:** PNG feed/story com foto do jogador, número separado à esquerda, precisão de ataque, salvadas difíceis quando não há ace; template específico de líbero. Destaque da partida manual, um por jogo, toggle no perfil da comissão e tema predominantemente dourado com roxo/preto. Precisão = (ataques − erros diretos)/ataques; bolas mantidas entram. A seleção de líbero por partida não deve ser confundida com reclassificação global do cadastro/template.
- **Fundamentos visuais:** nas estatísticas da comissão e jogadores, seis fundamentos com miniquadras e botão Expandir, pizzas e amostras. Tipo de ataque, bloqueio enfrentado, tempo e passada são distribuições independentes; a ilustração não prova combinações. Trajetórias de ataque retas na paralela/diagonais; meio pode curvar. Levantamento usa direção registrada; recepção é ilustrativa. Só o tracejado amarelo se move suavemente; seta e área de queda ficam paradas. Preservar poses/posições aprovadas e ausência de pés.
- **Última entrega:** Preparação → Líbero da partida lista jogadores com tag Líbero, inclusive secundária. Escolha auditável por partida; trocas livres/automáticas e indicação na quadra seguem o escolhido, sem consumir substituições comuns nem reescrever funções de lances anteriores. Candidato precisa estar no banco, rally encerrado e nenhum líbero ativo em quadra. Não requer SQL novo.
- **Banco remoto:** código publicado não prova que cada migração foi aplicada. O usuário relatou uso real de publicação/transferência; não reexecutar SQLs ou recriar credenciais por precaução. Última entrega não alterou Supabase. Consulte PORTAL-PUBLICO.md, CONTINUIDADE.md e migrations pertinentes somente se houver demanda/erro concreto.

## 4. Time e regras confirmadas

São **10 jogadores**, não 12. Posições abaixo estão em ordem de frequência/preferência; a função na formação pode ser diferente:

| Jogador | Número | Posições |
|---|---:|---|
| Vidro | 11 | Oposto, Central, Levantador |
| Akira | 02 | Ponteiro, Levantador |
| Leo Godoy | 07 | Central, Oposto |
| Leo sá | 18 | Central, Ponteiro |
| Vitor | 04 | Levantador |
| Foden | 10 | Ponteiro |
| Andrey | 22 | Central |
| Maath | 14 | Ponteiro |
| Pedro | 06 | Ponteiro, Oposto |
| Liam | 01 | Líbero exclusivo |

- A tabela é o elenco padrão do código, não uma leitura do cadastro atual do usuário. Tags podem ter sido alteradas nas partidas; o usuário adicionou Líbero a um jogador de linha. Liam é o líbero principal padrão, mas outro atleta com a tag pode ser escolhido na preparação.
- Indoor 6x6 com líbero; sistema 5–1.
- Melhor de cinco por padrão; sets até 25, quinto até 15, diferença de dois.
- **P1 significa levantador na zona 1**, P2 na zona 2 etc. Não confundir a numeração P com a ordem temporal dos side-outs.
- P1 confirmada por zona 1–6: levantador, ponteiro, central, oposto, ponteiro, central.
- Rotação automática após recuperar o saque; não rodar em todo ponto.
- Formação titular e seleção de jogadores usam mini quadra; substituições não ficam restritas à posição preferida do jogador.
- Funções em Ao vivo seguem a formação, não a primeira posição do cadastro.
- Líbero automático opcional: central que estava sacando sai após perder o saque; respeitar entrada no fundo e retorno antes da rede. Desabilitado, central permanece e usa contexto de notas de fundo quando aplicável.

## 5. Visual e fluxo aprovados

- Preservar a identidade visual trabalhada pelo usuário no ZIP `sonarede-site-1.6.0-identidade.zip`. Ela foi incorporada ao código; não voltar ao design anterior nem fazer novo rebrand sem pedido.
- Preto/escuro, roxo e dourado do time, cores moderadas, sem neon; há temas Escuro, Time e Claro no código.
- Logo do Só na Rede com transparência; logos de adversários podem ser enviados.
- Cor do adversário deriva do escudo, mas cai para ardósia quando se confunde com a cor do Só na Rede **no tema ativo**. Recalcula ao trocar tema.
- Controles devem ter alvos de toque de pelo menos 56 px; preservar adaptação a paisagem/retrato.
- Seletores são **cartões dentro de dropdowns**, não selects nativos como experiência principal.
- Qualidade do bloqueio também foi recolocada em dropdown. Manter cartões largos/legíveis; o bug anterior espremia os textos em colunas muito estreitas.
- Fluxo de registro: **resultado/fundamento primeiro → detalhes opcionais → jogador na mini quadra grande com fotos**.
- Modal tem duas visualizações: zona de rotação e região de defesa. Mapa de fundo ajustável: ponteiro Z6; oposto/levantador Z1; central/líbero Z5. Jogadores da rede permanecem nas zonas 2–4; sobreposição de regiões é permitida.
- Quadra deve ser grande. Pulso do time fica abaixo de Em quadra/Registrar ação, não comprimindo a quadra lateralmente.
- Desfazer é sempre acessível. Histórico e correções preservam auditoria.

## 6. O que já funciona

- Placar ao vivo, side-out, sets, formações P1–P6, trocas e líbero.
- Saque aparece quando é nosso saque; recepção quando é deles. Defesa de ataques é separada de recepção de saque.
- Ações simples: Bom, Gafe, Ponto nosso e Ponto deles. **Gafe continua o rally**, exceto quando se escolhe explicitamente uma infração/erro direto que o encerra.
- Modo de toque a toque foi removido da experiência solicitada. Alguns tipos/compatibilidades internos antigos ainda existem; não reintroduzir esse modo por acidente.
- Perfis com foto ajustável, histórico individual, médias, maior/menor nota e destaques.
- Análise visual, sequência de pontos, rotações, side-out, pedidos de tempo e janelas antes/depois dos tempos.
- Estatísticas por set e jogo, critérios/técnicas, notas individuais/coletivas, destaques e pontos de melhoria.
- Histórico local e público de partidas encerradas; filtro por set.
- Reiniciar somente um set retira daquele set ações/tempos/trocas/notas e reabre a partida quando necessário, sem apagar auditoria.
- Pós-jogo: tabela de totais com combinações de contexto e ficha detalhada para reconstrução. Não tratar este módulo como a fila de revisão por rally proposta adiante: são coisas diferentes.
- Exportação CSV/JSON, importação validada, recuperação local e atualização das estatísticas após correções/desfazer.
- Vídeos YouTube anexados a partidas, inclusive antigas; player em youtube-nocookie, com título, tipo, início e set opcional. Não existe análise automática de vídeo.

## 7. Coleta atual de levantamento, ataque e erros

### Levantamento e ataque

Tipos disponíveis: **Primeiro tempo, Segundo tempo, Terceiro tempo, Cabeça, China**. No levantamento há também **Largadinha do levantador**.

- Tipos antigos Chute/Metro/Esticada/Alta/Meia-bola/quick permanecem aceitos na validação e nos históricos; não são opções novas da UI.
- Ao registrar levantamento ao vivo, o passe A/B/C é herdado da última recepção/defesa do mesmo rally. Não pedir a mesma informação novamente.
- Ao registrar ataque, o tipo do levantamento anterior é herdado automaticamente e seu seletor repetido é ocultado.
- Se não há contexto anterior válido, não adivinhar. Permitir tipo manual no ataque quando não houve levantamento registrado.
- Só aproveitar o toque anterior pertinente no mesmo set/rally; não atravessar outro ataque/bloqueio, novo rally, reinício ou set.
- Correções e desfazer recalculam o vínculo durante a projeção do histórico. Não copiar contexto de uma bola para outra.
- Largadinha do levantador fica registrada no próprio levantamento; se pontuar, é **um único ponto**, sem exigir ataque separado. Não é herdada como levantamento recebido pelo atacante.

Qualidade do levantamento recebido no ataque: **Bom, Baixa, Curta, Alta · inadequada, Erro direto**. Ruim e A/B/C antigos continuam compatíveis com registros anteriores, mas não são as opções atuais.

Erro direto do levantamento indica falta de oportunidade real de ataque, excluindo esse ataque da nota. Selecionar esse contexto não cria outro ponto; atribuir o erro efetivo ao levantamento. Há tratamento específico se o próprio atacante comete uma infração real.

No ataque há quantidade de bloqueadores (0/1/2/3), origem rede/pipe Z6/fundo Z1 e tipo de ataque, incluindo **Passou de graça**. Passou de graça não encerra o rally e não tem penalidade fixa só pelo tipo; a execução/contexto determina a avaliação. Ainda não há campo estruturado para distinguir devolução forçada de evitável.

### Bloqueio e infrações

- Toque efetivo: tocou e a bola ficou do lado de lá, fácil.
- Toque simples: tocou e facilitou nossa defesa.
- Mantidos bloqueios simples/duplos/triplos e avaliação individual dos participantes.
- Em **Gafe ou Ponto deles** aparece o dropdown **Erro direto / infração**.
- Ataque, levantamento e bloqueio: toque na rede e invasão.
- Só ataque: ataque na rede e ataque para fora.
- Selecionar erro direto prepara a ação como Ponto deles; **só confirmar o jogador grava a ação e encerra um rally**. Não adicionar um comando de ponto separado.
- No bloqueio coletivo, o erro fica com o autor principal, não automaticamente com todos.
- A lista de erros não aparece em uma ação Bom/Ponto nosso, para evitar combinações contraditórias.

### Tirou da cartola

- Restaurado em **Contexto do lance → Recurso especial**, tanto no levantamento quanto no ataque.
- Grava tag `magic`; aparece também nas distribuições técnicas públicas/privadas.
- Alterar origem do ataque preserva o recurso especial selecionado.
- Há uma inconsistência de nota conhecida, descrita abaixo; não considerar a restauração da UI como prova de que essa inconsistência foi resolvida.

## 8. Notas: intenção, implementação e pendência importante

- Escala 0–10 com pesos por função em quadra. Não usar só a posição preferida do cadastro.
- Função, cobertura e pesos ficam capturados no contexto da ação. Central no fundo sem líbero tem perfil apropriado.
- O cálculo atual usa médias por fundamento e contexto; não é soma indefinida de pontos por ação. Amostra e nota são conceitos separados.
- Evitar punição por fundamentos não observados, por receber poucas bolas ou pelo erro de outro jogador.
- Notas v1/v2/v3 e registros históricos devem manter compatibilidade. O modelo principal atual é **v4**, agregado por funções em `ratingV2.ts` apesar do nome desse arquivo.
- Passe A = perfeito para levantar; B = levantável com ajuste; C = bola ruim. Não depende de cair exatamente na zona 2,5 nem na mão de um levantador específico. Erro direto é separado.
- Dificuldade manual prevalece sobre a sugestão.
- Calibração por tipo nas novas ações, marcada por `setDifficultyVersion: 1`: Primeiro tempo/Cabeça/China têm patamar Difícil; Segundo tempo e Largadinha, Normal; Terceiro tempo permite Fácil apenas com entrada favorável. Entrada ruim mantém Difícil; sem entrada conhecida, Terceiro tempo fica Normal. É uma calibração do app, não uma regra oficial de notas.
- Não somar duas vezes bônus de tipo e qualidade: usa-se um patamar contextual. Não alterar retroativamente grades antigas sem versionamento/decisão explícita.
- Infrações de rede/invasão são erro próprio e recebem nota de ação zero no v4, independentemente da dificuldade. Ataque na rede/fora usa erro direto com contexto; não penalizar duas vezes por campos redundantes.
- Amostra atual: abaixo de 5 ações é provisória; 5–14 intermediária; 15+ ampliada. Isso não representa intervalo estatístico de confiança formal.

**Inconsistência confirmada, ainda NÃO corrigida:**

`FoundationAssessment` mostra `effectiveDifficulty(event)`, que considera tag `magic`. Porém `assessedV4` chama `effectiveDifficulty` com `tags: []`. Assim Tirou da cartola pode indicar Emergência na interface sem usar a mesma dificuldade na nota.

Exemplo reproduzido localmente com `simple_good` + tag `magic`, sem outros critérios:

- Levantamento: mostra Emergência, nota de ação 7,5; Emergência manual dá 8,625.
- Ataque: mostra Emergência, nota de ação 7,5; Emergência manual dá 9,0.

Isso foi informado ao usuário como prioridade de revisão, não corrigido. Os testes existentes verificaram o seletor/contexto, mas não cobriram essa equivalência de nota. Ao tratar o problema, verificar se basta alinhar cálculo e UI e como preservar notas antigas; não simplesmente inflar todos os históricos. A mesma limpeza de tags merece revisão para salvadas especiais.

## 9. Persistência, publicação e segurança

### Dados locais

- Persistência principal em IndexedDB `so-na-rede-matches-v2`: documentos versionados, atual/anterior, imagens compartilhadas por hash e histórico integral carregado sob demanda. `localStorage` guarda preferências/vínculos pequenos/caches limitados; antigos registros `so-na-rede:match:v1` são origem de migração/recuperação.
- Interface otimista com fila ordenada de gravação; publicação/sincronização aguardam persistência confirmada. Falhas mantêm dados pendentes exportáveis e não podem ser anunciadas como salvamento concluído.
- Migração relê/verifica conteúdo antes de liberar armazenamento antigo. Conflitos entre abas impedem sobrescrita silenciosa. Versões sem referência são coletadas preservando atual/anterior e históricos/fotos referenciados; eventos desfeitos continuam no audit log.
- Cópias de transferência são deduplicadas por conteúdo. JSON exportado e payload remoto reconstroem toda a partida, sem referências locais externas.
- `matchBackup.ts` mantém recuperação/cópias locais. Limpar dados do navegador ou perder o aparelho continua sendo risco; localhost e domínio publicado são origens distintas.
- Medição sintética documentada: 71,4% menos conteúdo serializado incluindo checkpoint, não uma promessa de redução de RAM nem medição do celular real. Ver ARMAZENAMENTO.md.

### Cloud atual

- Auth serve para publicar e acessar continuidade privada por conta; não é bloqueio geral dos dados já carregados localmente na comissão.
- Sessão da comissão usa sessionStorage; público não persiste sessão autenticada. `detectSessionInUrl=false`.
- Só usuários de `scout_editors` publicam. `can_publish()` confirma autorização da UI; RLS/RPC são a fronteira real.
- Tabelas principais: `live_public`, `live_media`, `public_matches`; espectadores só leem os dados publicados e jogos encerrados no histórico.
- RPC `publish_live`: revisão esperada, request UUID idempotente e serialização para impedir sobrescrita de aba antiga. `update_match_videos` altera anexos de jogos antigos.
- Envio tenta atualizar a cada ~1,5 s; Realtime + recuperação por polling no público.
- **PublicSnapshot é DTO público explícito, não o Match privado.** Não contém auditoria/configurações/importações. Fotos e logo são mídia separada.
- **Existe sincronização privada completa** via módulo de continuidade e `supabase/match-sync.sql`, separada da publicação; revisão/posse por partida e conta. Ver CONTINUIDADE.md. A retomada da publicação após devolver a posse ao aparelho original foi corrigida em `9b5c54b`.

### Segurança implementada e limites

- Contrato recursivo público no cliente e banco; campos extras/tipos inválidos rejeitados.
- Limites: snapshot 1 MiB, mídia 5 MiB, roster até 30, vídeos até 20, rallies até 2.000; importações de backup 25 MB e fichas 5 MB.
- Limite SQL de 120 escritas confirmadas/minuto/usuário em publicações/anexos. Não é proteção completa contra DDoS nem limite de login.
- Headers Vercel e Cloudflare: CSP, HSTS, DENY, nosniff, referrer e permissions policy.
- React usa texto escapado; não se encontrou HTML bruto/execução de strings nos caminhos revisados. SQL estático parametrizado, funções definer com search_path vazio.
- CSV neutraliza fórmulas também após espaços/tabulações/controles.
- `.env*` ignorado e build verifica arquivos privados no public. Nunca enviar segredo/service_role/senha para frontend, Git ou `VITE_*`.
- Public config só URL HTTPS padrão `*.supabase.co` e publishable/anon. Domínios personalizados exigem adaptação explícita da allowlist/CSP.
- O usuário informou cadastro público e login anônimo desabilitados e ativou 2FA **na conta do painel Supabase**. Não presumir 2FA no login do app nem em GitHub/Vercel.
- Configuração real de produção não foi integralmente auditada. Não afirmar que headers/Auth/Realtime/limites estão todos verificados no serviço real com base só em testes locais.

### SQL e problema recente de copiar

- Instalação: `live.sql` → `videos.sql` → `security-schema.sql` → `security.sql`.
- Contrato: `src/publicValidation.ts` + `scripts/generate-security.ts` → `supabase/security-schema.sql`.
- Quando houver novas enumerações/critério técnico público, regenerar e executar o **arquivo atualizado inteiro** no SQL Editor do site do Supabase.
- Atualizar só esse contrato não exige reexecutar todos os outros SQLs. `CREATE OR REPLACE` troca a função sem apagar partidas.
- Build gera `dist/live-setup.sql` completo e `dist/security-setup.sql` com schema + hardening.
- Houve erro 42601 perto de SELECT. Arquivo local executou em PostgreSQL de teste; depois o usuário enviou texto colado e ele era idêntico ao arquivo, ignorando CRLF/LF, com os dois delimitadores `$schema$` e REVOKE final.
- Orientação: query nova em branco, colar tudo, executar sem selecionar só um trecho. Resultado esperado: Success. No rows returned. Usuário respondeu que estava tudo certo, mas não houve inspeção remota do banco.
- Forma confiável de copiar no PowerShell:

```powershell
Get-Content -Raw "C:\Users\vitor\OneDrive\Documentos\ChatGPT\app volei\supabase\security-schema.sql" | Set-Clipboard
```

## 10. Últimas ideias — conversadas, ainda NÃO implementadas

O usuário disse **“antes de colocar tudo isso”** ao propor as ideias seguintes. Não confundir esta seção com entregas já existentes.

### A. Placar primeiro, fundamentos depois, por rally

Problema: enquanto a comissão aprende, provavelmente publicará apenas o placar e detalhará os fundamentos depois.

Proposta explicada ao usuário:

- Cada ponto cria rally estável, com identificação, set, placar, vencedor e contexto de formação/rotação registrado.
- Rally pode ter estado de fundamentos pendentes/preenchidos.
- Modos/áreas: Placar rápido e Completar fundamentos.
- Filtrar pendentes e completar durante pausas ou depois.
- **Adicionar fundamentos a um rally existente não soma outro ponto nem muda automaticamente o vencedor.** Correção do placar é ação separada e auditada.
- Não criar uma segunda partida nem reaplicar eventos antigos na sequência atual.
- Contextos automáticos precisam respeitar ordem das ações dentro daquele rally, mesmo no preenchimento posterior.
- Se não há dados, não inventar jogador/fundamento/contexto nem dar nota zero por ausência de registro.
- Ainda não há fila de complementação implementada. O pós-jogo atual não resolve sozinho essa operação sobre rallies já publicados.

### B. Continuidade entre aparelhos — entregue

Não é mais backlog: implementada em `eed6580`, com correção de retomada em `9b5c54b`. Ver estado funcional atual e CONTINUIDADE.md. Não criar um segundo sistema de sincronização por interpretar propostas antigas como pendência.

### C. Perfis analíticos situacionais

Última ideia do usuário antes de pedir este contexto:

- Atacante que mais passa bola de graça.
- Levantador que mais conserta bolas ruins.
- Defensor que entrega bons passes em bolas difíceis.

Resposta/proposta já apresentada:

| Perfil | Medida sugerida |
|---|---|
| Devolução de graça | Ataques tipo free / ataques registrados; quantidade e percentual |
| Conserto do levantador | Levantamentos bons após passe C ou lance difícil / oportunidades nessas condições |
| Defesa de bolas difíceis | Defesas difíceis/emergência com passe A ou B / defesas dessas condições; A/B separados |

- Exemplo ilustrativo, **não dado real do time**: Vitor consertou 8 de 11 bolas, 73%.
- Separar recepção de saque de defesa de ataque.
- Acrescentar causa da devolução de graça: forçada/salvada vs tinha condição de atacar. Campo ainda inexistente; não inferir culpa só de `attackType=free`.
- Mostrar denominador/amostra e evitar coroar 2/2 acima de 15/20 sem qualificação.
- Rallies ainda não detalhados ficam fora e a cobertura/pendências deve aparecer.
- Não transformar esses perfis automaticamente em nova nota geral nem em rótulos depreciativos.
- **Cálculos condicionais precisam cruzar critérios da MESMA ação/oportunidade.** O cube público atual tem distribuições marginais por critério; não permite inferir combinações juntando percentuais independentes. Calcular os novos numeradores/denominadores no privado e publicar agregados apropriados, atualizando o contrato SQL.
- Ainda não há módulo/ranking desses perfis implementado.

### D. Recomendações anteriores do assistente, sem autorização automática

- Alinhar dificuldade mostrada e nota, com explicação do cálculo.
- Fila de revisão de rallies com dados faltantes.
- Modo treino isolado da comissão; já existe demo dos fãs, não um sandbox completo da comissão.
- Backup privado remoto/restauração: já entregue pela continuidade; não permanece pendente.
- Alertas por rotação com amostra visível, aproveitando a análise existente.
- Resumo pós-jogo que vire pauta de treino.

O usuário não pediu para executar automaticamente as propostas restantes. A última implementação solicitada foi a seleção de líbero por partida, já publicada; o pedido de 31/10 é apenas atualizar este contexto.

## 11. Mapa de código para a próxima conversa

| Arquivo/área | Responsabilidade |
|---|---|
| `src/model.ts` | Tipos Match/SkillEvent/Command, elenco, funções, pesos, resultados |
| `src/engine.ts` | Projeção do audit log, placar, rotação, regras, append/correct/undo, stats |
| `src/formation.ts` | Formação e variações P1–P6 |
| `src/actionQuality.ts` | Bom/Gafe/erro e qualidades compatíveis; critérios por resultado |
| `src/assessment.ts` | Validação e notas v1–v4, participantes e tags |
| `src/ratingV2.ts` | Contexto de função/cobertura e agregação por médias |
| `src/criteria.ts` | Catálogo de critérios e dificuldade sugerida |
| `src/rallyContext.ts` | Herança de passe/tipo entre ações no mesmo rally |
| `src/faults.ts` | Normaliza erro decisivo como uma única ação/ponto deles |
| `src/App.tsx` | Coordenação de telas, gravação, ações pendentes, atribuição ao jogador |
| `src/PlayerChooser.tsx` | Modal com fotos, zonas, seleção/participantes |
| `src/FoundationAssessment.tsx` | Ficha v4: qualidade/dificuldade, erros, recursos, contexto |
| `src/CriteriaFields.tsx`, `AssessmentSelect.tsx`, `CardSelect.tsx` | Seletores em cartões |
| `src/criteriaStats.ts`, `CriteriaReport.tsx` | Distribuições por critérios e DTO técnico |
| `src/analysis.ts`, `AnalysisView.tsx` | Leitura do jogo, rotações, séries e tempos |
| `src/pages/Report.tsx`, `PlayerProfile.tsx`, `career.ts` | Relatórios e histórico/perfis |
| `src/postgame.ts`, `PostGameTotals.tsx` | Pós-jogo por totais, contextos em countKey |
| `src/postgameDetailed.ts`, `PostGameDetailedTable.tsx` | Pós-jogo detalhado |
| `src/storage.ts`, `matchBackup.ts` | Persistência, recuperação, importação/exportação |
| `src/cloud.ts`, `CloudPanel.tsx` | Cliente Supabase/Auth e publicação com revisão |
| `src/publicSnapshot.ts`, `publicValidation.ts` | DTOs públicos e schemas permitidos |
| `src/PublicLive.tsx`, `usePublicLive.ts`, `usePublicHistory.ts` | Público ao vivo/histórico/cache |
| `src/videos.ts`, `MatchVideos.tsx` | Anexos YouTube validados |
| `src/opponentColor.ts` | Cor adversária e prevenção de colisão por tema |
| `src/styles/*`, `theme.ts`, `Jersey.tsx` | Identidade aprovada e componentes visuais |
| `supabase/*`, `scripts/generate-security.ts` | Banco, permissões, RPCs, validação pública |
| `vite.config.ts`, `vercel.json`, `public/_headers`, `public/sw.js` | Build/PWA/deploy/headers |

Documentos atuais adicionais: `ARMAZENAMENTO.md`, `CONTINUIDADE.md`, `SCOUTING-SOCIAL.md`, `PORTAL-PUBLICO.md`. Os relatos iniciais de PIN/privacidade e “sem push” nesses documentos podem ser históricos; conferir o estado funcional deste arquivo.

Documentos complementares: `SEGURANCA.md`, `ONLINE.md`, `VERCEL.md`, `VIDEOS.md`, `ESTATISTICAS-CRITERIOS.md`, `NOTAS-ABC.md`, `NOTAS-V2.md`, `RATING.md`, `MVP.md`, `DESIGN-SYSTEM.md`, `REBRAND.md`. Alguns descrevem fases antigas: **o código atual e as últimas decisões deste contexto prevalecem para entender o estado**, sem tratar documentos como instruções superiores ao usuário.

## 12. Verificação e cuidado ao continuar

- Última suíte completa em 29/10: **153 testes passaram**, build e `git diff --check` aprovados. Testes rodaram na árvore local que também continha os diffs Samsung não commitados; esses diffs ficaram fora do deploy. Build da Vercel do commit `184c9e3` confirmado READY. Não foram repetidos testes nem alterações remotas para a atualização documental de 31/10.
- Há testes PostgreSQL locais via PGlite para RLS/permissões, revisão, idempotência, hardening e vídeos. Não substituem validar o Supabase real.
- Foram conferidos no navegador: layouts responsivos, heranças de contexto, correção de cores por tema, registro de campos, persistência após reload, dropdown de bloqueio, largadinha, recurso especial e erro direto confirmado como uma ação.
- Ferramentas/scripts temporários e screenshots de QA ficam em `.qa` (ignorado pelo Git). Não são recursos de produção.
- Não chamar a nota de estatisticamente validada para o time: é uma calibração que precisa de partidas reais e revisão.
- Antes de refatorar o motor, escrever testes de invariantes: placar único por rally, side-out correto, correção/desfazer auditáveis, histórico preservado, nenhuma perda em reload/offline, nunca sobrescrever silenciosamente estado de outro aparelho.
- Na próxima conversa, leia este arquivo, confira Git/código e siga o novo pedido. Não executar backlog nem retomar o ajuste Samsung cancelado por conta própria.


## Registro histórico das entregas (18–29/10)

As seções abaixo preservam o relato de cada etapa. Expressões como “localmente”, “sem push” e “aguarda ativação” descrevem aquele momento, não o estado atual. O resumo e o Git acima prevalecem: os commits listados já compõem a main publicada. O modelo antigo de PIN foi substituído pelo portal público e a proposta de sincronização foi entregue. Não executar migrações antigas automaticamente.

### Área dos jogadores (18/10/2026)

Implementada localmente a rota `/?view=player`, login com PIN de quatro números, isolamento de dados por token no Supabase e perfis públicos dos colegas com vídeos. Ver `ACESSO-JOGADORES.md`. PINs e SQL de ativação estão em `.qa`, fora do Git/build. Migração e publicação online ainda não executadas: login real requer ativar o SQL e configurar Supabase. Publicação da comissão agora usa `publish_player_live`; aplicar a migração antes do deploy. A nova migração retira precisão e detalhes técnicos das tabelas públicas, preservando-os em tabelas privadas. Senhas são hashes BCrypt, não texto reversível. Não confundir implementação/testes locais com ativação em produção.


## Ícones dos fundamentos — 19/10/2026

Visual aprovado e aplicado via `SkillIcon.tsx`, com tokens dos três temas. Cartões de vídeo usam ícones e borda dourada para `pointWon`. Para área dos jogadores online, atualizar somente `supabase/video-point-marks.sql` e republicar partidas. Nenhuma senha deve ser recriada. Validação: 133 testes/build e conferência visual dos temas.


## Feed de jogadas — 22/10/2026

Implementado localmente `MomentFeed.tsx`, integrado ao `MomentBrowser` compartilhado por análise/perfis/área dos jogadores. Cartões abrem dialog modal, evitando subir a página no celular. Feed usa filtros existentes e novo filtro Pontos nossos; anterior/próxima e área de gesto vertical abaixo do vídeo. YouTube reproduz trechos delimitados (5 s antes/depois por padrão, ajustáveis), tenta autoplay com fallback manual e permite repetir. Não gera arquivos MP4 nem reconhecimento automático. Players anteriores são desmontados ao trocar/fechar. Temas e bordas douradas preservados. Não requer SQL novo.

Sincronização entre dispositivos continua PROPOSTA, não implementada a pedido do usuário: lista privada de partidas completas (audit log incluído), acesso da comissão autorizada, revisão e posse de edição por partida, backups locais/offline e status de sincronização. Diferentes partidas podem ser editadas simultaneamente; a mesma deve ter transferência explícita de editor. A publicação pública atual também precisa separar a partida em transmissão das outras em edição para não sobrescrever o canal ao vivo.

Ajuste aprovado: celular/telas até 600 px e dispositivos de toque usam somente área de deslize ampliada (150 px); desktop usa somente botões anterior/próxima. A área indica início/fim da sequência.


## Continuidade privada — 23/10/2026
Implementada em `codex/continuidade-e-acabamento`: RPC/tabela privadas por conta, sincronização da partida completa, transferência explícita de editor por partida, conflitos sem merge e cópias locais antes da troca/nova partida. Ver CONTINUIDADE.md e supabase/match-sync.sql. Publicação continua separada e verifica a versão privada antes de enviar jogos vinculados. Requer ativar SQL/deploy; não presumir que ocorreu.

## Acabamento da interface — 23/10/2026
Aplicadas as correções da revisão Impeccable preservando temas, fontes e ícones: placar móvel em duas linhas sem sobreposição; painéis com dialog nativo, Escape e retorno de foco; PIN logo após escolher o jogador; filtros dos vídeos recolhíveis; resumo/detalhado com seleção explícita; detalhes técnicos montados apenas ao abrir e estados sem dados mais curtos. Lances especiais do resumo também abrem no feed modal.

O feed decide gestos por dispositivo de toque (hover:none/pointer:coarse), não pela largura: PC estreito conserva botões; celular usa deslize e mantém alternativa acessível por teclado. Substitui a regra anterior de ocultar botões apenas por largura.

Validação local: 134 testes e build aprovados; conferidos placar a 390 px, troca de jogador/foco na senha, foco/Escape do painel e avanço do feed em PC estreito. Sincronização testada em PostgreSQL local; ainda falta ativar SQL e validar em dois aparelhos reais. Sem push/deploy nesta tarefa.

## Scouting e compartilhamento — 25/10/2026
Implementados após aprovação dos previews: modal de scouting com vídeo fixo e fluxo fundamento → qualidade → critérios/jogador; posição do vídeo preservada na sessão por partida/set/fonte; cards PNG com foto do perfil e fallback de camisa, templates ofensivo/líbero; cards privados exportáveis pelo próprio jogador; seção pública Reels com miniaturas lazy, lotes de cartões e deep links. Ver SCOUTING-SOCIAL.md. Requer `supabase/social-reels.sql` antes do deploy e republicação para gerar cards de jogos antigos. Sem alteração de PINs. Exclusão/reinício de sets e compactação do JSON permanecem fora desta entrega. O contexto acima registra estados históricos; esta seção descreve a implementação nova, ainda sem ativação remota.


## Cards e seleção de partidas — 26/10/2026
Implementados após aprovação do preview: seletor global da comissão para relatório de partidas arquivadas, criar partida com adversário/data e remover/restaurar relatórios locais (não apaga publicações ou backups). Cards em pôster com escolha de conquista, precisão de ataque e salvadas difíceis quando sem ace; destaque escolhido manualmente pela comissão no perfil, salvo por partida e publicado ao portal, com tema dourado/roxo. Ver SCOUTING-SOCIAL.md para alcance e ativação. Não requer novo SQL; republicação atualiza cards. Sem push/deploy nesta etapa.

## Portal público e direção de ataque — 26/10/2026
Após aprovação explícita de estatísticas públicas para todos, o portal não solicita PIN: Resumo/Fundamentos/Partidas, recortes geral/recentes/jogo, evolução com média móvel, amostra, métricas ponderadas e lances/cards. Direção de ataque na comissão (Paralela/Diagonal/Meio/Não informado), neutra na nota, alimenta os agregados técnicos com amostra e empates. Ativação requer dist/abrir-jogadores.sql (schema atualizado + RPC open_player_games), ver PORTAL-PUBLICO.md. Só DTOs de jogos publicados são abertos; credenciais, sessões, backups e partidas privadas ficam restritos. As regras antigas de privacidade descritas acima são históricas e substituídas para a nova página pública por decisão do responsável. Sem ativação remota ou push nesta etapa.


## Análise integral do histórico — 26/10/2026
Comissão bloqueia consulta de outras partidas enquanto a atual não está finalizada; históricos incompletos também não são selecionáveis. Após encerrar, selecionar jogo concluído abre relatório e análise tática em modo consulta, sem trocar a partida ativa. Novos arquivamentos de jogos finalizados incluem fullMatch sem history aninhado: eventos, pesos, elenco e configurações preservados no JSON/sincronização. Cópias antigas podem ser recuperadas do aparelho/conta ou JSON correspondente, validadas e anexadas ao histórico. Sem cópia integral, continuam disponíveis os agregados efetivamente salvos, sem reconstrução fictícia de ações. Não requer SQL adicional. Correção visual pendente do portal também incluída localmente: classe exclusiva para número do atleta e título Acompanhe os jogadores. Sem commit/push nesta etapa.

## Troca integral da tela e publicações parciais — 26/10/2026
Substitui o comportamento de consulta acima: selecionar uma partida finalizada agora troca o contexto de toda a comissão (placar, elenco, relatórios, perfis e vídeos). A partida original permanece salva e vinculada à sincronização/publicação; a consulta histórica é somente leitura, com botão para retornar. A troca continua bloqueada enquanto a partida original não terminou. Históricos antigos sem fonte integral exigem recuperação de cópia do aparelho/conta ou JSON, sem inventar dados.

O portal filtrava apenas IDs repetidos, mas o RPC também retornava publicações parciais antigas com IDs diferentes. Agora exibe jogos finalizados e somente a parcial identificada como transmissão atual em live_public. Nenhum registro é apagado; partidas finalizadas diferentes com mesmo adversário/data são preservadas. Há filtro no frontend e em supabase/open-players.sql; reaplicar este SQL (ou dist/abrir-jogadores.sql gerado pelo build) filtra também antes da paginação. Não houve alteração no Supabase remoto.

Validação desta etapa: 147 testes passaram, build e git diff --check aprovados. Sem conferência visual interativa, commit ou push nesta etapa.

## Card e seleção do craque — 26/10/2026
Foto do card alinhada à direita em Feed/Story; número tem faixa própria à esquerda, sem sobreposição. Checkbox substituído por toggle acessível usando ui-switch e cores dos temas; perfil ajustado para não expandir além da largura móvel.
O print mostrava falha genérica de armazenamento, sem comprovar a causa exata no aparelho. Tratado o caso de quota: saveMatch tenta novamente liberando somente o checkpoint local idêntico à cópia principal; nunca descarta backup diferente nem partidas. Se ainda falhar, mantém a cópia principal anterior e informa quota cheia explicitamente. Espelhamento IndexedDB continua ativo. Não altera permissões de consulta histórica.
Validação: 148 testes passaram, incluindo salvar craque com quota limitada e preservar dados quando a gravação falha. Navegador isolado conferiu toggle por clique/teclado, reload e largura de 390 px; quatro PNGs Feed/Story normal/dourado renderizados com foto demonstrativa. Build validado. Sem SQL novo, commit ou push nesta etapa.

## Retomada da publicação após transferência — 26/10/2026
Corrigido usePublication: reinícios usam a revisão persistida mais recente, e iniciar novamente recria o ciclo de envio mesmo para a mesma partida já habilitada. Conflitos de revisão/posse pausam efetivamente a publicação e liberam Publicar; a mensagem de revisão não presume que outra pessoa ainda esteja online. Respostas de ciclos encerrados não atualizam checkpoints/estado da nova transmissão; início concorrente é bloqueado e troca de partida durante consulta cancela o início anterior. Verificação de posse privada permanece obrigatória.
Validação local: 148 testes/build aprovados, teste PostgreSQL estendido com transferência de volta ao aparelho original e bloqueio do antigo editor. Navegador isolado com Supabase simulado verificou revisão atualizada ao reiniciar, conflito/retomada com um clique, bloqueio do antigo responsável e retomada após devolução da posse. Nenhum acesso/alteração no Supabase real. Sem SQL novo, commit ou push nesta etapa.

## Persistência ampliada e otimização — 26/10/2026
Usuário autorizou migração e eventual exclusão, informando possuir backups das duas partidas. Implementado IndexedDB principal com fontes históricas separadas/carregadas sob demanda, imagens por hash, transações ordenadas e comparação de versão entre abas. Migração verifica integridade antes de liberar o localStorage antigo; não foi necessário apagar partidas. Exportação e sincronização reconstroem JSON completo, sem referências locais. Cache público limitado; snapshots sem referência coletados mantendo atual/anterior; backups de transferência idênticos deduplicados. Falhas de disco mantêm alterações exportáveis e impedem publicação prematura. Ver ARMAZENAMENTO.md para arquitetura, testes e medidas sintéticas (71,4% menos conteúdo serializado no cenário de duas partidas, não medição do aparelho do usuário). Testes de navegador isolado cobrem quota, migração interrompida, conflitos, exportação e reload; 149 testes/build aprovados. Sem SQL novo, alterações remotas, commit ou push nesta etapa.


## Fundamentos visuais — 28/10/2026
Aplicação autorizada nas páginas da comissão e dos jogadores, em todos os seis fundamentos. CriteriaReport agora usa FoundationAtlas/FoundationCourt com poses vetoriais aprovadas, miniquadras, tendências e Expandir com pizzas e legendas completas (contagens, amostras, notas e ausentes). Resumo da comissão também inclui a análise técnica; portal prioriza o novo visual e preserva resultados anteriores em seção recolhível. Filtros e CSV mantidos. Ataque mostra bloqueio e direção como tendências independentes; empates/ausência não geram uma escolha visual. Levantamento segue setDirection; recepção possui trajetória explicitamente ilustrativa, pois não coletamos destino exato. Traços amarelos fluem lentamente; setas e destinos fixos; reduced-motion respeitado. Não altera dados persistidos, cálculo das notas ou schema Supabase. Sem SQL novo, commit/push/deploy nesta etapa. Testes: 151 aprovados, incluindo equivalência local/publicado, ausência de dados, empates e paralela reta. QA isolado com dados sintéticos em .qa/atlas-integrado.html.


## Líbero escolhido por partida — 29/10/2026
Preparação agora permite selecionar atletas com tag Líbero, inclusive secundária. A escolha é um comando auditável selectLibero; mantém a função principal do elenco e os papéis dos eventos anteriores. Projection.designatedLiberoId orienta entradas automáticas, trocas livres, validações e indicação visual na quadra/banco. Legado assume o líbero principal. Alteração exige candidato no banco, rally encerrado e nenhum líbero em quadra. Inicialização de cópias/replay suporta initialLiberoId; backup/importação e editor pós-jogo aceitam o novo comando. Sem SQL novo. Alterações locais do ajuste Samsung anteriormente cancelado continuam separadas nos três arquivos FoundationCourt.tsx, criteriaStats.test.ts e foundation-atlas.css; não incluir automaticamente em commit desta funcionalidade.


## Encerramento para o próximo chat — 31/10/2026

A entrega de líbero foi commitada, enviada e publicada com sucesso em 29/10 (`184c9e3`). Nenhuma migração SQL foi necessária. No navegador isolado, um ponteiro com tag secundária Líbero apareceu e pôde ser selecionado; testes cobrem entrada automática, trocas livres, regras, undo/reinício, JSON e manutenção da função histórica. Não foi alterada a partida real do usuário na validação. Preview sintético: `.qa/libero.html`; outros previews aprovados: `.qa/atlas-fundamentos/index.html` e `.qa/atlas-integrado.html`. A pasta `.qa` é ignorada e não entra em produção; não presumir servidor rodando.

Pendências reais: investigar a inconsistência `magic`/dificuldade nas notas antes de qualquer recalibração; propostas de análises situacionais/revisão de rallies conforme novo pedido. Não há autorização para iniciar essas propostas agora. O bug Samsung Internet foi deixado de lado pelo usuário (“no chrome ta suave ent fds”); seus três diffs locais continuam intocados e fora da produção. O usuário pode produzir bonecos melhores no futuro, mas não entregou substitutos nesta etapa.

Esta atualização alterou apenas CONTEXTO-PROJETO.md; não fez commit, push, redeploy ou alterações em dados de partidas.

## Alterações locais — 02/11/2026

Pedido desta conversa: defesa/bloqueio “Não foi” (tinha condição, mas não tentou), ataque “Bloqueado”, levantamento “Afastada da rede”, captura do vídeo 2 segundos antes do clique e marcações “Momento engraçado” sem efeito no placar/notas.

- Defesa: critério defenseAttempt (Tentou defender / Não foi), em Contexto do lance; anotação separada da qualidade escolhida, sem penalidade adicional. Bloqueio reutiliza blockQuality=absent, renomeado para “Não foi · tinha condição de bloquear”, preservando o cálculo existente.
- Ataque: attackOutcome=blocked, separado de tipo/direção e do resultado do ponto. Não encerra rally automaticamente.
- Levantamento: setPlacement=away para registrar bola afastada; incomingSet=away no ataque segue a dificuldade contextual das outras bolas ruins.
- Vídeo YouTube/local: captura em max(0, instante − 2 segundos), sem deslocar registros antigos.
- funnyMoments na partida: marcações independentes, preservadas no backup/sincronização/histórico. Botão no vídeo ao vivo/fullscreen; painel Pós-jogo permite marcar, rever e remover. YouTube acompanha publicação/Reels, arquivos locais exigem selecionar novamente o original. Não há geração de MP4. Não entram na auditoria de fundamentos nem nas notas.
- Contrato público regenerado em supabase/security-schema.sql; aplicar arquivo completo antes de publicar estas novas opções. Nenhum SQL remoto, commit, push ou deploy realizado nesta tarefa.
- Validação: 156 testes passaram; build aprovado. Navegador isolado conferiu opções, captura simulada em 12,125 s → 10,125 s e persistência após reload. Dados reais não foram usados. Os três diffs Samsung pré-existentes continuam separados.
- Escopo desta entrega foi a lista específica de 02/11. Bola de cheque e a revisão ampla dos textos do relatório anterior ainda não foram aplicadas.
