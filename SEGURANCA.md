# Revisão de segurança — Só na Rede

Revisão de código e testes locais em 12/10/2026. Arquitetura: SPA React/Vite, arquivos estáticos na Vercel/Cloudflare e Auth/Postgres/Realtime no Supabase. Não há servidor próprio, armazenamento próprio de senhas ou endpoint que execute comandos. Referência: [OWASP Top 10:2025](https://top10.owasp.org/2025/).

As correções estão na branch `codex/identidade-seguranca-2026-10-12`. A identidade enviada foi preservada; a única alteração visual deliberada é a distinção das cores adversárias no tema ativo. Esta revisão não é um pentest da produção: não acessamos a configuração real do Supabase, suas contas, logs ou políticas já instaladas.

## Riscos e medidas implementadas

| Área / OWASP | Avaliação | Correção e limite |
|---|---|---|
| Dados publicados / A01, A08 | Médio; impacto alto se conteúdo privado for enviado por uma conta autorizada. O RPC tinha validação superficial e aceitava campos extras aninhados. | `publicValidation.ts` define contrato explícito; `security-schema.sql` e `security.sql` validam cada objeto no banco, rejeitam campos extras, tipos, profundidade e valores fora dos limites. Auditoria/configurações não são permitidas. O conteúdo dentro de um campo público, como nome, continua responsabilidade da comissão. |
| XSS / A05, A02 | Nenhum caminho direto de XSS encontrado; faltava CSP, aumentando o impacto de uma falha futura. | React interpola texto sem HTML bruto. Não encontramos `dangerouslySetInnerHTML`, `eval` ou execução de strings. Logos/fotos aceitam formatos raster, vídeos usam IDs do YouTube validados. CSP restringe scripts, conexões e frames; não permite `unsafe-eval` nem scripts inline. |
| SQLi e Command Injection / A05 | Nenhuma exploração encontrada nos caminhos revisados. | Supabase envia parâmetros; SQL das funções é estático, sem SQL dinâmico. `SECURITY DEFINER` usa `search_path=''`, nomes qualificados e checagem de `auth.uid()`. Não há backend que execute comandos de usuários. Manter essas propriedades em endpoints futuros. |
| CSV injection / A05 | Médio quando exportações são abertas em planilhas. Prefixos com espaços/tabulações podiam contornar a proteção. | `storage.ts` prefixa apóstrofo também antes de fórmulas precedidas por espaços ou controles; todos os campos permanecem entre aspas. |
| Importações/URLs/configuração / A08, A10 | Médio para travamento local ou envio de credenciais a um host configurado incorretamente. | Importação de backup limitada a 25 MB e fichas a 5 MB antes da leitura; validadores existentes mantidos. IDs históricos têm 1–80 caracteres alfanuméricos, `_` ou `-`. Configuração aceita apenas HTTPS de `*.supabase.co`, sem porta/caminho/query/credenciais e somente URL + chave pública. Domínios personalizados exigem alteração explícita desta allowlist e da CSP. |
| Tokens persistentes / A07 | Médio, principalmente em aparelho compartilhado e em caso de XSS. | Sessão da comissão passou para `sessionStorage`; recarregar mantém login, fechar a aba normalmente remove a cópia local. O cliente público não persiste sessão nem renova tokens. A chave antiga deste projeto no localStorage é removida, sem tocar nos jogos. A senha sai do estado após cada tentativa. Isso não revoga tokens no servidor nem substitui proteção contra XSS; navegadores podem restaurar abas/sessões. Use “Sair da publicação” ao terminar. |
| Controle de acesso / A01 | As RPCs já recusavam usuários fora de `scout_editors`. A UI considerava qualquer login como pronto. | `can_publish()` verifica a lista no banco; o botão só habilita após aprovação. RPCs e RLS continuam sendo a segurança efetiva. Abrir `?view=commission` permite apenas ferramentas/dados locais daquele navegador, não escrever no banco sem autorização. Não é uma área remota protegida apenas por esconder um link. |
| Headers / A02 | Médio: faltavam proteção contra clickjacking, MIME sniffing e restrições do navegador. | `vercel.json` e `public/_headers` incluem CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS, Referrer-Policy e Permissions-Policy. `style-src 'unsafe-inline'` é necessário para os estilos React existentes; não libera scripts. YouTube mantém fullscreen e recebe a origem necessária pelo referrer. |
| Segredos/arquivos / A02 | Risco preventivo médio: `.env.production` não estava coberto pelos ignores. Não foi identificado segredo no pacote aprovado. | `.env*` ignorado, mantendo `.env.example`; somente `dist` é publicado. O build recusa diretórios privados, links simbólicos, backups, ZIPs e chaves no diretório público, e valida `live-config.json`. SQL de instalação/documentação são downloads públicos intencionais, sem credenciais. Ignores não removem segredos já enviados ao histórico: se ocorrer, revogar/rotacionar antes de limpar o Git. |
| Abuso de publicação / A06 | Médio para uma conta autorizada comprometida. | Banco limita a 120 escritas confirmadas/minuto/usuário nas publicações e anexos; snapshots até 1 MiB e mídia até 5 MiB, roster até 30, vídeos até 20 e rallies até 2.000. Repetições idempotentes não contam. Rejeições são atômicas, mantendo a revisão anterior. Isso limita alterações, não ataques volumétricos ou requisições inválidas antes do banco. |

## Implementação no Supabase existente — necessária

1. Faça um backup do banco e exporte o JSON privado do tablet antes da atualização. A migração não apaga partidas nem notas. Teste primeiro com a branch em Preview e, de preferência, um projeto de teste.
2. No **site do Supabase → SQL Editor → New query**, execute **`supabase/security-schema.sql` e depois `supabase/security.sql`**, por completo e nessa ordem. O primeiro fornece o contrato; o segundo instala validadores, limite e `can_publish()`. Pode executar novamente. Não execute somente o segundo arquivo.
3. Alternativa após hospedar esta versão: baixe `/security-setup.sql`, que contém os dois arquivos, e execute o conteúdo inteiro no SQL Editor. Para instalação nova, `/live-setup.sql` contém `live.sql`, `videos.sql`, schema e segurança em ordem. Projetos existentes já precisam ter `live.sql` e `videos.sql` instalados.
4. Audite a allowlist no SQL Editor:

```sql
select e.user_id, u.email
from public.scout_editors e
join auth.users u on u.id = e.user_id;
```

Para autorizar uma pessoa, copie o UUID de **Authentication → Users**:

```sql
insert into public.scout_editors(user_id)
values ('UUID-REAL-DO-USUARIO') on conflict do nothing;
```

Para revogar, execute com o UUID real:

```sql
delete from public.scout_editors where user_id = 'UUID-REAL-DO-USUARIO';
```

A revogação da lista impede a próxima escrita, mesmo com um token ainda válido. Encerre também as sessões desse usuário em Authentication quando houver comprometimento. Não dê INSERT/UPDATE/DELETE a `anon` ou `authenticated` nas tabelas públicas; use somente as RPCs.

5. Confira publicações antigas, pois os triggers validam novas escritas e não reescrevem registros existentes:

```sql
select slug from public.live_public
where not public.scout_json_valid(snapshot, public.scout_payload_schema('snapshot'));
select match_id from public.public_matches
where not public.scout_json_valid(snapshot, public.scout_payload_schema('snapshot'));
select slug from public.live_media
where not public.scout_json_valid(media, public.scout_payload_schema('media'));
select match_id from public.public_matches
where media is not null
and not public.scout_json_valid(media, public.scout_payload_schema('media'));
```

Se algum aparecer, faça backup e examine-o; não apague o histórico automaticamente. Jogos íntegros do app mantêm o formato. Uma publicação incompatível é recusada pela nova página pública; a partida privada fica salva. Limites novos podem exigir dividir uma importação excepcional ou encerrar a partida antes de atingir 2.000 rallies.

## Authentication, sessão, CSRF e rate limiting

- Em **Authentication → configuração de Sign In / Providers**, desligue **Allow new users to sign up** e login anônimo. Crie manualmente as contas da comissão. Confirme que o provedor Email permite senha e a confirmação do email está ativa.
- Configure senhas com pelo menos 12 caracteres e requisitos adequados; use senhas únicas e um gerenciador. O Supabase já armazena hashes bcrypt com salt, não senha em texto; implementar bcrypt/Argon2 no React exporia a lógica no cliente sem melhorar isso. A proteção contra senhas vazadas é recurso Pro+, quando disponível. [Senha no Supabase](https://supabase.com/docs/guides/auth/password-security).
- Em **Authentication → URL Configuration**, use a URL real de produção como Site URL. Remova redirects curingas desnecessários. O app desativa autenticação implícita pela URL; não há fluxo de recuperação/magic link implementado nesta versão.
- Mantenha JWT com expiração em torno de 3.600 segundos; não confunda expiração do access token com duração total da sessão, pois o refresh token renova o acesso. Timeout de sessão, inatividade e sessão única no servidor são recursos Pro+; esta revisão não afirma habilitá-los no Free. [Sessões](https://supabase.com/docs/guides/auth/sessions).
- Em **Authentication → Rate Limits**, revise o limite de token/login e recuperação. Uma referência inicial para este time é 30 requisições de token por 5 minutos/IP, se o painel aceitar esse valor; teste o tablet e evite prejudicar refresh ou pessoas no mesmo Wi-Fi. Mantenha o intervalo de recuperação por usuário de pelo menos 60 segundos. O Supabase já aplica limites nesses endpoints. Não há recuperação de senha no UI, mas o endpoint continua existindo no serviço. [Limites oficiais](https://supabase.com/docs/guides/auth/rate-limits).
- CAPTCHA pode reforçar login/recuperação, mas **não habilite no painel antes de integrar o widget**: o formulário atual não envia `captchaToken`. Para uma próxima integração, criar Turnstile/hCaptcha, cadastrar secret somente no Supabase, inserir a site key pública no frontend e chamar `signInWithPassword({email,password,options:{captchaToken}})` após resolver o desafio; resetar o desafio em cada tentativa e permitir os domínios do provedor na CSP. [Instruções oficiais](https://supabase.com/docs/guides/auth/auth-captcha).
- MFA nas contas Vercel, GitHub e painel Supabase é recomendado agora. MFA dos publicadores requer tela de challenge TOTP e regra AAL2 na RPC; não foi imposto silenciosamente porque bloquearia as contas atuais.
- O app usa JWT em `Authorization`, não cookies de sessão enviados automaticamente entre sites. Não encontramos um caminho de CSRF clássico nas escritas atuais. Se futuramente usar cookies, adicionar HttpOnly, Secure, SameSite e token CSRF/validação de Origin no servidor. Tokens de SPA seguem acessíveis ao JavaScript e precisam da proteção contra XSS.
- O limite SQL por usuário protege escritas; limites Auth protegem Auth. WAF na Vercel protege tráfego na Vercel, **não chamadas diretas ao domínio Supabase**. DDoS exige proteção dos provedores e monitoramento; não é eliminado por um botão desabilitado ou por este limite SQL.

## Servidor, banco e CORS

- Na Vercel, mantenha `Output Directory = dist`, publique com HTTPS e faça novo deployment da branch após aplicar o SQL. Não envie a raiz como pasta estática. Na Cloudflare, envie somente os arquivos de `dist`, incluindo `_headers`.
- Não adicionamos `Access-Control-Allow-Origin: *` ao site como medida de autorização. A API é hospedada no Supabase e aceita consultas públicas por design; RLS/JWT autorizam as operações. Alterar CORS da Vercel não controla essa API. Caso seja necessário restringir Origin, será preciso um proxy backend com validação de origem e rate limiting; mesmo assim clientes não-browser podem forjar Origin, então a autorização continua necessária.
- A CSP permite conexões a `*.supabase.co` para suportar a configuração pública existente. Para reduzir essa superfície, substitua os dois curingas em `connect-src` por `https://SEU-PROJETO.supabase.co` e `wss://SEU-PROJETO.supabase.co` em `vercel.json` e `_headers`. Não coloque tokens na CSP.
- HSTS usa um ano; não ativamos preload/includeSubDomains sem confirmar o controle HTTPS de todos os subdomínios de um domínio próprio. [Headers Vercel](https://vercel.com/docs/cdn-security/security-headers), [CSP OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html).
- Execute o Security Advisor do Supabase; confira RLS em todas as novas tabelas e políticas de Storage antes de criar buckets. Nenhum bucket público de uploads foi criado por esta mudança. Use acesso mínimo e nunca libere `scout_editors` ou `scout_write_limits` para espectadores.
- Chave publishable/anon é pública e depende de RLS; `service_role`, `sb_secret`, senha do banco e tokens administrativos jamais entram em `VITE_*`, Git, JSON público ou browser. Rotacione imediatamente caso expostos. [Chaves Supabase](https://supabase.com/docs/guides/getting-started/api-keys).
- Monitore erros Auth, `not_authorized`, `rate_limited`, alterações da allowlist e consumo do banco/Realtime. `scout_write_limits` registra a janela corrente, não é um log de auditoria completo. Restrinja acesso a logs e não registre senhas/tokens/fotos.
- Mantenha lockfile e `npm ci`; instale atualizações de segurança com testes. A instalação desta revisão reportou zero vulnerabilidades conhecidas no npm audit, o que não prova ausência de falhas.
- Tenha backups do banco conforme o plano e exportações JSON privadas fora da pasta pública. Teste restauração. O banco guarda a publicação pública, não toda a auditoria privada; perder o tablet sem backup ainda é um risco operacional.
- Em tablet compartilhado, use bloqueio de tela, proteção Android e “Sair da publicação” ao terminar. Os dados locais offline não foram criptografados; um usuário com acesso ao aparelho/perfil pode consultá-los.

## Validação antes da produção

Os 104 testes passaram e o build de produção passou. Os testes cobrem papéis anon/autenticado/autorizado, escrita direta proibida, campos privados aninhados, URLs maliciosas, CSV, mídias ativas, limites, rollback, idempotência e vídeos. No navegador, comissão/modal e demonstração pública funcionaram sem erros JS ou violações CSP com headers simulados. O dourado adversário passou para ardósia no tema do time e voltou ao dourado no tema escuro. Execute `npm test` e `npm run build`. Para alterar o contrato público, rode `npm run security:schema`, revise o SQL gerado e atualize ambos os ambientes.

No projeto real, valide em dois aparelhos: login autorizado, conta fora da lista rejeitada, publicar/desfazer, encerrar e abrir histórico, fotos/vídeos, logout, offline e recarregar sem perder ações. Confira no DevTools se não há violações CSP. Os headers são aplicados pelos provedores; o Vite Preview local, sozinho, não os instala.

No PowerShell, após o novo deployment:

```powershell
curl.exe -I https://so-na-rede.vercel.app/
curl.exe -I https://so-na-rede.vercel.app/.env
curl.exe -I https://so-na-rede.vercel.app/.git/config
```

O primeiro deve trazer os headers. Os outros não podem retornar o conteúdo dos arquivos (esperado 404). A configuração real de Auth, RLS, limites e headers precisa ser confirmada depois do deployment; não foi alterada nesta revisão local.
