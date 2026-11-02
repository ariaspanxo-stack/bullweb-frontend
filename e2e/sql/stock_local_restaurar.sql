-- E2E-1 SOLO LOCAL: repone el stock guardado por stock_local_guardar.sql y saca la tabla temporal.
BEGIN;
UPDATE ingredients i SET "currentStock" = b."currentStock" FROM _e2e_bk_ingredients b WHERE b.id = i.id;
DROP TABLE _e2e_bk_ingredients;
COMMIT;
