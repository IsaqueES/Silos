-- Rode este script no Supabase: SQL Editor > New query > colar > Run.

create table if not exists public.nfs (
  id            bigint generated always as identity primary key,
  nf            text    not null,
  nor           numeric,
  qtd           numeric,
  dep           text    not null default '',
  silo          text    not null default '',
  lote          text    not null default '',
  material      text    not null default '',
  dtv           text,
  dtv_date      date,
  concluida     boolean not null default false,
  concluida_em  timestamptz,
  concluida_por text,               -- (antigo) e-mail de quem marcou
  adicionado_por text,              -- nome de quem incluiu a NF
  lancado_por   text,               -- nome de quem marcou como lançada no SAP
  origem        text,               -- 'csv' ou 'manual'
  criado_em     timestamptz not null default now(),
  unique (nf, silo, lote, material)
);
create index if not exists nfs_nf_idx   on public.nfs (nf);
create index if not exists nfs_silo_idx on public.nfs (silo);

-- Lista de e-mails que podem acessar o site.
create table if not exists public.usuarios_permitidos (
  email text primary key
);

-- Libera quem entrou com a senha geral E cuja sessão ainda existe
-- (trocar-senha.sql apaga as sessões, desconectando todo mundo).
create or replace function public.usuario_permitido()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
           select 1 from public.usuarios_permitidos
           where lower(email) = lower(auth.jwt() ->> 'email')
         )
     and exists (
           select 1 from auth.sessions
           where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
         );
$$;

alter table public.nfs                 enable row level security;
alter table public.usuarios_permitidos enable row level security;

drop policy if exists nfs_select on public.nfs;
drop policy if exists nfs_insert on public.nfs;
drop policy if exists nfs_update on public.nfs;
drop policy if exists nfs_delete on public.nfs;
create policy nfs_select on public.nfs for select to authenticated using ((select public.usuario_permitido()));
create policy nfs_insert on public.nfs for insert to authenticated with check ((select public.usuario_permitido()));
create policy nfs_update on public.nfs for update to authenticated using ((select public.usuario_permitido())) with check ((select public.usuario_permitido()));
create policy nfs_delete on public.nfs for delete to authenticated using ((select public.usuario_permitido()));

-- Meta de itens de cada silo (ex.: Silo 1 = 30 itens)
create table if not exists public.silos_meta (
  silo           text primary key,                 -- '1' a '9'
  meta           integer not null check (meta > 0),
  atualizado_por text,
  atualizado_em  timestamptz not null default now()
);

alter table public.silos_meta enable row level security;

drop policy if exists silos_meta_select on public.silos_meta;
drop policy if exists silos_meta_insert on public.silos_meta;
drop policy if exists silos_meta_update on public.silos_meta;
drop policy if exists silos_meta_delete on public.silos_meta;
create policy silos_meta_select on public.silos_meta for select to authenticated using ((select public.usuario_permitido()));
create policy silos_meta_insert on public.silos_meta for insert to authenticated with check ((select public.usuario_permitido()));
create policy silos_meta_update on public.silos_meta for update to authenticated using ((select public.usuario_permitido())) with check ((select public.usuario_permitido()));
create policy silos_meta_delete on public.silos_meta for delete to authenticated using ((select public.usuario_permitido()));

-- Usuário compartilhado da senha geral (crie-o em Authentication > Users > Add user)
insert into public.usuarios_permitidos (email) values ('acesso@silos.app')
on conflict do nothing;
