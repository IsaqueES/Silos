-- Rode UMA vez no Supabase: SQL Editor > New query > colar > Run.
-- Adiciona "Adicionado por" / "Lançado por" e libera o usuário da senha geral.

alter table public.nfs add column if not exists adicionado_por text;
alter table public.nfs add column if not exists lancado_por    text;

-- NFs já marcadas antes desta mudança: aproveita quem marcou (era o e-mail)
update public.nfs set lancado_por = concluida_por
where concluida and lancado_por is null and concluida_por is not null;

-- Usuário compartilhado da senha geral (crie-o em Authentication > Users > Add user)
insert into public.usuarios_permitidos (email) values ('acesso@silos.app')
on conflict do nothing;
