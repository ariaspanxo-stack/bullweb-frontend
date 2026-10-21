// HOTFIX 268: Importar carta desde foto, PDF o Excel (solo SuperAdmin).
// 1) subir archivo -> 2) tabla editable (categoria, nombre, precio, descripcion, estacion, incluir) -> 3) Crear todo -> resumen.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileUp, Loader2, X, Trash2 } from 'lucide-react';
import { useToast } from '../Toast';
import { adminService, type MenuImportCommitResult, type Tenant } from '../../services/adminService';
import { useAuthStore } from '../../store/authStore';
import { formatCurrency } from '../../lib/utils';
import { BTN_OUTLINE, BTN_PRIMARY } from './productsUi';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

interface EditRow {
  key: number;
  incluir: boolean;
  categoria: string;
  nombre: string;
  precio: string;
  descripcion: string;
  stationId: string;
  avisos?: string[];
}

const MAX_MB = 10;
const ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,application/pdf,.xlsx';
const INPUT = 'w-full min-h-[44px] px-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent';

export const ImportMenuModal: React.FC<Props> = ({ isOpen, onClose, onImported }) => {
  const toast = useToast();
  const user = useAuthStore(s => s.user) as any;
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantId, setTenantId] = useState<string>('');
  const [stations, setStations] = useState<{ id: string; name: string }[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [rows, setRows] = useState<EditRow[]>([]);
  const [fuente, setFuente] = useState<string>('');
  const [costo, setCosto] = useState<number | null>(null);
  const [busy, setBusy] = useState<'parse' | 'commit' | null>(null);
  const [result, setResult] = useState<MenuImportCommitResult | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    adminService.listTenants().then(list => {
      setTenants(list);
      setTenantId(prev => prev || user?.tenantId || list[0]?.id || '');
    }).catch(() => toast.error('No se pudo cargar la lista de restaurantes'));
  }, [isOpen]);

  useEffect(() => {
    if (!tenantId) { setStations([]); return; }
    adminService.menuImportStations(tenantId).then(setStations).catch(() => setStations([]));
  }, [tenantId]);

  const reset = () => { setFiles([]); setRows([]); setFuente(''); setCosto(null); setResult(null); };
  const close = () => { if (busy) return; reset(); onClose(); };

  const pickFiles = (list: FileList | null) => {
    const arr = Array.from(list ?? []);
    const big = arr.find(f => f.size > MAX_MB * 1024 * 1024);
    if (big) { toast.error(`${big.name} pesa mas de ${MAX_MB} MB`); return; }
    setFiles(arr.slice(0, 10));
  };

  const parse = async () => {
    if (!files.length) return;
    setBusy('parse'); setResult(null);
    try {
      const r = await adminService.menuImportParse(files);
      setFuente(r.fuente);
      setCosto(r.costo?.costUsd ?? null);
      setRows(r.filas.map((f, i) => ({
        key: i, incluir: !(f.avisos?.length), categoria: f.categoria, nombre: f.nombre,
        precio: String(f.precio || ''), descripcion: f.descripcion ?? '', stationId: '', avisos: f.avisos,
      })));
      if (!r.filas.length) toast.error('No se encontraron productos en el archivo');
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo leer el archivo');
    } finally {
      setBusy(null);
    }
  };

  const update = (key: number, patch: Partial<EditRow>) => setRows(prev => prev.map(r => (r.key === key ? { ...r, ...patch } : r)));
  const incluidas = useMemo(() => rows.filter(r => r.incluir), [rows]);
  const invalidas = incluidas.filter(r => !r.nombre.trim() || !(parseInt(r.precio.replace(/[^0-9]/g, ''), 10) > 0));

  const commit = async () => {
    if (!tenantId || !incluidas.length || invalidas.length) return;
    setBusy('commit');
    try {
      const items = incluidas.map(r => ({
        categoria: r.categoria.trim() || 'Sin categoria',
        nombre: r.nombre.trim(),
        precio: parseInt(r.precio.replace(/[^0-9]/g, ''), 10),
        descripcion: r.descripcion.trim() || undefined,
        stationId: r.stationId || null,
      }));
      const res = await adminService.menuImportCommit(tenantId, items);
      setResult(res);
      toast.success(`${res.productosCreados} creados, ${res.productosActualizados} actualizados`);
      if (tenantId === user?.tenantId) onImported?.();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo importar');
    } finally {
      setBusy(null);
    }
  };

  if (!isOpen) return null;
  const tenantName = tenants.find(t => t.id === tenantId)?.name ?? '';

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label="Importar carta">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Importar carta</h2>
            <p className="text-sm text-[#64748B]">Foto o PDF (lectura con IA) o Excel con columnas Categoría | Producto | Precio | Descripción</p>
          </div>
          <button onClick={close} className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Cerrar"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {/* Restaurante destino y archivo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700 mb-1">Restaurante</span>
              <select value={tenantId} onChange={e => setTenantId(e.target.value)} className={INPUT} disabled={!!busy}>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>)}
              </select>
            </label>
            <div>
              <span className="block text-sm font-medium text-gray-700 mb-1">Archivo (hasta 10 fotos, 1 PDF de 10 páginas o 1 Excel; 10 MB c/u)</span>
              <div className="flex items-center gap-2">
                <label className={`${BTN_OUTLINE} cursor-pointer`}>
                  <FileUp className="w-5 h-5" /> Elegir archivo
                  <input type="file" className="hidden" accept={ACCEPT} multiple onChange={e => pickFiles(e.target.files)} disabled={!!busy} />
                </label>
                <button onClick={parse} className={BTN_PRIMARY} disabled={!files.length || !!busy}>
                  {busy === 'parse' ? <Loader2 className="w-5 h-5 animate-spin" /> : null} Leer carta
                </button>
              </div>
              {files.length > 0 && <p className="text-xs text-gray-500 mt-1">{files.map(f => f.name).join(', ')}</p>}
            </div>
          </div>

          {/* Resumen final */}
          {result && (
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 text-sm">
              <p className="font-bold text-[#0F172A] mb-1">Importación lista en {tenantName}</p>
              <p>Categorías creadas: <b>{result.categoriasCreadas}</b> · Productos creados: <b>{result.productosCreados}</b> · Actualizados: <b>{result.productosActualizados}</b></p>
              {result.conflictos.length > 0 && <p className="mt-1">No importados (ya existen en otra categoría): {result.conflictos.map(c => c.nombre).join(', ')}</p>}
              {result.errores.length > 0 && <p className="mt-1 text-[#B91C1C]">Con error: {result.errores.map(e => `${e.nombre} (${e.error})`).join('; ')}</p>}
            </div>
          )}

          {/* Tabla editable */}
          {rows.length > 0 && (
            <>
              <p className="text-sm text-[#475569]">
                {rows.length} filas leídas ({fuente}){costo !== null ? ` · costo estimado US$ ${costo.toFixed(4)}` : ''} · {incluidas.length} incluidas
                {invalidas.length > 0 && <span className="text-[#B91C1C]"> · {invalidas.length} incluidas sin nombre o precio</span>}
              </p>
              <div className="overflow-x-auto border border-gray-200 rounded-xl">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-[#475569]">
                    <tr>
                      <th className="px-2 py-2 w-16">Incluir</th>
                      <th className="px-2 py-2">Categoría</th>
                      <th className="px-2 py-2">Nombre</th>
                      <th className="px-2 py-2 w-32">Precio</th>
                      <th className="px-2 py-2">Descripción</th>
                      <th className="px-2 py-2 w-44">Estación</th>
                      <th className="px-2 py-2 w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.key} className={`border-t border-gray-100 ${r.incluir ? '' : 'opacity-50'}`}>
                        <td className="px-2 py-1">
                          <input type="checkbox" className="w-6 h-6 accent-[#1E2A4A]" checked={r.incluir} onChange={e => update(r.key, { incluir: e.target.checked })} aria-label={`Incluir ${r.nombre}`} />
                        </td>
                        <td className="px-2 py-1"><input className={INPUT} value={r.categoria} onChange={e => update(r.key, { categoria: e.target.value })} /></td>
                        <td className="px-2 py-1">
                          <input className={INPUT} value={r.nombre} onChange={e => update(r.key, { nombre: e.target.value })} />
                          {r.avisos?.length ? <span className="text-xs text-[#B91C1C]">{r.avisos.join(', ')}</span> : null}
                        </td>
                        <td className="px-2 py-1">
                          <input className={`${INPUT} font-bold`} inputMode="numeric" value={r.precio} onChange={e => update(r.key, { precio: e.target.value.replace(/[^0-9]/g, '') })} />
                          {r.precio && <span className="text-xs font-bold text-gray-500">{formatCurrency(parseInt(r.precio, 10) || 0)}</span>}
                        </td>
                        <td className="px-2 py-1"><input className={INPUT} value={r.descripcion} onChange={e => update(r.key, { descripcion: e.target.value })} /></td>
                        <td className="px-2 py-1">
                          <select className={INPUT} value={r.stationId} onChange={e => update(r.key, { stationId: e.target.value })}>
                            <option value="">Sin estación</option>
                            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <button onClick={() => setRows(prev => prev.filter(x => x.key !== r.key))} className="w-11 h-11 inline-flex items-center justify-center rounded-lg hover:bg-red-50 text-[#B91C1C]" aria-label={`Quitar ${r.nombre}`}><Trash2 className="w-4 h-4" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={close} className={BTN_OUTLINE} disabled={!!busy}>Cerrar</button>
          <button onClick={commit} className={BTN_PRIMARY} disabled={!rows.length || !incluidas.length || invalidas.length > 0 || !tenantId || !!busy}>
            {busy === 'commit' ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Crear todo ({incluidas.length})
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ImportMenuModal;
