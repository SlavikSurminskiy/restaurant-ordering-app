-- Hand-written: a database role per service, with access to its own schema only
-- (docs/microservices.md, data ownership). Migrations and the seed keep running as the owner.
--
-- Roles belong to the whole Postgres server, not to one database: the shadow database of
-- `migrate dev` runs this file again on the same server, so a role is created only if missing.
-- No passwords here: libs/database/scripts/set-role-passwords.mjs sets them after the migrations,
-- and until then a role cannot log in.
DO $$
DECLARE
  service TEXT;
BEGIN
  FOREACH service IN ARRAY ARRAY['auth_service', 'menu_service', 'orders_service'] LOOP
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = service) THEN
      EXECUTE format('CREATE ROLE %I LOGIN', service);
    END IF;
  END LOOP;
END $$;

-- Data only (no CREATE, ALTER or DROP): the schema changes through migrations.
-- DEFAULT PRIVILEGES covers tables that later migrations create in the schema.
GRANT USAGE ON SCHEMA "auth" TO auth_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "auth" TO auth_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA "auth" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO auth_service;

GRANT USAGE ON SCHEMA "menu" TO menu_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "menu" TO menu_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA "menu" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO menu_service;

GRANT USAGE ON SCHEMA "orders" TO orders_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA "orders" TO orders_service;
ALTER DEFAULT PRIVILEGES IN SCHEMA "orders" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO orders_service;
