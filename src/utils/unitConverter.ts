import type { UnitOfMeasure } from '../types/ingredient.types';

/**
 * Convierte una cantidad de una unidad a otra
 */
export const convertUnit = (
  quantity: number,
  fromUnit: UnitOfMeasure,
  toUnit: UnitOfMeasure
): number => {
  // Si las unidades son iguales, no convertir
  if (fromUnit === toUnit) {
    return quantity;
  }

  // Conversiones de peso
  if ((fromUnit === 'kg' && toUnit === 'g') || (fromUnit === 'g' && toUnit === 'kg')) {
    if (fromUnit === 'kg') {
      return quantity * 1000; // kg → g
    } else {
      return quantity / 1000; // g → kg
    }
  }

  // Conversiones de volumen
  if ((fromUnit === 'L' && toUnit === 'ml') || (fromUnit === 'ml' && toUnit === 'L')) {
    if (fromUnit === 'L') {
      return quantity * 1000; // L → ml
    } else {
      return quantity / 1000; // ml → L
    }
  }

  // Conversiones libras ↔ kg
  if ((fromUnit === 'lb' && toUnit === 'kg') || (fromUnit === 'kg' && toUnit === 'lb')) {
    if (fromUnit === 'lb') {
      return quantity * 0.453592; // lb → kg
    } else {
      return quantity / 0.453592; // kg → lb
    }
  }

  // Conversiones onzas ↔ gramos
  if ((fromUnit === 'oz' && toUnit === 'g') || (fromUnit === 'g' && toUnit === 'oz')) {
    if (fromUnit === 'oz') {
      return quantity * 28.3495; // oz → g
    } else {
      return quantity / 28.3495; // g → oz
    }
  }

  // Si no hay conversión disponible, retornar cantidad original
  console.warn(`No hay conversión disponible de ${fromUnit} a ${toUnit}`);
  return quantity;
};

/**
 * Verifica si dos unidades son compatibles para conversión
 */
export const areUnitsCompatible = (
  unit1: UnitOfMeasure,
  unit2: UnitOfMeasure
): boolean => {
  const weightUnits: UnitOfMeasure[] = ['kg', 'g', 'lb', 'oz'];
  const volumeUnits: UnitOfMeasure[] = ['L', 'ml', 'cup'];
  const countUnits: UnitOfMeasure[] = ['unit'];
  const spoonUnits: UnitOfMeasure[] = ['tbsp', 'tsp'];

  const isWeight = (u: UnitOfMeasure) => weightUnits.includes(u);
  const isVolume = (u: UnitOfMeasure) => volumeUnits.includes(u);
  const isCount = (u: UnitOfMeasure) => countUnits.includes(u);
  const isSpoon = (u: UnitOfMeasure) => spoonUnits.includes(u);

  return (
    (isWeight(unit1) && isWeight(unit2)) ||
    (isVolume(unit1) && isVolume(unit2)) ||
    (isCount(unit1) && isCount(unit2)) ||
    (isSpoon(unit1) && isSpoon(unit2))
  );
};

/**
 * Obtiene el nombre legible de una unidad
 */
export const getUnitLabel = (unit: UnitOfMeasure): string => {
  const labels: Record<UnitOfMeasure, string> = {
    kg: 'Kilogramo',
    g: 'Gramo',
    L: 'Litro',
    ml: 'Mililitro',
    unit: 'Unidad',
    lb: 'Libra',
    oz: 'Onza',
    cup: 'Taza',
    tbsp: 'Cucharada',
    tsp: 'Cucharadita',
  };
  return labels[unit] || unit;
};
