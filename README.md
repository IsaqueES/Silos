# 🌾 Controle de Silos

Site para acompanhar as NFs dos romaneios por silo (1 a 9): quais já foram lançadas no SAP e quais ainda estão pendentes.

- Sidebar com cada silo, contador de pendentes e barra de progresso
- Visão geral com o progresso de todos os silos
- Filtro por período (de/até, pela coluna DTV), busca e filtro por status
- Clique em uma NF para marcá-la como **OK** (ou desfazer)
- Importação de CSV para marcar várias NFs como concluídas de uma vez
- Login por código enviado ao e-mail (via Supabase) e lista de e-mails autorizados
- Exportação da lista filtrada em CSV

## Como funciona

O CSV tem as colunas abaixo (com ou sem cabeçalho; separador `;` ou `,`):

```
NF;NOR;QTD;DEP;SILO;LOTE;MATERIAL;DTV
1001;5501;32.450,5;D01;1;L2026-01;100234;01/10/2026
```

Em **Importar CSV** há duas opções:

| Opção | O que faz |
|---|---|
| **Base de NFs (pendentes)** | Carrega todas as NFs do período. Elas entram como *não concluídas*. NFs que já existem não são alteradas. |
| **NFs lançadas no SAP (concluir)** | Toda NF do arquivo vira **OK**. Se a NF não estava na base, ela é criada já concluída. |

Exemplo: a base tem `[1:não, 2:não, 3:não, 4:não]`; você envia o CSV com as NFs `2` e `3` → fica `[1:não, 2:sim, 3:sim, 4:não]`.

Detalhes:
- A comparação é feita pelo **número da NF** (zeros à esquerda são ignorados: `000123` = `123`). Se uma NF tiver vários itens/lotes, todos ficam OK.
- A coluna SILO aceita `3`, `Silo 3`, `S03`…
- DTV aceita `dd/mm/aaaa`, `dd.mm.aaaa` ou `aaaa-mm-dd` — é ela que o filtro de período usa.
- No Excel: *Arquivo > Salvar como > CSV (separado por vírgulas)*. Arquivos de exemplo: `exemplo-base.csv` e `exemplo-lancadas.csv`.

## Rodar no computador

```bash
npm install
npm run dev
```

Sem configurar o Supabase o site abre em **modo local**: tudo funciona, mas os dados ficam salvos só no seu navegador e não há login. Bom para testar.

## Colocar no ar (grátis)

Usa **Supabase** (banco + login, plano free) e **GitHub Pages** (hospedagem, free).

### 1. Supabase (banco de dados)
1. Crie uma conta em <https://supabase.com> e um projeto novo.
2. Em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), **troque o e-mail no final pelo(s) e-mail(s) Microsoft autorizados** e clique em *Run*.
   - Para liberar alguém depois: `insert into usuarios_permitidos (email) values ('fulano@empresa.com.br');`
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.

### 2. Login por código no e-mail
A pessoa digita o e-mail, recebe um código de 6 dígitos e entra. Só quem está em `usuarios_permitidos` vê os dados.

1. **Authentication > Emails > Templates > Magic Link**: troque o corpo do e-mail por algo que mostre o código, por exemplo:
   ```html
   <h2>Controle de Silos</h2>
   <p>Seu código de acesso é: <b style="font-size:24px">{{ .Token }}</b></p>
   ```
   (Usar código em vez de link evita que o antivírus do e-mail corporativo "clique" no link e o invalide.)
2. **Authentication > URL Configuration**: em *Site URL* e *Redirect URLs* coloque `https://SEU-USUARIO.github.io/Silos/` (e `http://localhost:5173/` para testar local).
3. **Envio de e-mails:** o servidor de e-mail padrão do Supabase só envia para e-mails que são membros da sua organização no Supabase, e no máximo poucos e-mails por hora. Escolha uma opção:
   - **Mais simples:** em *Organization Settings > Team > Invite*, convide o e-mail de cada usuário do site e aceite o convite.
   - **Para mais usuários:** configure um SMTP próprio em *Authentication > Emails > SMTP Settings* (ex.: Resend ou Brevo, ambos com plano grátis).

A sessão fica salva no navegador, então o código só é pedido de novo quando você clicar em *Sair* ou trocar de navegador.

<details>
<summary>Opcional: login com Microsoft (precisa de permissão no Azure/Entra ID)</summary>

1. No Azure: **Registros de aplicativo > Novo registro**, URI de redirecionamento (Web) `https://SEU-PROJETO.supabase.co/auth/v1/callback`. Crie um segredo do cliente.
2. No Supabase: **Authentication > Sign In / Providers > Azure** → cole o Client ID, o Secret e o Tenant URL.
3. No GitHub, crie a variável/secret `VITE_LOGIN_MICROSOFT` = `true` para o botão aparecer.
</details>

### 3. GitHub Pages (hospedagem)
1. No repositório: **Settings > Secrets and variables > Actions > New repository secret**, crie:
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = chave anon public
2. **Settings > Pages > Build and deployment > Source: GitHub Actions**.
3. Faça merge na branch `main` (ou rode o workflow manualmente em **Actions > Deploy no GitHub Pages > Run workflow**).
4. O site fica em `https://SEU-USUARIO.github.io/Silos/`.

> A chave *anon* pode ficar no site público: quem protege os dados são as regras de segurança (RLS) do `schema.sql`, que só deixam ler/alterar os e-mails da tabela `usuarios_permitidos`.

Para testar local com o Supabase, copie `.env.example` para `.env.local` e preencha.

## Estrutura

```
src/
  App.jsx                 estado, login, regras de importação
  components/             Sidebar, Overview, SiloView, ImportDialog, Login
  lib/csv.js              leitura/normalização do CSV
  lib/store.js            Supabase ou localStorage (modo local)
supabase/schema.sql       tabelas e permissões
.github/workflows/        deploy automático no GitHub Pages
```
