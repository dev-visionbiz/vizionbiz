-- ============================================================
-- VisionBiz — Seed inicial
-- Cria apenas o perfil do administrador da plataforma.
--
-- ANTES de rodar este SQL:
--   1. Supabase Dashboard → Authentication → Users → Add user
--   2. Use o mesmo e-mail abaixo e defina sua senha real
--   3. Depois execute este INSERT para criar o perfil em public.users
--
-- Os tenants (escritórios) são criados pelo admin em /admin.
-- ============================================================

INSERT INTO
    public.users (
        id,
        tenant_id,
        nome,
        email,
        papel,
        ativo,
        senha_hash
    )
VALUES (
        'vb-admin',
        NULL,
        'Admin VisionBiz',
        'dev.visionbiz@gmail.com',
        'visionbiz_admin',
        true,
        'senha123'
    ) ON CONFLICT (id) DO NOTHING;