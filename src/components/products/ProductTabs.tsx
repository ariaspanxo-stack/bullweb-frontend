import React from 'react';
import { PackageIcon, FolderIcon, Carrot, ClipboardList, Settings, ChefHat } from 'lucide-react';

// Hotfix #258 (A1): la pestaña "Dashboard" se elimina de Productos.
export type TabType = 'productos' | 'categorias' | 'ingredientes' | 'fichas' | 'modificadores' | 'estaciones';

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
  // ═══════════════════════════════════════════════════════════════
  // F1a PROYECTO MODIFICADORES: pestaña reactivada con backend de grupos
  // tipo Rappi (modifier_groups / modifier_options / product_modifier_groups).
  // Para desactivar: cambiar a `false` y la pestaña desaparecerá.
  // ═══════════════════════════════════════════════════════════════
  const MODIFIERS_ENABLED = true;

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
      label: 'Fichas técnicas',
      icon: ClipboardList,
      count: recipeCount,
    },
    // SOFT-HIDE: pestaña Modificadores oculta (MODIFIERS_ENABLED=false).
    // El código se conserva intacto para reactivarlo fácilmente.
    ...(MODIFIERS_ENABLED
      ? [
          {
            id: 'modificadores' as TabType,
            label: 'Modificadores',
            icon: Settings,
            count: modifierCount,
          },
        ]
      : []),
    {
      id: 'estaciones' as TabType,
      label: 'Estaciones',
      icon: ChefHat,
      count: stationCount,
    },
  ];

  return (
    <div className="bg-white border-b border-[#E2E8F0]">
      <div className="flex gap-1 px-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                relative flex items-center gap-2 h-12 px-4 text-sm font-semibold whitespace-nowrap
                border-b-2 transition-colors duration-200
                ${
                  isActive
                    ? 'border-[#F97316] text-[#0F172A]'
                    : 'border-transparent text-[#64748B] hover:text-[#0F172A]'
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
                        ? 'bg-[#FFF7ED] text-[#C2410C]'
                        : 'bg-[#F1F5F9] text-[#475569]'
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
