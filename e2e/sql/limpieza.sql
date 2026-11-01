-- E2E-1: borra lo creado por la suite en el tenant sandbox, solo marca E2E-PW- (los E2E-158 etc. previos no se tocan). Idempotente.
BEGIN;
CREATE TEMP TABLE _e2e_o AS SELECT id FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" ILIKE 'E2E-PW-%';
CREATE TEMP TABLE _e2e_c AS SELECT id FROM customers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name ILIKE 'E2E-PW-%';
DELETE FROM print_jobs WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND EXISTS (SELECT 1 FROM _e2e_o o WHERE print_jobs.payload LIKE '%' || o.id || '%');
DELETE FROM payments WHERE "orderId" IN (SELECT id FROM _e2e_o);
DELETE FROM qr_pending_orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND customer_name ILIKE 'E2E-PW-%';
DELETE FROM stock_movements WHERE reference IN (SELECT id FROM _e2e_o);
DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM _e2e_o);
DELETE FROM delivery_orders WHERE "orderId" IN (SELECT id FROM _e2e_o);
UPDATE tables SET "currentOrderId" = NULL WHERE "currentOrderId" IN (SELECT id FROM _e2e_o);
DELETE FROM orders WHERE id IN (SELECT id FROM _e2e_o);
DELETE FROM points_history WHERE "customerId" IN (SELECT id FROM _e2e_c);
DELETE FROM loyalty_points WHERE "customerId" IN (SELECT id FROM _e2e_c);
DELETE FROM customers WHERE id IN (SELECT id FROM _e2e_c);
COMMIT;
SELECT 'restos pedidos=' || (SELECT count(*) FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" ILIKE 'E2E-PW-%')
  || ' qr=' || (SELECT count(*) FROM qr_pending_orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND customer_name ILIKE 'E2E-PW-%')
  || ' clientes=' || (SELECT count(*) FROM customers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name ILIKE 'E2E-PW-%')
  || ' previos_E2E_no_tocados=' || (SELECT count(*) FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" LIKE 'E2E-%' AND "customerName" NOT ILIKE 'E2E-PW-%');
