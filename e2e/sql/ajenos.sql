-- E2E-1 solo lectura: un pedido, un producto y un cliente de OTRO tenant para la prueba de aislamiento F8 (solo ids).
SELECT 'AJENO|' || t.id::text || '|' || o.id::text || '|' || p.id::text || '|' || c.id::text
FROM tenants t
JOIN LATERAL (SELECT id FROM orders x WHERE x."tenantId"::text = t.id::text ORDER BY x."createdAt" DESC LIMIT 1) o ON true
JOIN LATERAL (SELECT id FROM products x WHERE x."tenantId"::text = t.id::text AND x."deletedAt" IS NULL LIMIT 1) p ON true
JOIN LATERAL (SELECT id FROM customers x WHERE x."tenantId"::text = t.id::text LIMIT 1) c ON true
WHERE t.id::text <> '6c9d34d2-29d0-4094-93a8-9abd1f5c9568'
ORDER BY t.id LIMIT 1;
