// ── components/print/PrinterRoutingManager.tsx ────────────────────────────────
// Gestión de reglas de enrutamiento de impresión por categoría/producto.

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  GitBranch, Plus, Pencil, Trash2, Check, X, RefreshCw,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { PrinterRoutingRule, Printer, Branch } from '@/services/adminService';

interface Props {
  branchId:  string;
  printers:  Printer[];
  branches:  Branch[];
}

// ── Categorías (las cargamos del endpoint autenticado de admin) ───────────────
interface MenuCategory {
  id:   string;
  name: string;
}

async function loadCategories(): Promise<MenuCategory[]> {
  const token = localStorage.getItem('bullweb_token') ?? '';
  const resp = await fetch('/api/menu/categories', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!resp.ok) return [];
  const json = await resp.json();
  return (json.data ?? json ?? []).map((c: any) => ({ id: c.id, name: c.name }));
}

// ── Sub-componente: fila de regla ─────────────────────────────────────────────
function RuleRow({
  rule,
  categories,
  onEdit,
  onDelete,
  deleting,
}: {
  rule:       PrinterRoutingRule;
  categories: MenuCategory[];
  onEdit:     (rule: PrinterRoutingRule) => void;
  onDelete:   (id: string) => void;
  deleting:   boolean;
}) {
  const catNames = (rule.category_ids ?? [])
    .map(id => categories.find(c => c.id === id)?.name ?? id.slice(0, 8))
    .join(', ');

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${
      rule.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          {rule.label && (
            <span className="text-sm font-medium text-gray-800">{rule.label}</span>
          )}
          {catNames && (
            <span className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full truncate max-w-[200px]">
              📦 {catNames}
            </span>
          )}
          {(rule.order_types ?? []).length > 0 && (
            <span className="text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded-full">
              🛒 {rule.order_types!.join(', ')}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-gray-500">→</span>
          <span className="text-xs font-medium text-gray-700">{rule.printer_name}</span>
          {rule.copies > 1 && (
            <span className="text-xs text-gray-500">×{rule.copies}</span>
          )}
          <span className="text-xs text-gray-400">prioridad {rule.priority}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onEdit(rule)}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          title="Editar"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          disabled={deleting}
          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 disabled:opacity-40"
          title="Eliminar"
        >
          {deleting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ── Sub-componente: modal agregar/editar regla ────────────────────────────────
function RuleModal({
  rule,
  branchId,
  printers,
  categories,
  onClose,
  onSave,
  saving,
}: {
  rule?:       PrinterRoutingRule | null;
  branchId:    string;
  printers:    Printer[];
  categories:  MenuCategory[];
  onClose:     () => void;
  onSave:      (dto: any) => void;
  saving:      boolean;
}) {
  const [form, setForm] = useState({
    printer_id:   rule?.printer_id   ?? '',
    category_ids: rule?.category_ids ?? ([] as string[]),
    order_types:  rule?.order_types  ?? ([] as string[]),
    priority:     rule?.priority     ?? 0,
    copies:       rule?.copies       ?? 1,
    label:        rule?.label        ?? '',
    is_active:    rule?.is_active    ?? true,
  });

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const toggleCategory = (id: string) => {
    const arr = form.category_ids;
    set('category_ids', arr.includes(id) ? arr.filter(c => c !== id) : [...arr, id]);
  };

  const toggleOrderType = (t: string) => {
    const arr = form.order_types;
    set('order_types', arr.includes(t) ? arr.filter(x => x !== t) : [...arr, t]);
  };

  const handleSave = () => {
    if (!form.printer_id) { toast.error('Selecciona una impresora'); return; }
    if (!form.category_ids.length && !form.order_types.length) {
      toast.error('Selecciona al menos una categoría o tipo de orden');
      return;
    }
    onSave({
      branch_id:    branchId,
      printer_id:   form.printer_id,
      category_ids: form.category_ids.length ? form.category_ids : undefined,
      order_types:  form.order_types.length  ? form.order_types  : undefined,
      priority:     form.priority,
      copies:       form.copies,
      label:        form.label || undefined,
      is_active:    form.is_active,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-gray-900">
            {rule ? 'Editar regla' : 'Nueva regla de enrutamiento'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Etiqueta */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Etiqueta descriptiva
            </label>
            <input
              value={form.label}
              onChange={e => set('label', e.target.value)}
              placeholder="Ej: Bebidas → BAR"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {/* Impresora destino */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Impresora destino *
            </label>
            <select
              value={form.printer_id}
              onChange={e => set('printer_id', e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar impresora...</option>
              {printers.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.type}) {p.agent_id ? '' : '⚠ sin agente'}
                </option>
              ))}
            </select>
          </div>

          {/* Categorías */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categorías del menú
            </label>
            {categories.length === 0 ? (
              <p className="text-xs text-gray-400">No se pudieron cargar las categorías</p>
            ) : (
              <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
                {categories.map(cat => (
                  <label key={cat.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.category_ids.includes(cat.id)}
                      onChange={() => toggleCategory(cat.id)}
                      className="w-3.5 h-3.5 text-indigo-600 rounded"
                    />
                    <span className="text-sm text-gray-700 truncate">{cat.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Tipo de orden */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de orden
            </label>
            <div className="flex gap-2 flex-wrap">
              {['DINE_IN', 'DELIVERY', 'TAKEAWAY'].map(ot => (
                <label key={ot} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.order_types.includes(ot)}
                    onChange={() => toggleOrderType(ot)}
                    className="w-3.5 h-3.5 text-indigo-600 rounded"
                  />
                  <span className="text-sm text-gray-700">{ot}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Configuración */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prioridad</label>
              <input
                type="number"
                min={0}
                value={form.priority}
                onChange={e => set('priority', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Copias</label>
              <input
                type="number"
                min={1}
                max={5}
                value={form.copies}
                onChange={e => set('copies', Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Activa</label>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => set('is_active', e.target.checked)}
                className="mt-2 w-4 h-4 text-indigo-600 rounded"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 p-5 border-t border-gray-100 sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export function PrinterRoutingManager({ branchId, printers }: Props) {
  const qc = useQueryClient();
  const [expanded, setExpanded]   = useState(false);
  const [editRule, setEditRule]   = useState<PrinterRoutingRule | null | undefined>(undefined);

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['admin', 'routing-rules', branchId],
    queryFn:  () => adminService.listRoutingRules(branchId),
    enabled:  expanded,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['public', 'categories'],
    queryFn:  loadCategories,
    staleTime: 5 * 60_000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin', 'routing-rules', branchId] });

  const createMut = useMutation({
    mutationFn: adminService.createRoutingRule,
    onSuccess: () => { invalidate(); setEditRule(undefined); toast.success('Regla creada'); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: any }) => adminService.updateRoutingRule(id, dto),
    onSuccess: () => { invalidate(); setEditRule(undefined); toast.success('Regla actualizada'); },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al actualizar'),
  });

  const deleteMut = useMutation({
    mutationFn: adminService.deleteRoutingRule,
    onSuccess: invalidate,
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al eliminar'),
  });

  const handleSave = (dto: any) => {
    if (editRule?.id) {
      updateMut.mutate({ id: editRule.id, dto });
    } else {
      createMut.mutate(dto);
    }
  };

  return (
    <>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-gray-800">Enrutamiento por categoría</span>
            {rules.length > 0 && (
              <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">
                {rules.length} {rules.length === 1 ? 'regla' : 'reglas'}
              </span>
            )}
          </div>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {expanded && (
          <div className="p-4 space-y-3">
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-blue-400" />
              Define qué impresora recibe cada ítem según su categoría. Si un ítem no matchea ninguna regla, va a las impresoras del tipo correspondiente (cocina o caja).
            </p>

            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cargando...
              </div>
            ) : rules.length === 0 ? (
              <p className="text-sm text-gray-400 italic text-center py-2">
                Sin reglas — todos los ítems van a las impresoras del tipo configurado
              </p>
            ) : (
              <div className="space-y-2">
                {rules.map(rule => (
                  <RuleRow
                    key={rule.id}
                    rule={rule}
                    categories={categories}
                    onEdit={r => setEditRule(r)}
                    onDelete={id => deleteMut.mutate(id)}
                    deleting={deleteMut.isPending && deleteMut.variables === rule.id}
                  />
                ))}
              </div>
            )}

            <button
              onClick={() => setEditRule(null)}
              className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800"
            >
              <Plus className="w-4 h-4" /> Agregar regla
            </button>
          </div>
        )}
      </div>

      {/* Modal */}
      {editRule !== undefined && (
        <RuleModal
          rule={editRule}
          branchId={branchId}
          printers={printers}
          categories={categories}
          onClose={() => setEditRule(undefined)}
          onSave={handleSave}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}
    </>
  );
}
