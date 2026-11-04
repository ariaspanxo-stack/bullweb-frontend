-- E2E-1: borra lo creado por la suite en el tenant sandbox, solo marca E2E-PW- (los E2E-158 etc. previos no se tocan). Idempotente.
BEGIN;
CREATE TEMP TABLE _e2e_o AS SELECT id FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" ILIKE 'E2E-PW-%';
CREATE TEMP TABLE _e2e_c AS SELECT id FROM customers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name ILIKE 'E2E-PW-%';
DELETE FROM print_jobs WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND EXISTS (SELECT 1 FROM _e2e_o o WHERE print_jobs.payload LIKE '%' || o.id || '%');
DELETE FROM payments WHERE "orderId" IN (SELECT id FROM _e2e_o);
DELETE FROM carta_analytics a WHERE a."tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND a.event = 'order_placed' AND EXISTS (SELECT 1 FROM qr_pending_orders q WHERE q."tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND q.customer_name ILIKE 'E2E-PW-%' AND abs(extract(epoch FROM a.created_at - q.created_at)) < 5);
DELETE FROM qr_pending_orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND customer_name ILIKE 'E2E-PW-%';
DELETE FROM stock_movements WHERE reference IN (SELECT id FROM _e2e_o);
DELETE FROM order_items WHERE "orderId" IN (SELECT id FROM _e2e_o);
DELETE FROM delivery_orders WHERE "orderId" IN (SELECT id FROM _e2e_o);
UPDATE tables SET "currentOrderId" = NULL WHERE "currentOrderId" IN (SELECT id FROM _e2e_o);
DELETE FROM orders WHERE id IN (SELECT id FROM _e2e_o);
DELETE FROM points_history WHERE "customerId" IN (SELECT id FROM _e2e_c);
DELETE FROM loyalty_points WHERE "customerId" IN (SELECT id FROM _e2e_c);
DELETE FROM customers WHERE id IN (SELECT id FROM _e2e_c);
DELETE FROM coupons WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND code LIKE 'E2EPW%';
-- LOTE 309: datos de F9 con la marca (fichas, movimientos, ingredientes, proveedores y productos). Va despues de los pedidos.
DELETE FROM recipes WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "productId" IN (SELECT id FROM products WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%');
DELETE FROM stock_movements WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND (("ingredientId" IN (SELECT id FROM ingredients WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%')) OR ("productId" IN (SELECT id FROM products WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%')));
DELETE FROM ingredients WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%';
DELETE FROM suppliers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%';
DELETE FROM products WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%';
COMMIT;
SELECT 'restos pedidos=' || (SELECT count(*) FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" ILIKE 'E2E-PW-%')
  || ' qr=' || (SELECT count(*) FROM qr_pending_orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND customer_name ILIKE 'E2E-PW-%')
  || ' clientes=' || (SELECT count(*) FROM customers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name ILIKE 'E2E-PW-%')
  || ' previos_E2E_no_tocados=' || (SELECT count(*) FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND "customerName" LIKE 'E2E-%' AND "customerName" NOT ILIKE 'E2E-PW-%')
  || ' f9_ingredientes=' || (SELECT count(*) FROM ingredients WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%') || ' f9_proveedores=' || (SELECT count(*) FROM suppliers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%') || ' f9_productos=' || (SELECT count(*) FROM products WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND name LIKE 'E2E-PW-%');
