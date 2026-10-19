-- Rode UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Cria a meta de itens de cada silo (ex.: Silo 1 = 30 itens).

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
