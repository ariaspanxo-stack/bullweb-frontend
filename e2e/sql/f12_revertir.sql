-- LOTE 342: revierte la precondicion de F12 (f12_preparar.sql) al estado base de la copia: STARTER 29.000 y sin filas de modulo en el sandbox.
DELETE FROM module_subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND module = 'fidelizacion';
UPDATE subscriptions SET plan = 'STARTER', "priceCLP" = 29000 WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
SELECT 'plan_precio=' || plan || '|' || "priceCLP" || ' filas_modulo=' || (SELECT count(*) FROM module_subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568')
FROM subscriptions WHERE "tenantId" = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568';
