-- Branches con tenant
SELECT b.id, b.name as branch_name, b."tenantId", t.name as tenant_name, t.slug
FROM branches b
LEFT JOIN tenants t ON t.id = b."tenantId"
ORDER BY b."createdAt" DESC;

-- Users relevantes
SELECT u.id, u.email, u."tenantId", u.role
FROM users u
WHERE u.email IN ('ariasss@gmail.com', 'ariaspanxo@gmail.com')
OR u.role = 'SUPERADMIN'
ORDER BY u.role;

-- Tenants
SELECT id, name, slug FROM tenants ORDER BY "createdAt" DESC;

-- Print agents con tenantId
SELECT pa.id, pa.name, pa.branch_id, pa."tenantId" FROM print_agents pa ORDER BY pa.created_at DESC LIMIT 10;
