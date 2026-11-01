-- E2E-1 SOLO LOCAL: guarda el stock exacto de ingredientes antes de la suite. El cobro de F2 descuenta receta y el previousStock del movimiento viene redondeado: no sirve para restaurar la huella.
CREATE TABLE _e2e_bk_ingredients AS SELECT id, "currentStock" FROM ingredients;
