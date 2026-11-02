-- E2E-1 SOLO LOCAL (bullweb_test): saca los usuarios E2E y lo que dejaron. En produccion los usuarios E2E quedan para las corridas siguientes.
BEGIN;
UPDATE orders SET "userId" = NULL WHERE "userId" IN (SELECT id FROM users WHERE email LIKE 'e2e-%@bullwebchile.com');
DELETE FROM cash_movements WHERE "sessionId" IN (SELECT id FROM cash_sessions WHERE "openedById"::text IN (SELECT id::text FROM users WHERE email LIKE 'e2e-%@bullwebchile.com'));
DELETE FROM cash_sessions WHERE "openedById"::text IN (SELECT id::text FROM users WHERE email LIKE 'e2e-%@bullwebchile.com');
DELETE FROM audit_logs WHERE "actorId" IN (SELECT id FROM users WHERE email LIKE 'e2e-%@bullwebchile.com');
DELETE FROM users WHERE email LIKE 'e2e-%@bullwebchile.com';
COMMIT;
SELECT 'usuarios_e2e_restantes=' || count(*) FROM users WHERE email LIKE 'e2e-%@bullwebchile.com';
