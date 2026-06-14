// ── pages/Admin/TicketTemplatesPage.tsx ──────────────────────────────────────
// Editor visual de plantillas de ticket con vista previa en tiempo real.

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminService, type TicketTemplate, type Branch } from '../../services/adminService';
import { TicketPreview } from '../../components/print/TicketPreview';
import type { TicketType, TicketWidth } from '../../components/print/TicketPreview';
import toast from 'react-hot-toast';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_TEMPLATE: Partial<TicketTemplate> = {
  name:                   'Nueva Plantilla',
  type:                   'kitchen_ticket',
  is_default:             false,
  header_show_address:    true,
  header_show_phone:      true,
  header_show_rut:        true,
  show_order_number:      true,
  show_table_name:        true,
  show_waiter_name:       false,
  show_datetime:          true,
  show_item_price:        false,
  show_modifiers:         true,
  show_notes:             true,
  item_name_uppercase:    true,
  font_size:              'normal',
  footer_message:         '¡Gracias por su visita!',
  footer_show_powered_by: true,
  print_qr:               false,
  qr_type:                'receipt',
  qr_size:                5,
  separator_style:        'dashes',
};

interface SwitchProps {
  label:   string;
  checked: boolean;
  onChange: (v: boolean) => void;
}
function Switch({ label, checked, onChange }: SwitchProps) {
  return (
    <label className="flex items-center justify-between py-1 cursor-pointer select-none">
      <span className="text-sm text-gray-700">{label}</span>
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-blue-500' : 'bg-gray-300'}`}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </div>
    </label>
  );
}

interface SectionProps { title: string; children: React.ReactNode }
function Section({ title, children }: SectionProps) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TicketTemplatesPage() {
  const qc = useQueryClient();
  const [selected, setSelected]       = useState<TicketTemplate | null>(null);
  const [draft, setDraft]             = useState<Partial<TicketTemplate>>(DEFAULT_TEMPLATE);
  const [paperWidth, setPaperWidth]   = useState<TicketWidth>(80);
  const [filterBranch, setFilterBranch] = useState<string>('');
  const [isNew, setIsNew]             = useState(false);

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['ticket-templates', filterBranch],
    queryFn:  () => adminService.listTicketTemplates(filterBranch || undefined),
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['branches-list'],
    queryFn:  () => adminService.listBranches(),
  });

  const saveMut = useMutation({
    mutationFn: async (data: Partial<TicketTemplate>) => {
      if (isNew) return adminService.createTicketTemplate(data);
      return adminService.updateTicketTemplate(selected!.id, data);
    },
    onSuccess: (saved) => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      setSelected(saved);
      setIsNew(false);
      toast.success('Plantilla guardada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error al guardar'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteTicketTemplate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      setSelected(null);
      setIsNew(false);
      setDraft(DEFAULT_TEMPLATE);
      toast.success('Plantilla eliminada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error al eliminar'),
  });

  const dupMut = useMutation({
    mutationFn: (id: string) => adminService.duplicateTicketTemplate(id),
    onSuccess: (dup) => {
      qc.invalidateQueries({ queryKey: ['ticket-templates'] });
      setSelected(dup);
      setDraft(dup);
      setIsNew(false);
      toast.success('Plantilla duplicada');
    },
    onError: (e: any) => toast.error(e.message ?? 'Error al duplicar'),
  });

  // Sync draft when selection changes
  useEffect(() => {
    if (selected) setDraft(selected);
  }, [selected]);

  function selectTemplate(t: TicketTemplate) {
    setSelected(t);
    setDraft(t);
    setIsNew(false);
  }

  function startNew() {
    setSelected(null);
    setDraft({ ...DEFAULT_TEMPLATE });
    setIsNew(true);
  }

  function set<K extends keyof TicketTemplate>(key: K, value: TicketTemplate[K]) {
    setDraft(d => ({ ...d, [key]: value }));
  }

  const typeLabels: Record<string, string> = {
    kitchen_ticket: '🍳 Cocina',
    receipt:        '🧾 Recibo',
    label:          '🏷️ Etiqueta',
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ── Toolbar ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b shadow-sm">
        <h1 className="text-lg font-bold text-gray-800 mr-auto">Plantillas de Ticket</h1>
        <select
          value={filterBranch}
          onChange={e => setFilterBranch(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="">Todas las sucursales</option>
          {(branches as Branch[]).map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>
        <button
          onClick={startNew}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
        >
          + Nueva Plantilla
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Lista de plantillas ── */}
        <div className="w-56 bg-white border-r overflow-y-auto shrink-0">
          {isLoading ? (
            <div className="p-4 text-sm text-gray-400">Cargando...</div>
          ) : templates.length === 0 ? (
            <div className="p-4 text-sm text-gray-400">Sin plantillas</div>
          ) : (
            <ul className="divide-y">
              {templates.map(t => (
                <li
                  key={t.id}
                  onClick={() => selectTemplate(t)}
                  className={`px-3 py-2.5 cursor-pointer hover:bg-blue-50 ${
                    selected?.id === t.id ? 'bg-blue-100 border-l-4 border-blue-500' : ''
                  }`}
                >
                  <div className="text-sm font-medium text-gray-800 truncate">{t.name}</div>
                  <div className="text-xs text-gray-500">{typeLabels[t.type] ?? t.type}</div>
                  {t.is_default && (
                    <span className="text-xs bg-green-100 text-green-700 px-1 rounded">Por defecto</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Editor ── */}
        {(selected || isNew) ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Panel de configuración */}
            <div className="w-72 bg-white border-r overflow-y-auto p-4 shrink-0">
              {/* Acciones */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => saveMut.mutate(draft)}
                  disabled={saveMut.isPending}
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {saveMut.isPending ? 'Guardando...' : 'Guardar'}
                </button>
                {selected && (
                  <>
                    <button
                      onClick={() => dupMut.mutate(selected.id)}
                      disabled={dupMut.isPending}
                      className="px-3 py-1.5 border text-sm rounded hover:bg-gray-50"
                    >
                      Duplicar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta plantilla?')) deleteMut.mutate(selected.id);
                      }}
                      className="px-3 py-1.5 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50"
                    >
                      Eliminar
                    </button>
                  </>
                )}
              </div>

              {/* General */}
              <Section title="General">
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Nombre</label>
                  <input
                    value={draft.name ?? ''}
                    onChange={e => set('name', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Tipo</label>
                  <select
                    value={draft.type ?? 'kitchen_ticket'}
                    onChange={e => set('type', e.target.value as TicketTemplate['type'])}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="kitchen_ticket">Cocina</option>
                    <option value="receipt">Recibo</option>
                    <option value="label">Etiqueta</option>
                  </select>
                </div>
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Sucursal</label>
                  <select
                    value={draft.branch_id ?? ''}
                    onChange={e => set('branch_id', e.target.value || null)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="">Global (todas las sucursales)</option>
                    {(branches as Branch[]).map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <Switch
                  label="Marcar como predeterminada"
                  checked={draft.is_default ?? false}
                  onChange={v => set('is_default', v)}
                />
                <div className="mt-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Tamaño de fuente</label>
                  <select
                    value={draft.font_size ?? 'normal'}
                    onChange={e => set('font_size', e.target.value as TicketTemplate['font_size'])}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="small">Pequeño</option>
                    <option value="normal">Normal</option>
                    <option value="large">Grande</option>
                  </select>
                </div>
                <div className="mt-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Estilo de separador</label>
                  <select
                    value={draft.separator_style ?? 'dashes'}
                    onChange={e => set('separator_style', e.target.value as TicketTemplate['separator_style'])}
                    className="w-full border rounded px-2 py-1 text-sm"
                  >
                    <option value="dashes">Guiones (---)</option>
                    <option value="stars">Asteriscos (***)</option>
                    <option value="equals">Iguales (===)</option>
                    <option value="scissors">Tijeras (- - -)</option>
                  </select>
                </div>
              </Section>

              {/* Encabezado */}
              <Section title="Encabezado">
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Texto logo / nombre</label>
                  <input
                    value={draft.header_logo_text ?? ''}
                    onChange={e => set('header_logo_text', e.target.value || null)}
                    placeholder="Nombre del negocio"
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <Switch label="Mostrar dirección"  checked={draft.header_show_address ?? true}  onChange={v => set('header_show_address', v)} />
                <Switch label="Mostrar teléfono"   checked={draft.header_show_phone ?? true}    onChange={v => set('header_show_phone', v)} />
                <Switch label="Mostrar RUT"         checked={draft.header_show_rut ?? true}      onChange={v => set('header_show_rut', v)} />
                <div className="mt-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Línea extra 1</label>
                  <input
                    value={draft.header_custom_line_1 ?? ''}
                    onChange={e => set('header_custom_line_1', e.target.value || null)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="mt-1">
                  <label className="text-xs text-gray-500 block mb-0.5">Línea extra 2</label>
                  <input
                    value={draft.header_custom_line_2 ?? ''}
                    onChange={e => set('header_custom_line_2', e.target.value || null)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
              </Section>

              {/* Cuerpo */}
              <Section title="Cuerpo">
                <Switch label="Número de orden"    checked={draft.show_order_number ?? true}   onChange={v => set('show_order_number', v)} />
                <Switch label="Mesa / destino"     checked={draft.show_table_name ?? true}     onChange={v => set('show_table_name', v)} />
                <Switch label="Nombre del mozo"    checked={draft.show_waiter_name ?? false}   onChange={v => set('show_waiter_name', v)} />
                <Switch label="Fecha y hora"       checked={draft.show_datetime ?? true}       onChange={v => set('show_datetime', v)} />
                <Switch label="Precio por ítem"    checked={draft.show_item_price ?? false}    onChange={v => set('show_item_price', v)} />
                <Switch label="Modificadores"      checked={draft.show_modifiers ?? true}      onChange={v => set('show_modifiers', v)} />
                <Switch label="Notas del ítem"     checked={draft.show_notes ?? true}          onChange={v => set('show_notes', v)} />
                <Switch label="Nombres en mayúscula" checked={draft.item_name_uppercase ?? true} onChange={v => set('item_name_uppercase', v)} />
              </Section>

              {/* Pie de página */}
              <Section title="Pie de página">
                <div className="mb-2">
                  <label className="text-xs text-gray-500 block mb-0.5">Mensaje de despedida</label>
                  <input
                    value={draft.footer_message ?? ''}
                    onChange={e => set('footer_message', e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div className="mb-1">
                  <label className="text-xs text-gray-500 block mb-0.5">Línea personalizada</label>
                  <input
                    value={draft.footer_custom_line ?? ''}
                    onChange={e => set('footer_custom_line', e.target.value || null)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <Switch label="Mostrar 'Powered by BullWeb'" checked={draft.footer_show_powered_by ?? true} onChange={v => set('footer_show_powered_by', v)} />
              </Section>

              {/* QR */}
              <Section title="Código QR">
                <Switch label="Imprimir QR"    checked={draft.print_qr ?? false}  onChange={v => set('print_qr', v)} />
                {draft.print_qr && (
                  <>
                    <div className="mt-2">
                      <label className="text-xs text-gray-500 block mb-0.5">Tipo de QR</label>
                      <select
                        value={draft.qr_type ?? 'receipt'}
                        onChange={e => set('qr_type', e.target.value as TicketTemplate['qr_type'])}
                        className="w-full border rounded px-2 py-1 text-sm"
                      >
                        <option value="receipt">Recibo digital (URL auto)</option>
                        <option value="custom">URL personalizada</option>
                      </select>
                    </div>
                    {draft.qr_type === 'custom' && (
                      <div className="mt-1">
                        <label className="text-xs text-gray-500 block mb-0.5">URL del QR</label>
                        <input
                          value={draft.qr_custom_url ?? ''}
                          onChange={e => set('qr_custom_url', e.target.value || null)}
                          placeholder="https://..."
                          className="w-full border rounded px-2 py-1 text-sm"
                        />
                      </div>
                    )}
                    <div className="mt-1">
                      <label className="text-xs text-gray-500 block mb-0.5">
                        Tamaño QR: {draft.qr_size ?? 5}
                      </label>
                      <input
                        type="range" min={1} max={10}
                        value={draft.qr_size ?? 5}
                        onChange={e => set('qr_size', Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                  </>
                )}
              </Section>
            </div>

            {/* Panel de vista previa */}
            <div className="flex-1 bg-gray-100 overflow-auto p-6 flex flex-col items-center gap-4">
              {/* Toggle de ancho */}
              <div className="flex items-center gap-2 bg-white rounded-full px-3 py-1 shadow-sm border self-start">
                <span className="text-xs text-gray-500">Papel:</span>
                {([58, 80] as TicketWidth[]).map(w => (
                  <button
                    key={w}
                    onClick={() => setPaperWidth(w)}
                    className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                      paperWidth === w ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {w}mm
                  </button>
                ))}
              </div>

              <TicketPreview
                type={(draft.type === 'kitchen_ticket' ? 'kitchen_ticket' : 'receipt') as TicketType}
                paperWidth={paperWidth}
                template={draft}
                demoMode
              />

              <p className="text-xs text-gray-400 text-center max-w-xs">
                Vista previa con datos de ejemplo. Guarda la plantilla para aplicarla a los tickets reales.
              </p>
            </div>
          </div>
        ) : (
          /* Estado vacío */
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="text-5xl">🧾</div>
            <p className="text-sm">Selecciona una plantilla o crea una nueva</p>
            <button
              onClick={startNew}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
            >
              + Nueva Plantilla
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
