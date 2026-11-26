-- LOTE 342: precondicion de F12 en bullweb_test (sandbox 6c9d34d2): plan TODO a 19.900 y Fidelizacion apagada por fila de module_subscriptions.
-- Solo parte desde el estado base de la copia (STARTER 29.000 y sin filas de modulo); si no, aborta sin tocar nada. La revierte f12_revertir.sql.
DO $$
BEGIN
  IF (SELECT plan || '|' || "priceCLP" FROM subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568') IS DISTINCT FROM 'STARTER|29000'
     OR (SELECT count(*) FROM module_subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568') <> 0 THEN
    RAISE EXCEPTION 'F12: el sandbox no esta en su estado base (STARTER|29000 sin filas de modulo); no se toca nada';
  END IF;
END $$;
UPDATE subscriptions SET plan = 'TODO', "priceCLP" = 19900 WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
INSERT INTO module_subscriptions (id, "tenantId", module, status, created_at, updated_at)
VALUES (gen_random_uuid(), '6c9d34d2-29d0-4094-93a8-9abd1f5c9568', 'fidelizacion', 'inactive', now(), now());
SELECT 'plan_precio=' || plan || '|' || "priceCLP" || ' fidelizacion=' || (SELECT status FROM module_subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND module = 'fidelizacion')
FROM subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
