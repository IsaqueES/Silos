-- TROCAR A SENHA GERAL E DESCONECTAR TODO MUNDO
-- 1. Troque NOVA_SENHA (linha abaixo, entre aspas) pela senha nova.
-- 2. SQL Editor > colar > Run.
-- Quem estiver com o site aberto volta para a tela de login em até 1 minuto.

do $$
declare
  nova text := 'NOVA_SENHA';
  uid  uuid;
begin
  if nova = 'NOVA' || '_SENHA' or length(nova) < 6 then
    raise exception 'Troque NOVA_SENHA pela senha nova (mínimo 6 caracteres).';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(nova, extensions.gen_salt('bf')),
         updated_at = now()
   where email = 'acesso@silos.app'
  returning id into uid;

  if uid is null then
    raise exception 'Usuário acesso@silos.app não encontrado (crie em Authentication > Users > Add user).';
  end if;

  delete from auth.sessions where user_id = uid;  -- encerra todas as sessões (e seus refresh tokens)
end $$;
