# 🌾 Controle de Silos

Site para acompanhar as NFs dos romaneios por silo (1 a 9): quais já foram lançadas no SAP e quais ainda estão pendentes.

- Sidebar com cada silo, contador de pendentes e barra de progresso
- Visão geral com o progresso de todos os silos
- Filtro por período (de/até, pela coluna DTV), busca e filtro por status
- Clique em uma NF para marcá-la como **OK** (ou desfazer)
- Importação de CSV para marcar várias NFs como concluídas de uma vez
- Login com conta Microsoft (via Supabase) e lista de e-mails autorizados
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

Sem configurar o Supabase o site abre em **modo local**: tudo funciona, mas os dados ficam salvos só no seu navegador e não há login Microsoft. Bom para testar.

## Colocar no ar (grátis)

Usa **Supabase** (banco + login, plano free) e **GitHub Pages** (hospedagem, free).

### 1. Supabase (banco de dados)
1. Crie uma conta em <https://supabase.com> e um projeto novo.
2. Em **SQL Editor**, cole o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), **troque o e-mail no final pelo(s) e-mail(s) Microsoft autorizados** e clique em *Run*.
   - Para liberar alguém depois: `insert into usuarios_permitidos (email) values ('fulano@empresa.com.br');`
3. Em **Project Settings > API**, copie a **Project URL** e a chave **anon public**.

### 2. Login Microsoft (Azure / Entra ID)
1. Acesse <https://portal.azure.com> > **Microsoft Entra ID > Registros de aplicativo > Novo registro**.
   - Tipos de conta: escolha *"Contas em qualquer diretório organizacional e contas pessoais da Microsoft"* (ou só a sua organização, se preferir).
   - URI de redirecionamento (Web): `https://SEU-PROJETO.supabase.co/auth/v1/callback`
2. Copie o **ID do aplicativo (cliente)**. Em **Certificados e segredos > Novo segredo do cliente**, copie o **Valor** do segredo.
3. No Supabase: **Authentication > Sign In / Providers > Azure** → ative, cole o *Client ID* e o *Secret*.
   - Se escolheu só a sua organização, preencha *Azure Tenant URL* com `https://login.microsoftonline.com/<ID-do-locatário>`.
4. No Supabase: **Authentication > URL Configuration** → em *Site URL* e *Redirect URLs* coloque o endereço do site, ex.: `https://SEU-USUARIO.github.io/Silos/` (e `http://localhost:5173/` para testar local).

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
