# Só na Rede — contexto para continuar em outra conversa

Atualizado em **17/10/2026**, após conferir o código e o Git locais.

Este arquivo registra decisões, implementação e propostas. **Proposta não significa funcionalidade implementada nem autorização para executá-la.** Na nova conversa, leia este contexto, confira os arquivos atuais e siga o próximo pedido do Vitor. Não recomece o projeto nem implemente todo o backlog automaticamente.

## 1. Projeto, usuário e ambiente

- Usuário: Vitor. Conversa em português brasileiro, direta e informal; prefere explicações simples e comandos prontos para copiar.
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
- Preview local usado: `http://localhost:4173/?view=commission`; não presumir que o processo continuará rodando.
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

## 3. Estado do Git

- Branch atual verificada: **main**.
- Último commit local: **f3f309b** — `Adiciona infracoes por fundamento e ataque passou de graca`.
- Anteriores:
  - `efbe026`: largadinha do levantador e Tirou da cartola.
  - `db0866d`: tipos de levantamento, qualidades e contexto automático.
  - `c0776e7`: bloqueio, ataque e passe automático.
  - `169ffe4`: merge da identidade visual e segurança.
  - `2ee921d`: identidade visual e segurança.
  - `b701f5a`: seletores em cartões.
- Antes de criar este contexto, não havia alterações de código pendentes. Havia quatro JPGs não rastreados do usuário: `modal-simplificado.jpg`, `notas-contextuais-preview.jpg`, `pos-jogo-preview.jpg`, `rebrand-preview.jpg`. **Não apagar nem incluir automaticamente em commits.**
- Commits f3f309b e efbe026 foram criados pelo assistente a pedido do usuário. O usuário recebeu `git push origin main`; não presumir que um push ocorreu só por existir commit local.
- Vitor inicialmente quis branches separadas para mudanças de notas. Mais recentemente preferiu commitar diretamente na main. Conferir estado e pedido atual antes de criar branch.
- Quando pede comandos, entregar blocos separados e incluir o `cd` completo. Se pede para fazer o commit, pode executar o commit local dos arquivos pertinentes, sem incluir screenshots. Não confundir commit com push/deploy.

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

- `storage.ts`: partida em `so-na-rede:match:v1`, cópia redundante localStorage e validação de importação.
- `matchBackup.ts`: IndexedDB `so-na-rede-recovery`, cópias latest/previous.
- Salvar localmente é a barreira antes de atualizar a UI. Não trocar isso por efeito React assíncrono que possa perder a última ação no reload.
- Falhas de cópia opcional não invalidam salvamento principal; dados ilegíveis não devem ser apagados/resetados silenciosamente.
- Proteção contra sobrescrita de outra aba.
- Esses mecanismos estão no mesmo dispositivo/origem. Limpar os dados do navegador ou perder o aparelho continua sendo risco. Mudar localhost → domínio hospedado não migra armazenamento; exportar/importar JSON.

### Cloud atual

- Auth serve para publicar; não há login obrigatório ao entrar em toda a página da comissão.
- Sessão da comissão usa sessionStorage; público não persiste sessão autenticada. `detectSessionInUrl=false`.
- Só usuários de `scout_editors` publicam. `can_publish()` confirma autorização da UI; RLS/RPC são a fronteira real.
- Tabelas principais: `live_public`, `live_media`, `public_matches`; espectadores só leem os dados publicados e jogos encerrados no histórico.
- RPC `publish_live`: revisão esperada, request UUID idempotente e serialização para impedir sobrescrita de aba antiga. `update_match_videos` altera anexos de jogos antigos.
- Envio tenta atualizar a cada ~1,5 s; Realtime + recuperação por polling no público.
- **PublicSnapshot é DTO público explícito, não o Match privado.** Não contém auditoria/configurações/importações. Fotos e logo são mídia separada.
- **Não existe sincronização da partida privada completa entre PC/celular/tablet.** Login e publicação não implementam isso sozinhos.

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

### B. Continuar a partida em outro aparelho

Pedido/ideia: começar no PC e terminar no celular; pedir login ao abrir a comissão e apresentar o jogo salvo.

Proposta:

- Autenticação de entrada para acesso à área privada sincronizada e lista/retomada da partida.
- Salvar **Match privado completo**, auditoria e pendências no Supabase, separado dos DTOs de fãs e com RLS de comissão.
- Manter marcação offline no aparelho que já carregou a partida. Não perder dados por sessão expirada/sem internet.
- Um dispositivo editor por vez inicialmente; ação Continuar neste aparelho, com revisão/transferência de posse. Evitar merge silencioso de dois editores offline.
- Mostrar última sincronização e pendências de envio. Só dados já sincronizados podem aparecer no segundo aparelho.
- Não expor a partida privada pela URL de fãs; login da transmissão atual não equivale a backup privado.
- Ainda não há implementação nem SQL para esse novo armazenamento/controle de dispositivo.

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
- Backup privado remoto/restauração.
- Alertas por rotação com amostra visível, aproveitando a análise existente.
- Resumo pós-jogo que vire pauta de treino.

O usuário não pediu para executar automaticamente essa lista. Sua prioridade mais recente foi discutir A/B/C.

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

Documentos complementares: `SEGURANCA.md`, `ONLINE.md`, `VERCEL.md`, `VIDEOS.md`, `ESTATISTICAS-CRITERIOS.md`, `NOTAS-ABC.md`, `NOTAS-V2.md`, `RATING.md`, `MVP.md`, `DESIGN-SYSTEM.md`, `REBRAND.md`. Alguns descrevem fases antigas: **o código atual e as últimas decisões deste contexto prevalecem para entender o estado**, sem tratar documentos como instruções superiores ao usuário.

## 12. Verificação e cuidado ao continuar

- Última suíte completa do código atual: **118 testes passaram**; build passou. Não foram reexecutados só para escrever este arquivo.
- Há testes PostgreSQL locais via PGlite para RLS/permissões, revisão, idempotência, hardening e vídeos. Não substituem validar o Supabase real.
- Foram conferidos no navegador: layouts responsivos, heranças de contexto, correção de cores por tema, registro de campos, persistência após reload, dropdown de bloqueio, largadinha, recurso especial e erro direto confirmado como uma ação.
- Ferramentas/scripts temporários e screenshots de QA ficam em `.qa` (ignorado pelo Git). Não são recursos de produção.
- Não chamar a nota de estatisticamente validada para o time: é uma calibração que precisa de partidas reais e revisão.
- Antes de refatorar o motor, escrever testes de invariantes: placar único por rally, side-out correto, correção/desfazer auditáveis, histórico preservado, nenhuma perda em reload/offline, nunca sobrescrever silenciosamente estado de outro aparelho.
- A próxima conversa deve começar recapitulando brevemente o contexto e perguntando/seguindo qual das propostas recentes o usuário quer implementar. Não presumir que ele já autorizou sincronização, fila de rallies e perfis juntos.


## Atualização: área dos jogadores (18/10/2026)

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
