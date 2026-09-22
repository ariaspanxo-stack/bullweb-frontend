import { Package, ShoppingCart, Activity, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InventoryTabsProps {
  activeTab: 'ingredients' | 'recipes' | 'purchases' | 'movements' | 'suppliers';
  onTabChange: (tab: 'ingredients' | 'recipes' | 'purchases' | 'movements' | 'suppliers') => void;
}

const tabs = [
  { value: 'ingredients', label: 'Ingredientes', icon: Package },
  // Tab "Recetas" oculto: se usa la vista premium de Productos (Fichas Técnicas).
  // { value: 'recipes', label: 'Recetas', icon: BookOpen },
  { value: 'purchases', label: 'Compras', icon: ShoppingCart },
  { value: 'movements', label: 'Movimientos', icon: Activity },
  { value: 'suppliers', label: 'Proveedores', icon: Truck },
] as const;

export default function InventoryTabs({ activeTab, onTabChange }: InventoryTabsProps) {
  return (
    <div className="border-b border-white/10">
      <nav className="flex gap-4">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;
          
          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 border-b-2 transition-colors',
                isActive
                  ? 'border-brand-500 text-brand-500 font-medium'
                  : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-white/20'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
