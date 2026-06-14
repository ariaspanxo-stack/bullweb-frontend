import React from 'react';
import type { UnitOfMeasure } from '../../types/ingredient.types';

interface UnitSelectorProps {
  value: UnitOfMeasure;
  onChange: (unit: UnitOfMeasure) => void;
  error?: string;
}

const units: { value: UnitOfMeasure; label: string; description: string }[] = [
  { value: 'kg', label: 'Kilogramo (kg)', description: 'Peso sólido' },
  { value: 'g', label: 'Gramo (g)', description: 'Peso sólido pequeño' },
  { value: 'L', label: 'Litro (L)', description: 'Volumen líquido' },
  { value: 'ml', label: 'Mililitro (ml)', description: 'Volumen líquido pequeño' },
  { value: 'unit', label: 'Unidad', description: 'Piezas individuales' },
  { value: 'lb', label: 'Libra (lb)', description: 'Peso imperial' },
  { value: 'oz', label: 'Onza (oz)', description: 'Peso imperial pequeño' },
  { value: 'cup', label: 'Taza', description: 'Medida de cocina' },
  { value: 'tbsp', label: 'Cucharada', description: 'Medida pequeña' },
  { value: 'tsp', label: 'Cucharadita', description: 'Medida muy pequeña' },
];

export const UnitSelector: React.FC<UnitSelectorProps> = ({
  value,
  onChange,
  error,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Unidad de Medida <span className="text-red-500">*</span>
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as UnitOfMeasure)}
        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          error ? 'border-red-500' : 'border-gray-300'
        }`}
      >
        <option value="">Selecciona una unidad</option>
        {units.map((unit) => (
          <option key={unit.value} value={unit.value}>
            {unit.label} - {unit.description}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      <p className="mt-1 text-xs text-gray-500">
        Define cómo se medirá este ingrediente (kg, litros, unidades, etc.)
      </p>
    </div>
  );
};

export default UnitSelector;
