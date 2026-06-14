import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import toast from 'react-hot-toast';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCLP(n: number) {
  return '$' + (n ?? 0).toLocaleString('es-CL');
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function todayYM() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; cls: string; Icon: React.ElementType }> = {
  ISSUED:    { label: 'Emitida',   cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
  PENDING:   { label: 'Pendiente', cls: 'bg-yellow-100 text-yellow-700',   Icon: Clock       },
  ERROR:     { label: 'Error',     cls: 'bg-red-100 text-red-700',         Icon: XCircle     },
  CANCELLED: { label: 'Anulada',  cls: 'bg-gray-100 text-gray-500',       Icon: Ban         },
};

// ─── Interfaces ────────────────────────────────────────────────────────────────

interface CancelModal {
  docId:       string;
  folioNumber: number | null;
  motivo:      string;
  saving:      boolean;
}

const PER_PAGE = 20;

// ─── Componente ────────────────────────────────────────────────────────────────

export function DteDocumentsPage() {
  // Filtros
  const [monthInput,   setMonthInput]   = useState(todayYM()); // "YYYY-MM"
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterTipo,   setFilterTipo]   = useState('todos');
  const [page,         setPage]         = useState(1);

  // Datos
  const [docs,        setDocs]        = useState<any[]>([]);
  const [summary,     setSummary]     = useState<any>(null);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);
  const [configured,  setConfigured]  = useState<boolean | null>(null); // tiene config en DB
  const [active,      setActive]      = useState<boolean>(false);       // módulo habilitado
  const [loading,     setLoading]     = useState(true);
  const [loadError,   setLoadError]   = useState<string | null>(null);
  const [cancelModal, setCancelModal] = useState<CancelModal | null>(null);

  // Derivar month/year del input "YYYY-MM"
  const [yearStr, monthStr] = monthInput.split('-');
  const year  = parseInt(yearStr,  10);
  const month = parseInt(monthStr, 10);

  // ── Carga ─────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // 1. Verificar configuración DTE
      const cfgRes  = await api.get('/dte/engine/config');
      const cfgData = (cfgRes.data as any)?.data ?? (cfgRes.data as any);
      const isConfigured = !!(cfgData?.configured);
      const isActive     = !!(cfgData?.active);
      setConfigured(isConfigured);
      setActive(isActive);
      if (!isActive) { setLoading(false); return; }

      // 2. Rango del mes seleccionado
      const from    = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to      = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const params: Record<string, unknown> = { from, to, page, perPage: PER_PAGE };
      if (filterEstado !== 'todos') params['status'] = filterEstado;
      if (filterTipo    !== 'todos') params['tipo']   = filterTipo;

      const [docsRes, sumRes] = await Promise.all([
        api.get('/dte/documents', { params }),
        api.get('/dte/summary',   { params: { month, year } }),
      ]);

      const docsPayload = (docsRes.data as any)?.data ?? (docsRes.data as any);
      const sumPayload  = (sumRes.data  as any)?.data ?? (sumRes.data  as any);

      setDocs(docsPayload?.docs ?? []);
      setTotalPages(docsPayload?.totalPages ?? 1);
      setTotal(docsPayload?.total ?? 0);
      setSummary(sumPayload);
    } catch (err: any) {
      const msg = err?.response?.data?.message
               ?? err?.response?.data?.error
               ?? err?.message
               ?? 'Error al cargar documentos';
      setLoadError(msg);
    } finally {
      setLoading(false);
    }
  }, [month, year, page, filterEstado, filterTipo]);

  useEffect(() => { load(); }, [load]);

  // ── Acciones ──────────────────────────────────────────────────────────────

  const handleRetry = async (docId: string) => {
    try {
      await api.post(`/dte/documents/${docId}/retry`);
      toast.success('Documento reemitido correctamente');
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al reintentar');
    }
  };

  const handleCancel = async () => {
    if (!cancelModal || !cancelModal.motivo.trim()) return;
    setCancelModal(m => m ? { ...m, saving: true } : null);
    try {
      await api.post(`/dte/documents/${cancelModal.docId}/cancel`, {
        motivo: cancelModal.motivo.trim(),
      });
      toast.success('Documento anulado');
      setCancelModal(null);
      load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Error al anular');
      setCancelModal(m => m ? { ...m, saving: false } : null);
    }
  };

  const handleExport = async () => {
    try {
      const from    = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const to      = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const params: Record<string, unknown> = { from, to, export: 'csv' };
      if (filterEstado !== 'todos') params['status'] = filterEstado;
      const res = await api.get('/dte/documents', { params, responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const a   = document.createElement('a');
      a.href     = url;
      a.download = `dte-${monthInput}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export no disponible');
    }
  };

  // ── Render: loading inicial (primera carga) ──────────────────────────────

  if (configured === null) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300" />
      </div>
    );
  }

  // ── Render: módulo no activo → landing de venta ───────────────────────────

  if (!active) {
    return (
      <div className="p-6 max-w-4xl mx-auto">

        {/* Header limpio */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-800">📄 Boletas & DTE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Facturación electrónica para tu restaurante</p>
        </div>

        {/* Hero banner */}
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-2xl p-8 mb-6 flex flex-col md:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-600 text-xs font-semibold px-3 py-1 rounded-full mb-4 uppercase tracking-wide">
              📄 Módulo opcional
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-3 leading-tight">
              Emite boletas y facturas electrónicas directo desde tu POS
            </h2>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Configura tu certificado digital y automatiza la facturación electrónica. Cada vez que cobres una mesa, el documento se emite y envía al SII automáticamente.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/apps/dte"
                className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors shadow-sm"
              >
                🔑 Configurar DTE
              </Link>
            </div>
          </div>

          {/* Boletas simuladas — solo desktop */}
          <div className="hidden md:flex flex-col gap-3 min-w-[220px]">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">Boleta Electrónica</span>
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  ✅ Emitida
                </span>
              </div>
              <div className="text-gray-400 text-xs mb-2">Folio #4521 · Mesa 4</div>
              <div className="border-t pt-2 flex justify-between">
                <span>Total</span>
                <span className="font-bold text-gray-800">$24.900</span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 text-xs text-gray-600">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold text-gray-800">Factura Electrónica</span>
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                  ✅ Emitida
                </span>
              </div>
              <div className="text-gray-400 text-xs mb-2">RUT: 76.543.210-K</div>
              <div className="border-t pt-2 flex justify-between">
                <span>Neto + IVA</span>
                <span className="font-bold text-gray-800">$59.500</span>
              </div>
            </div>
          </div>
        </div>

        {/* Features grid 2×3 */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {[
            {
              icon: '⚡',
              title: 'Emisión automática',
              desc: 'Al cobrar una orden, la boleta se emite sola sin pasos extra',
            },
            {
              icon: '📋',
              title: 'Boletas y facturas',
              desc: 'Elige el tipo de documento al momento del cobro',
            },
            {
              icon: '↩️',
              title: 'Notas de crédito',
              desc: 'Anula documentos y emite la nota de crédito con un clic',
            },
            {
              icon: '🏛️',
              title: 'Sincronizado con SII',
              desc: 'LibreDTE gestiona el envío al SII y la resolución automáticamente',
            },
            {
              icon: '📥',
              title: 'Descarga PDF y XML',
              desc: 'Descarga o reenvía por email cualquier documento emitido',
            },
            {
              icon: '📊',
              title: 'Resumen tributario',
              desc: 'Ve tus totales, IVA y documentos por mes en un dashboard',
            },
          ].map(f => (
            <div
              key={f.title}
              className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-gray-800 text-sm mb-1">{f.title}</div>
              <div className="text-xs text-gray-500 leading-relaxed">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* Pasos 1-2-3 */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-semibold text-gray-700 mb-4 text-sm uppercase tracking-wide">
            ¿Cómo activarlo?
          </h3>
          <div className="flex flex-col md:flex-row gap-4">
            {[
              {
                n: '1',
                title: 'Obtén tu certificado digital',
                desc: 'Compra un certificado .pfx en una entidad autorizada (E-Cert, Acepta, etc.)',
                color: 'bg-orange-100 text-orange-600',
              },
              {
                n: '2',
                title: 'Configura tus datos',
                desc: 'Ingresa RUT, razón social y sube tu certificado .pfx',
                color: 'bg-blue-100 text-blue-600',
              },
              {
                n: '3',
                title: 'Activa y prueba',
                desc: 'Ve a Configurar → Apps → DTE y activa el módulo para empezar',
                color: 'bg-green-100 text-green-600',
              },
            ].map(step => (
              <div key={step.n} className="flex gap-3 flex-1">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${step.color}`}>
                  {step.n}
                </div>
                <div>
                  <div className="font-medium text-gray-800 text-sm mb-0.5">{step.title}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Datos para las tarjetas ───────────────────────────────────────────────
  const errorCount = summary?.summary?.errors ?? 0;
  const cardsData = [
    {
      label:    'Emitidas',
      value:    summary?.summary?.issued ?? 0,
      sub:      `${summary?.summary?.cancelled ?? 0} anuladas`,
      icon:     '📄',
      iconBg:   'bg-green-100',
      valColor: 'text-gray-800',
    },
    {
      label:    'Monto Neto',
      value:    summary?.amounts?.totalNetFormatted ?? '$0',
      sub:      'Sin IVA',
      icon:     '💵',
      iconBg:   'bg-blue-100',
      valColor: 'text-gray-800',
    },
    {
      label:    'IVA (19%)',
      value:    summary?.amounts?.totalTaxFormatted ?? '$0',
      sub:      'A declarar en SII',
      icon:     '🏛️',
      iconBg:   'bg-purple-100',
      valColor: 'text-gray-800',
    },
    {
      label:    'Con errores',
      value:    errorCount,
      sub:      (summary?.summary?.pending ?? 0) > 0
                  ? `${summary.summary.pending} pendientes`
                  : 'Todo correcto',
      icon:     '⚠️',
      iconBg:   'bg-red-100',
      valColor: errorCount > 0 ? 'text-red-600' : 'text-gray-800',
    },
  ];

  // ── Render principal ──────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-5">

      {/* Header con estado DTE */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📄 Boletas & DTE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Facturación electrónica</p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm text-green-700 font-medium">DTE conectado</span>
          <Link to="/apps/dte" className="text-xs text-green-600 underline ml-1">
            Config
          </Link>
        </div>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-red-700 font-bold text-sm">Error al cargar documentos</p>
            <p className="text-red-500 text-xs mt-0.5">{loadError}</p>
          </div>
          <button onClick={load} className="text-red-400 hover:text-red-600 text-xs underline shrink-0">
            Reintentar
          </button>
        </div>
      )}

      {/* Tarjetas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cardsData.map(card => (
          <div
            key={card.label}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                <span className="text-lg">{card.icon}</span>
              </div>
            </div>
            {loading ? (
              <div className="h-7 w-20 bg-gray-100 rounded animate-pulse mb-1" />
            ) : (
              <div className={`text-2xl font-bold mb-1 ${card.valColor}`}>{card.value}</div>
            )}
            <div className="text-sm font-medium text-gray-600">{card.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Barra de filtros */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-wrap gap-3 items-center">

          {/* Selector mes */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Período
            </label>
            <input
              type="month"
              value={monthInput}
              onChange={e => { setMonthInput(e.target.value); setPage(1); }}
              className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          <div className="w-px h-6 bg-gray-200" />

          {/* Tipo documento */}
          <select
            value={filterTipo}
            onChange={e => { setFilterTipo(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="todos">Todos los tipos</option>
            <option value="39">📄 Boleta (39)</option>
            <option value="33">📋 Factura (33)</option>
            <option value="61">↩️ N. Crédito (61)</option>
          </select>

          {/* Estado */}
          <select
            value={filterEstado}
            onChange={e => { setFilterEstado(e.target.value); setPage(1); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
          >
            <option value="todos">Todos los estados</option>
            <option value="ISSUED">✅ Emitidos</option>
            <option value="PENDING">⏳ Pendientes</option>
            <option value="ERROR">⚠️ Con error</option>
            <option value="CANCELLED">❌ Anulados</option>
          </select>

          <div className="flex-1" />

          {/* Exportar */}
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-gray-200 hover:border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            📥 Exportar Excel
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-gray-800 font-bold text-sm">Documentos del mes</p>
          {!loading && total > 0 && (
            <span className="text-gray-400 text-xs">{total} documentos</span>
          )}
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-gray-300 mx-auto" />
            <p className="text-gray-400 text-xs mt-3">Cargando documentos...</p>
          </div>
        ) : docs.length === 0 ? (
          /* Empty state: DTE configurado pero sin docs */
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-gray-500 font-medium">Sin documentos en este período</p>
            <p className="text-gray-400 text-xs mt-1">
              Los documentos emitidos desde el POS aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['N° Doc.', 'Fecha', 'Cliente', 'Neto', 'IVA', 'Total', 'Estado', 'PDF', 'Acciones'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-gray-500 text-xs font-semibold uppercase tracking-wide"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map(doc => {
                  const st = STATUS_CFG[doc.status] ?? STATUS_CFG.PENDING;
                  return (
                    <tr key={doc.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-gray-700 text-sm">
                        {doc.folioNumber ? `#${doc.folioNumber}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {fmtFecha(doc.issuedAt ?? doc.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium text-sm">
                          {doc.clientName ?? 'Consumidor Final'}
                        </p>
                        {doc.clientRut && (
                          <p className="text-gray-400 text-xs font-mono">{doc.clientRut}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{fmtCLP(doc.netAmount ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600 text-sm">{fmtCLP(doc.taxAmount ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-800 font-bold text-sm">{fmtCLP(doc.amount ?? 0)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${st.cls}`}>
                          <st.Icon className="w-3 h-3" />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {doc.pdfUrl ? (
                          <a
                            href={doc.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 hover:text-blue-700 transition-colors"
                            title="Descargar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doc.status === 'ISSUED' && (
                            <button
                              onClick={() => setCancelModal({
                                docId: doc.id,
                                folioNumber: doc.folioNumber,
                                motivo: '',
                                saving: false,
                              })}
                              title="Anular documento"
                              className="text-red-400 hover:text-red-600 transition-colors"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          {(doc.status === 'ERROR' || doc.status === 'PENDING') && (
                            (doc.retryCount ?? 0) < 3 ? (
                              <button
                                onClick={() => handleRetry(doc.id)}
                                title="Reintentar emisión"
                                className="text-yellow-500 hover:text-yellow-700 transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                            ) : (
                              <span title="Máximo de reintentos alcanzado">
                                <AlertTriangle className="w-4 h-4 text-gray-300" />
                              </span>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
            <span className="text-gray-400 text-xs">
              Página {page} de {totalPages} · {total} documentos
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                ← Anterior
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-40 transition-colors"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bloque SII */}
      {(summary?.summary?.issued ?? 0) > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-purple-700 text-sm font-bold mb-1">💡 Resumen para declaración SII</p>
          <p className="text-purple-600 text-xs leading-relaxed">
            Este mes emitiste{' '}
            <strong>{summary.summary.issued} boletas</strong>{' '}
            por un total de{' '}
            <strong>{summary.amounts.totalAmountFormatted}</strong>.{' '}
            Debes declarar{' '}
            <strong>{summary.amounts.totalTaxFormatted}</strong>{' '}
            de IVA en el SII.
          </p>
        </div>
      )}

      {/* Modal anulación */}
      {cancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl border border-gray-200">
            <h3 className="text-gray-800 font-bold text-lg mb-1">Anular documento</h3>
            <p className="text-gray-500 text-xs mb-5">
              {cancelModal.folioNumber ? `Documento #${cancelModal.folioNumber}` : 'Documento sin número'}{' '}
              — Se emite una nota de crédito. Esta acción no se puede deshacer.
            </p>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="Ej: Error en monto, pedido cancelado por cliente..."
              value={cancelModal.motivo}
              onChange={e => setCancelModal(m => m ? { ...m, motivo: e.target.value } : null)}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 text-gray-800 text-sm
                         placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none mb-5"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setCancelModal(null)}
                disabled={cancelModal.saving}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelModal.saving || !cancelModal.motivo.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold
                           transition-colors disabled:opacity-50"
              >
                {cancelModal.saving ? 'Anulando...' : '❌ Confirmar anulación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}