import React, { useState, useEffect } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, GripVertical, Copy, ToggleLeft, ToggleRight } from 'lucide-react';
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
  onEdit: (c: Category) => void;
  onDelete: (id: string) => void;
  onDuplicate: (c: Category) => void;
  onBulkAvailability: (categoryId: string, available: boolean) => Promise<void>;
  bulkLoading: boolean;
}

const SortableRow: React.FC<SortableRowProps> = ({ category, onEdit, onDelete, onDuplicate, onBulkAvailability, bulkLoading }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: category.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Handle de arrastre */}
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            title="Arrastrar para reordenar"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="text-3xl">{category.icon || '📂'}</div>
          <div>
            <h3 className="font-semibold text-gray-900">{category.name}</h3>
            <p className="text-sm text-gray-600">{category.productsCount} productos</p>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={() => onEdit(category)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          Editar
        </button>
        <button
          onClick={() => onDuplicate(category)}
          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors"
        >
          <Copy className="w-4 h-4" />
          Duplicar
        </button>
        <button
          onClick={() => onDelete(category.id)}
          className="flex items-center justify-center gap-1 px-2 py-1.5 text-sm text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
          title="Eliminar categoría"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Disponibilidad masiva */}
      {category.productsCount > 0 && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => onBulkAvailability(category.id, true)}
            disabled={bulkLoading}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-green-700 bg-green-50 rounded hover:bg-green-100 transition-colors disabled:opacity-50"
          >
            <ToggleRight className="w-3.5 h-3.5" />
            Habilitar todos
          </button>
          <button
            onClick={() => onBulkAvailability(category.id, false)}
            disabled={bulkLoading}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-orange-700 bg-orange-50 rounded hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            <ToggleLeft className="w-3.5 h-3.5" />
            Deshabilitar todos
          </button>
        </div>
      )}
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

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Categorías</h2>
          <p className="text-gray-600 mt-1">
            Gestiona y reordena arrastrando las categorías de tus productos
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Nueva Categoría
        </button>
      </div>

      {/* Lista de categorías */}
      {ordered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <div className="text-6xl mb-4">📁</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No hay categorías</h3>
          <p className="text-gray-600 mb-4">
            Crea tu primera categoría para organizar tus productos
          </p>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Crear Categoría
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

