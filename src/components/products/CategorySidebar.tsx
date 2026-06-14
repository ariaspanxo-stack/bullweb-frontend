import React, { useState } from 'react';
import {
  Folder,
  ChevronRight,
  ChevronDown,
  Tag,
  Cpu,
  ShoppingBag,
  Home,
  FlaskConical,
  Wrench,
  BookOpen,
  Sparkles,
  X,
} from 'lucide-react';
import type { ProductCategory } from '../../types/product.types';

// Tipos
interface Category {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  count: number;
  subcategories?: Category[];
}

interface CategorySidebarProps {
  categories: ProductCategory[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

// Mapeo de iconos por categoría (puedes personalizar según tus necesidades)
const getCategoryIcon = (categoryName: string) => {
  const name = categoryName.toLowerCase();
  if (name.includes('electr') || name.includes('tecno')) return Cpu;
  if (name.includes('ropa') || name.includes('vestuario')) return ShoppingBag;
  if (name.includes('hogar') || name.includes('casa')) return Home;
  if (name.includes('bebida') || name.includes('bebidas')) return FlaskConical;
  if (name.includes('herramienta')) return Wrench;
  if (name.includes('libro')) return BookOpen;
  if (name.includes('deco')) return Sparkles;
  return Tag;
};

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onCategorySelect,
  isOpen = true,
  onClose,
}) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const handleCategoryClick = (categoryId: string) => {
    if (selectedCategory === categoryId) {
      onCategorySelect(null); // Deseleccionar si ya está seleccionado
    } else {
      onCategorySelect(categoryId);
    }
  };

  const renderCategory = (category: ProductCategory, level: number = 0) => {
    const isExpanded = expandedCategories.has(category.id);
    const isSelected = selectedCategory === category.id;
    const hasSubcategories = false; // Por ahora no hay subcategorías en el tipo
    const Icon = getCategoryIcon(category.name);
    const count = category.productsCount || 0;

    return (
      <div key={category.id} className={level === 0 ? 'mb-1' : ''}>
        <div
          className={`
            flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
            ${level > 0 ? 'ml-6' : ''}
            ${
              isSelected
                ? 'bg-orange-50 text-orange-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }
          `}
          onClick={() => handleCategoryClick(category.id)}
        >
          {hasSubcategories && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleCategory(category.id);
              }}
              className="flex-shrink-0 p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          )}
          {!hasSubcategories && level > 0 && <div className="w-5" />}
          
          {/* Icono de emoji si existe, sino icono genérico */}
          {category.icon ? (
            <span className="text-lg">{category.icon}</span>
          ) : (
            <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`} />
          )}
          
          <span className="flex-1 text-sm">{category.name}</span>
          
          {/* Contador de productos */}
          <span
            className={`
            text-xs px-2 py-0.5 rounded-full
            ${
              isSelected
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600'
            }
          `}
          >
            {count}
          </span>
        </div>
      </div>
    );
  };

  const totalProducts = categories.reduce((acc, cat) => acc + (cat.productsCount || 0), 0);
  const activeCategories = categories.filter(cat => cat.active).sort((a, b) => a.order - b.order);

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:sticky top-0 left-0 h-full lg:h-auto
          w-72 bg-white border-r border-gray-200
          z-50 lg:z-0
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Folder className="w-6 h-6 text-gray-700" />
              <h2 className="text-lg font-semibold text-gray-900">Categorías</h2>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            )}
          </div>

          {/* Todas las categorías */}
          <div
            className={`
              flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all
              ${
                selectedCategory === null
                  ? 'bg-orange-50 text-orange-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }
            `}
            onClick={() => onCategorySelect(null)}
          >
            <Tag
              className={`w-5 h-5 ${selectedCategory === null ? 'text-orange-600' : 'text-gray-400'}`}
            />
            <span className="flex-1 text-sm">Todas las categorías</span>
            <span
              className={`
                text-xs px-2 py-0.5 rounded-full
                ${
                  selectedCategory === null
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-gray-100 text-gray-600'
                }
              `}
            >
              {totalProducts}
            </span>
          </div>

          <div className="h-px bg-gray-200" />

          {/* Lista de categorías */}
          <div className="space-y-1">
            {activeCategories.length > 0 ? (
              activeCategories.map((category) => renderCategory(category))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Folder className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No hay categorías</p>
                <p className="text-xs mt-1">Crea tu primera categoría</p>
              </div>
            )}
          </div>

          {/* Footer info */}
          {activeCategories.length > 0 && (
            <div className="mt-6 p-3 bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200">
              <div className="text-xs text-gray-700 space-y-1">
                <p className="font-semibold text-orange-800 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Consejo
                </p>
                <p className="text-gray-600">
                  Selecciona una categoría para filtrar productos. Click de nuevo para deseleccionar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default CategorySidebar;
