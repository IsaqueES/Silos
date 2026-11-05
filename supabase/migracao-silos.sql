-- Rode UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Guarda a lista de silos (para poder adicionar/remover silos pelo site). Começa com os silos 1 a 9.

create table if not exists public.silos (
  silo       text primary key check (silo ~ '^[1-9][0-9]{0,2}$'),   -- número do silo: 1, 2, ... 10, 11
  criado_por text,
  criado_em  timestamptz not null default now()
);

insert into public.silos (silo)
select g::text from generate_series(1, 9) g
on conflict do nothing;

alter table public.silos enable row level security;

drop policy if exists silos_select on public.silos;
drop policy if exists silos_insert on public.silos;
drop policy if exists silos_delete on public.silos;
create policy silos_select on public.silos for select to authenticated using ((select public.usuario_permitido()));
create policy silos_insert on public.silos for insert to authenticated with check ((select public.usuario_permitido()));
create policy silos_delete on public.silos for delete to authenticated using ((select public.usuario_permitido()));

-- A "meta de itens" foi removida do site: apaga a tabela, se você chegou a criá-la.
drop table if exists public.silos_meta;
