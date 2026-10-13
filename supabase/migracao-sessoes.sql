-- Rode UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Faz o banco recusar sessões encerradas. Assim, quando você roda trocar-senha.sql,
-- todo mundo é desconectado na hora (o site volta para a tela de login).

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

-- "(select ...)" faz o Postgres avaliar a função uma vez por consulta, não uma vez por linha.
drop policy if exists nfs_select on public.nfs;
drop policy if exists nfs_insert on public.nfs;
drop policy if exists nfs_update on public.nfs;
drop policy if exists nfs_delete on public.nfs;
create policy nfs_select on public.nfs for select to authenticated using ((select public.usuario_permitido()));
create policy nfs_insert on public.nfs for insert to authenticated with check ((select public.usuario_permitido()));
create policy nfs_update on public.nfs for update to authenticated using ((select public.usuario_permitido())) with check ((select public.usuario_permitido()));
create policy nfs_delete on public.nfs for delete to authenticated using ((select public.usuario_permitido()));
