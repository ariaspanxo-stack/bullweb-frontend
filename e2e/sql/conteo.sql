-- E2E-1 solo lectura: conteos del tenant sandbox antes y despues de la suite. Deben quedar identicos tras la limpieza.
SELECT 'CONTEO orders=' || (SELECT count(*) FROM orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO order_items=' || (SELECT count(*) FROM order_items i JOIN orders o ON o.id = i."orderId" WHERE o."tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO payments=' || (SELECT count(*) FROM payments p JOIN orders o ON o.id = p."orderId" WHERE o."tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO qr_pending_orders=' || (SELECT count(*) FROM qr_pending_orders WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO customers=' || (SELECT count(*) FROM customers WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO print_jobs=' || (SELECT count(*) FROM print_jobs WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO mesas_ocupadas=' || (SELECT count(*) FROM tables WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND status <> 'AVAILABLE');
SELECT 'CONTEO usuarios_activos=' || (SELECT count(*) FROM users WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568' AND active AND "deletedAt" IS NULL);
SELECT 'CONTEO productos_md5=' || (SELECT md5(string_agg(id || ':' || name || ':' || price::text || ':' || available::text || ':' || COALESCE(stock::text, '-'), ',' ORDER BY id)) FROM products WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO stock_movements=' || (SELECT count(*) FROM stock_movements WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO carta_analytics=' || (SELECT count(*) FROM carta_analytics WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
SELECT 'CONTEO ingredientes_md5=' || (SELECT md5(string_agg(id || ':' || "currentStock"::text, ',' ORDER BY id)) FROM ingredients WHERE "tenantId"::text = '6c9d34d2-29d0-4094-93a8-9abd1f5c9568');
