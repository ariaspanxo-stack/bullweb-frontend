import React, { useState, useEffect, useRef } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, GripVertical, Copy, ToggleLeft, ToggleRight, MoreHorizontal } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { colorForCategory } from '../../lib/categoryHelpers';
import type { ProductCategory } from '../../types/product.types';
import { BTN_ICON, BTN_OUTLINE, BTN_PRIMARY, CARD, SUBTITLE, TITLE } from './productsUi';

interface Category {
  id: string;
  name: string;
  icon?: string;
  productsCount: number;
}

interface CategoriesTabProps {
  categories: Category[];
  onAdd: () => void;
  onEdit: (category: Category) => void;
  onDelete: (categoryId: string) => void;
  onReorder?: (orderedIds: string[]) => void;
  onDuplicate: (category: Category) => void;
  onBulkAvailability: (categoryId: string, available: boolean) => Promise<void>;
}

// ── Fila sortable ────────────────────────────────────────────
interface SortableRowProps {
  category: Category;
  color: string;
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onDuplicate: (c: Category) => void;
  onBulkAvailability: (categoryId: string, available: boolean) => Promise<void>;
  bulkLoading: boolean;
}

const MENU_ITEM = 'w-full flex items-center gap-2 h-11 px-3 text-sm text-left text-[#1E2A4A] hover:bg-slate-50 disabled:opacity-50';

const SortableRow: React.FC<SortableRowProps> = ({ category, color, onEdit, onDelete, onDuplicate, onBulkAvailability, bulkLoading }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú ⋯ al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Hotfix #258: el menú ⋯ ejecuta exactamente las mismas acciones que antes
  const run = (fn: () => void) => { setMenuOpen(false); fn(); };

  return (
    <div ref={setNodeRef} style={style} className={`${CARD} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-center gap-3">
        {/* Manija para arrastrar y reordenar */}
        <button
          {...attributes}
          {...listeners}
          className="w-11 h-11 -ml-2 inline-flex items-center justify-center cursor-grab active:cursor-grabbing text-[#94A3B8] hover:text-[#475569] touch-none"
          title="Arrastrar para reordenar"
          aria-label={`Reordenar ${category.name}`}
        >
          <GripVertical className="w-5 h-5" />
        </button>
        {/* Color de la categoría (mismo que la grilla del punto de venta) */}
        <span className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-[#0F172A] truncate" title={category.name}>{category.name}</h3>
          <p className="text-sm text-[#64748B]">{category.productsCount} productos</p>
        </div>
      </div>

      {/* Acciones visibles: Editar y ⋯ */}
      <div className="flex items-center gap-2 mt-4">
        <button onClick={() => onEdit(category)} className={`${BTN_OUTLINE} flex-1`}>
          <PencilIcon className="w-4 h-4" />
          Editar
        </button>
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={BTN_ICON}
            title="Más acciones"
            aria-label={`Más acciones de ${category.name}`}
            aria-expanded={menuOpen}
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-12 z-30 w-56 bg-white border border-[#E2E8F0] rounded-xl shadow-lg py-1">
              <button className={MENU_ITEM} onClick={() => run(() => onDuplicate(category))}>
                <Copy className="w-4 h-4" /> Duplicar
              </button>
              {category.productsCount > 0 && (
                <>
                  <button className={MENU_ITEM} disabled={bulkLoading} onClick={() => run(() => { onBulkAvailability(category.id, true); })}>
                    <ToggleRight className="w-4 h-4" /> Habilitar todos
                  </button>
                  <button className={MENU_ITEM} disabled={bulkLoading} onClick={() => run(() => { onBulkAvailability(category.id, false); })}>
                    <ToggleLeft className="w-4 h-4" /> Deshabilitar todos
                  </button>
                </>
              )}
              <div className="my-1 border-t border-[#E2E8F0]" />
              <button
                className="w-full flex items-center gap-2 h-11 px-3 text-sm text-left text-[#B91C1C] hover:bg-red-50/60"
                onClick={() => run(() => onDelete(category.id))}
              >
                <TrashIcon className="w-4 h-4" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Componente principal ─────────────────────────────────────
export const CategoriesTab: React.FC<CategoriesTabProps> = ({
  categories,
  onAdd,
  onEdit,
  onDelete,
  onReorder,
  onDuplicate,
  onBulkAvailability,
}) => {
  const [ordered, setOrdered] = useState<Category[]>(categories);
  const [categoryBulkLoading, setCategoryBulkLoading] = useState<string | null>(null);

  const handleBulkAvailability = async (categoryId: string, available: boolean) => {
    setCategoryBulkLoading(categoryId);
    try {
      await onBulkAvailability(categoryId, available);
    } finally {
      setCategoryBulkLoading(null);
    }
  };

  // Sincronizar cuando cambia la prop (nueva carga)
  useEffect(() => { setOrdered(categories); }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setOrdered((prev) => {
      const oldIndex = prev.findIndex((c) => c.id === active.id);
      const newIndex = prev.findIndex((c) => c.id === over.id);
      const next = arrayMove(prev, oldIndex, newIndex);
      // Persistir orden en backend de forma optimista
      onReorder?.(next.map((c) => c.id));
      return next;
    });
  };

  // Paleta de 12 tonos del punto de venta, según la posición de la categoría
  const paletteBase = categories as unknown as ProductCategory[];

  return (
    <div className="p-6">
      {/* Encabezado — A4/A5 */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <h2 className={TITLE}>Categorías</h2>
          <p className={SUBTITLE}>Gestiona y reordena arrastrando las categorías de tus productos</p>
        </div>
        <button onClick={onAdd} className={BTN_PRIMARY}>
          <PlusIcon className="w-5 h-5" />
          Nueva categoría
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className={`${CARD} text-center py-12 border-dashed`}>
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-bold text-[#0F172A] mb-2">No hay categorías</h3>
          <p className="text-[#64748B] mb-4">Crea tu primera categoría para organizar tus productos</p>
          <button onClick={onAdd} className={BTN_PRIMARY}>
            <PlusIcon className="w-5 h-5" />
            Crear categoría
          </button>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ordered.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ordered.map((category) => (
                <SortableRow
                  key={category.id}
                  category={category}
                  color={colorForCategory(paletteBase, category.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onDuplicate={onDuplicate}
                  onBulkAvailability={handleBulkAvailability}
                  bulkLoading={categoryBulkLoading === category.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
};

export default CategoriesTab;
