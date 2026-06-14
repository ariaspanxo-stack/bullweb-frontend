import React from 'react';
import { PlusIcon, PencilIcon, TrashIcon } from 'lucide-react';
import type { IngredientCategory } from '../../types/ingredient.types';

interface IngredientCategoriesTabProps {
  categories: IngredientCategory[];
  onAdd: () => void;
  onEdit: (category: IngredientCategory) => void;
  onDelete: (categoryId: string) => void;
}

export const IngredientCategoriesTab: React.FC<IngredientCategoriesTabProps> = ({
  categories,
  onAdd,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorías de Ingredientes</h2>
          <p className="text-gray-600 mt-1">Organiza tus ingredientes por tipo</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((category) => (
          <div
            key={category.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="text-3xl">{category.icon}</div>
                <div>
                  <h3 className="font-semibold text-gray-900">{category.name}</h3>
                  <p className="text-sm text-gray-600">
                    {category.ingredientsCount} ingredientes
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => onEdit(category)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
              >
                <PencilIcon className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={() => onDelete(category.id)}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100"
              >
                <TrashIcon className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IngredientCategoriesTab;
