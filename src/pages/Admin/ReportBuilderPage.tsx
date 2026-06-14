import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  BarChart2, Play, Download, Save, RefreshCw, Trash2, Check,
  X, ChevronUp, ChevronDown, Clock, BookOpen, Database, Filter,
} from 'lucide-react';
import { adminService } from '@/services/adminService';
import type {
  ReportModuleDef, ReportColumnDef, ReportTemplate, ReportExecution, ReportExecuteConfig,
} from '@/services/adminService';

// ── CSV Export ────────────────────────────────────────────────────────────────
function exportCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h];
      if (v == null) return '';
      const s = String(v);
      return s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── SaveTemplateModal ─────────────────────────────────────────────────────────
interface SaveModalProps {
  config:  Omit<ReportExecuteConfig, 'template_id' | 'template_name'>;
  onClose: () => void;
  onSaved: () => void;
}
function SaveTemplateModal({ config, onClose, onSaved }: SaveModalProps) {
  const [name, setName]       = useState('');
  const [desc, setDesc]       = useState('');
  const [pub,  setPub]        = useState(false);
  const [saving, setSaving]   = useState(false);
  const submit = async () => {
    if (!name.trim()) return toast.error('El nombre es requerido');
    setSaving(true);
    try {
      await adminService.createReportTemplate({ ...config, name, description: desc || null, is_public: pub });
      toast.success('Plantilla guardada'); onSaved();
    } catch (e: any) { toast.error(e.response?.data?.error ?? e.message); }
    finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 className="font-semibold text-white">Guardar como plantilla</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500"
              placeholder="Mi reporte personalizado" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Descripción</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={pub} onChange={e => setPub(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-gray-300">Plantilla pública (visible para otros admins)</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">Cancelar</button>
          <button onClick={submit} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm disabled:opacity-50">
            {saving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Data cell formatter ───────────────────────────────────────────────────────
function Cell({ value, type }: { value: unknown; type: string }) {
  if (value == null) return <span className="text-gray-600">—</span>;
  if (type === 'datetime') return <span className="text-gray-400 text-xs">{new Date(value as string).toLocaleString('es-CL')}</span>;
  if (type === 'boolean')  return value ? <Check size={12} className="text-green-400" /> : <X size={12} className="text-red-400" />;
  if (type === 'number')   return <span className="font-mono text-right">{Number(value).toLocaleString('es-CL', { maximumFractionDigits: 2 })}</span>;
  return <span>{String(value)}</span>;
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportBuilderPage() {
  const [tab,          setTab]          = useState<'builder' | 'templates' | 'history'>('builder');
  const [meta,         setMeta]         = useState<{ modules: ReportModuleDef[] } | null>(null);
  const [templates,    setTemplates]    = useState<ReportTemplate[]>([]);
  const [history,      setHistory]      = useState<ReportExecution[]>([]);

  // Builder state
  const [module,       setModule]       = useState('orders');
  const [selCols,      setSelCols]      = useState<string[]>([]);
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [sortBy,       setSortBy]       = useState('');
  const [sortDir,      setSortDir]      = useState<'ASC' | 'DESC'>('DESC');

  // Results
  const [rows,         setRows]         = useState<Record<string, unknown>[]>([]);
  const [running,      setRunning]      = useState(false);
  const [hasResult,    setHasResult]    = useState(false);
  const [duration,     setDuration]     = useState<number | null>(null);
  const [saveModal,    setSaveModal]    = useState(false);
  const [delTemplate,  setDelTemplate]  = useState<string | null>(null);

  const currentModule = meta?.modules.find(m => m.key === module);
  const colDefs: ReportColumnDef[] = currentModule?.columns ?? [];

  const loadMeta = useCallback(async () => {
    try { setMeta(await adminService.getReportMeta()); } catch { /**/ }
  }, []);
  const loadTemplates = useCallback(async () => {
    try { setTemplates(await adminService.listReportTemplates()); } catch { /**/ }
  }, []);
  const loadHistory = useCallback(async () => {
    try { setHistory(await adminService.getReportHistory()); } catch { /**/ }
  }, []);

  useEffect(() => { loadMeta(); }, [loadMeta]);
  useEffect(() => { if (tab === 'templates') loadTemplates(); }, [tab, loadTemplates]);
  useEffect(() => { if (tab === 'history')   loadHistory();   }, [tab, loadHistory]);

  // When module changes, reset columns
  useEffect(() => { setSelCols([]); setRows([]); setHasResult(false); }, [module]);

  const toggleCol = (key: string) =>
    setSelCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  const selectAll = () => setSelCols(colDefs.map(c => c.key));
  const clearAll  = () => setSelCols([]);

  const buildConfig = (): ReportExecuteConfig => ({
    module,
    columns:  selCols,
    filters:  { date_from: dateFrom || undefined, date_to: dateTo || undefined },
    sort_by:  sortBy || undefined,
    sort_dir: sortDir,
  });

  const run = async () => {
    setRunning(true);
    try {
      const res = await adminService.executeReport(buildConfig());
      setRows(res.rows); setDuration(res.duration_ms);
      setHasResult(true); setTab('builder');
      toast.success(`${res.row_count} filas en ${res.duration_ms}ms`);
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error ejecutando reporte');
    } finally { setRunning(false); }
  };

  const loadTemplate = (t: ReportTemplate) => {
    setModule(t.module);
    setTimeout(() => {
      setSelCols(t.columns);
      setSortBy(t.sort_by ?? '');
      setSortDir(t.sort_dir as 'ASC' | 'DESC');
      const f = t.filters as any;
      if (f?.date_from && f.date_from !== 'month_start') setDateFrom(f.date_from);
      if (f?.date_to)   setDateTo(f.date_to);
      setTab('builder');
      toast.success(`Plantilla "${t.name}" cargada`);
    }, 50);
  };

  const handleDeleteTemplate = async (id: string) => {
    if (delTemplate !== id) { setDelTemplate(id); return; }
    try {
      await adminService.deleteReportTemplate(id);
      toast.success('Plantilla eliminada');
      setDelTemplate(null); loadTemplates();
    } catch { toast.error('Error al eliminar'); setDelTemplate(null); }
  };

  // Which columns to show in results (fallback to all colDefs if none selected)
  const displayCols = selCols.length > 0
    ? colDefs.filter(c => selCols.includes(c.key))
    : colDefs;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="text-indigo-400" size={24} />
        <div>
          <h1 className="text-xl font-bold text-white">Report Builder</h1>
          <p className="text-sm text-gray-400">Constructor visual de reportes exportables</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 w-fit border border-gray-700">
        {([
          { key: 'builder',   label: 'Constructor', icon: Filter    },
          { key: 'templates', label: 'Plantillas',  icon: BookOpen  },
          { key: 'history',   label: 'Historial',   icon: Clock     },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium transition-all ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* ── Builder Tab ──────────────────────────────────────────────── */}
      {tab === 'builder' && (
        <div className="flex gap-5">
          {/* Left panel */}
          <aside className="w-64 shrink-0 space-y-4">
            {/* Module */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                <Database size={11} /> Fuente de datos
              </h3>
              <div className="space-y-1">
                {meta?.modules.map(m => (
                  <button key={m.key} onClick={() => setModule(m.key)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${module === m.key ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Columns */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Columnas</h3>
                <div className="flex gap-2">
                  <button onClick={selectAll} className="text-[10px] text-indigo-400 hover:text-indigo-300">Todo</button>
                  <button onClick={clearAll}  className="text-[10px] text-gray-500 hover:text-gray-300">Limpiar</button>
                </div>
              </div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {colDefs.map(c => (
                  <label key={c.key} className="flex items-center gap-2 cursor-pointer py-0.5">
                    <input type="checkbox" checked={selCols.includes(c.key)} onChange={() => toggleCol(c.key)}
                      className="w-3.5 h-3.5 rounded" />
                    <span className="text-xs text-gray-300">{c.label}</span>
                    <span className={`ml-auto text-[9px] px-1 rounded ${
                      c.type === 'number' ? 'bg-blue-900/50 text-blue-300' :
                      c.type === 'datetime' ? 'bg-purple-900/50 text-purple-300' :
                      c.type === 'boolean' ? 'bg-green-900/50 text-green-300' :
                      'bg-gray-700 text-gray-400'
                    }`}>{c.type}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Filters */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filtros</h3>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Desde</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 mb-1">Hasta</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500" />
              </div>
            </div>

            {/* Sort */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-4 space-y-3">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ordenamiento</h3>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-indigo-500">
                <option value="">Sin orden específico</option>
                {colDefs.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
              </select>
              <div className="flex gap-2">
                {(['DESC', 'ASC'] as const).map(d => (
                  <button key={d} onClick={() => setSortDir(d)}
                    className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-xs border transition-all ${sortDir === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-gray-600 text-gray-400'}`}>
                    {d === 'DESC' ? <><ChevronDown size={11} /> Desc</> : <><ChevronUp size={11} /> Asc</>}
                  </button>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <button onClick={run} disabled={running}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium disabled:opacity-50">
              {running ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />}
              {running ? 'Ejecutando…' : 'Ejecutar reporte'}
            </button>
          </aside>

          {/* Results */}
          <div className="flex-1 min-w-0">
            {!hasResult ? (
              <div className="flex flex-col items-center justify-center h-80 bg-gray-800 rounded-xl border border-gray-700 text-gray-500 gap-3">
                <BarChart2 size={40} className="text-gray-600" />
                <p className="text-sm">Selecciona una fuente y ejecuta el reporte</p>
              </div>
            ) : (
              <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Results header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700 gap-3 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-white">{rows.length} filas</span>
                    {duration !== null && <span className="text-xs text-gray-500">{duration}ms</span>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSaveModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs">
                      <Save size={12} /> Guardar plantilla
                    </button>
                    <button onClick={() => exportCSV(rows, `reporte-${module}-${Date.now()}.csv`)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-xs">
                      <Download size={12} /> Exportar CSV
                    </button>
                  </div>
                </div>
                {/* Table */}
                {rows.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Sin resultados</div>
                ) : (
                  <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-gray-850">
                        <tr className="border-b border-gray-700">
                          {displayCols.map(c => (
                            <th key={c.key} className="text-left px-3 py-2.5 text-gray-400 whitespace-nowrap bg-gray-800/90 font-medium">
                              {c.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, i) => (
                          <tr key={i} className={`border-b border-gray-800 ${i % 2 === 0 ? '' : 'bg-gray-800/30'} hover:bg-gray-700/30`}>
                            {displayCols.map(c => (
                              <td key={c.key} className="px-3 py-2 text-gray-300 whitespace-nowrap">
                                <Cell value={row[c.key]} type={c.type} />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Templates Tab ────────────────────────────────────────────── */}
      {tab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {templates.length === 0 ? (
            <div className="col-span-3 flex flex-col items-center justify-center h-48 text-gray-500 gap-2">
              <BookOpen size={32} className="text-gray-600" />
              <p className="text-sm">No hay plantillas guardadas</p>
            </div>
          ) : templates.map(t => (
            <div key={t.id} className="bg-gray-800 rounded-xl border border-gray-700 p-5 flex flex-col gap-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-white">{t.name}</p>
                  {t.is_public && <span className="text-[10px] text-green-400 border border-green-700 px-1.5 rounded-full">Pública</span>}
                </div>
                {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[10px] bg-indigo-900/40 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                  {meta?.modules.find(m => m.key === t.module)?.label ?? t.module}
                </span>
                <span className="text-[10px] text-gray-400">{t.columns.length} cols</span>
              </div>
              <p className="text-[10px] text-gray-500">
                {t.created_by && `Por ${t.created_by} · `}{new Date(t.created_at).toLocaleDateString('es-CL')}
              </p>
              <div className="flex gap-2 mt-auto">
                <button onClick={() => loadTemplate(t)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs">
                  <Play size={10} /> Cargar
                </button>
                <button onClick={() => handleDeleteTemplate(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all ${delTemplate === t.id ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-400'}`}>
                  {delTemplate === t.id ? <Check size={10} /> : <Trash2 size={10} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History Tab ──────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500 text-sm">Sin historial</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700 text-gray-400 text-xs">
                  <th className="text-left px-4 py-3">Reporte</th>
                  <th className="text-left px-4 py-3">Módulo</th>
                  <th className="text-left px-4 py-3">Filas</th>
                  <th className="text-left px-4 py-3">Duración</th>
                  <th className="text-left px-4 py-3">Ejecutado por</th>
                  <th className="text-left px-4 py-3">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {history.map(h => (
                  <tr key={h.id} className="border-b border-gray-800 hover:bg-gray-800/40">
                    <td className="px-4 py-2.5 text-white text-xs">{h.template_name}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs capitalize">{h.module}</td>
                    <td className="px-4 py-2.5 text-xs font-mono text-white">{h.row_count.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{h.duration_ms != null ? `${h.duration_ms}ms` : '—'}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{h.executed_by ?? '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs">{new Date(h.executed_at).toLocaleString('es-CL')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Save modal */}
      {saveModal && (
        <SaveTemplateModal
          config={buildConfig()}
          onClose={() => setSaveModal(false)}
          onSaved={() => { setSaveModal(false); loadTemplates(); }}
        />
      )}
    </div>
  );
}
