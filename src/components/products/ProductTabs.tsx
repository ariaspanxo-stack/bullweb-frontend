import React from 'react';
import { PackageIcon, FolderIcon, Carrot, ClipboardList, Settings, ChartBarIcon, ChefHat } from 'lucide-react';

export type TabType = 'productos' | 'categorias' | 'ingredientes' | 'fichas' | 'modificadores' | 'reportes' | 'estaciones';

interface ProductTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  productCount: number;
  categoryCount: number;
  ingredientCount: number;
  recipeCount: number;
  modifierCount: number;
  stationCount?: number;
}

export const ProductTabs: React.FC<ProductTabsProps> = ({
  activeTab,
  onTabChange,
  productCount,
  categoryCount,
  ingredientCount,
  recipeCount,
  modifierCount,
  stationCount = 0,
}) => {
  const tabs = [
    {
      id: 'productos' as TabType,
      label: 'Productos',
      icon: PackageIcon,
      count: productCount,
    },
    {
      id: 'categorias' as TabType,
      label: 'Categorías',
      icon: FolderIcon,
      count: categoryCount,
    },
    {
      id: 'ingredientes' as TabType,
      label: 'Ingredientes',
      icon: Carrot,
      count: ingredientCount,
    },
    {
      id: 'fichas' as TabType,
      label: 'Fichas Técnicas',
      icon: ClipboardList,
      count: recipeCount,
    },
    {
      id: 'modificadores' as TabType,
      label: 'Modificadores',
      icon: Settings,
      count: modifierCount,
    },
    {
      id: 'estaciones' as TabType,
      label: 'Estaciones',
      icon: ChefHat,
      count: stationCount,
    },
    {
      id: 'reportes' as TabType,
      label: 'Dashboard',
      icon: ChartBarIcon,
      count: undefined,
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex gap-1 px-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 px-4 py-3 text-sm font-medium
                border-b-2 transition-all duration-200
                ${
                  isActive
                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`
                    ml-1 px-2 py-0.5 text-xs font-semibold rounded-full
                    ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ProductTabs;
