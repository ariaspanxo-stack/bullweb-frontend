import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService } from '@/services/attendanceService';
import {
  FileText, Plus, CheckCircle, XCircle, Clock, Upload, Eye,
  ChevronDown, Loader2, Search, X, Paperclip, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { exportToExcel } from '@/utils/exportExcel';

// ─── Types ────────────────────────────────────────────────────────────────────
interface JustificativosTabProps {
  employees: { id: string; name: string }[];
}

type Tipo = 'medico' | 'personal' | 'vacaciones' | 'feriado' | 'licencia';

const TIPOS: { value: Tipo; label: string; color: string }[] = [
  { value: 'medico',     label: 'Médico',      color: 'bg-red-100    text-red-700'    },
  { value: 'personal',   label: 'Personal',    color: 'bg-amber-100  text-amber-700'  },
  { value: 'vacaciones', label: 'Vacaciones',  color: 'bg-green-100  text-green-700'  },
  { value: 'feriado',    label: 'Feriado',     color: 'bg-blue-100   text-blue-700'   },
  { value: 'licencia',   label: 'Licencia',    color: 'bg-purple-100 text-purple-700' },
];

const ESTADOS: { value: string; label: string; color: string }[] = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-amber-100 text-amber-700'  },
  { value: 'aprobado',  label: 'Aprobado',  color: 'bg-green-100 text-green-700'  },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-100   text-red-700'    },
];

function tipoLabel(tipo: string) {
  return TIPOS.find(t => t.value === tipo)?.label ?? tipo;
}
function tipoColor(tipo: string) {
  return TIPOS.find(t => t.value === tipo)?.color ?? 'bg-gray-100 text-gray-600';
}
function estadoColor(estado: string) {
  return ESTADOS.find(e => e.value === estado)?.color ?? 'bg-gray-100 text-gray-500';
}

// ─── Component ────────────────────────────────────────────────────────────────
export function JustificativosTab({ employees }: JustificativosTabProps) {
  const qc = useQueryClient();

  // ── Filtros
  const [filterEmp,    setFilterEmp]    = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterFrom,   setFilterFrom]   = useState('');
  const [filterTo,     setFilterTo]     = useState('');

  // ── Nuevo justificativo
  const [showForm,  setShowForm]  = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().slice(0, 10));
  const [formTipo,  setFormTipo]  = useState<Tipo>('medico');
  const [formDesc,  setFormDesc]  = useState('');

  // ── Upload
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [uploadPct,   setUploadPct]   = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries
  const { data: justificativos = [], isLoading } = useQuery({
    queryKey: ['justificativos', filterEmp, filterEstado, filterFrom, filterTo],
    queryFn: () => attendanceService.getJustificativos({
      employeeId: filterEmp   || undefined,
      estado:     filterEstado || undefined,
      from:       filterFrom  || undefined,
      to:         filterTo    || undefined,
    }),
    staleTime: 30_000,
  });

  // ── Mutations
  const createMut = useMutation({
    mutationFn: () => attendanceService.createJustificativo({
      employeeId: formEmpId,
      fecha:      formFecha,
      tipo:       formTipo,
      descripcion: formDesc || undefined,
    }),
    onSuccess: () => {
      toast.success('Justificativo creado');
      qc.invalidateQueries({ queryKey: ['justificativos'] });
      setShowForm(false);
      setFormEmpId(''); setFormFecha(new Date().toISOString().slice(0, 10));
      setFormTipo('medico'); setFormDesc('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al crear justificativo'),
  });

  const approveMut = useMutation({
    mutationFn: ({ id, estado }: { id: string; estado: 'aprobado' | 'rechazado' }) =>
      attendanceService.approveJustificativo(id, estado),
    onSuccess: (_, { estado }) => {
      toast.success(estado === 'aprobado' ? 'Justificativo aprobado' : 'Justificativo rechazado');
      qc.invalidateQueries({ queryKey: ['justificativos'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error ?? 'Error al actualizar'),
  });

  const handleUpload = async (justId: string, file: File) => {
    setUploadingId(justId);
    setUploadPct(0);
    try {
      await attendanceService.uploadDocumento(justId, file, setUploadPct);
      toast.success('Documento subido');
      qc.invalidateQueries({ queryKey: ['justificativos'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Error al subir documento');
    } finally {
      setUploadingId(null);
      setUploadPct(0);
    }
  };

  const triggerUpload = (id: string) => {
    setUploadingId(id);
    if (fileInputRef.current) {
      fileInputRef.current.dataset.justId = id;
      fileInputRef.current.click();
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const id   = fileInputRef.current?.dataset.justId;
    if (file && id) handleUpload(id, file);
    e.target.value = '';
  };

  const pending = justificativos.filter((j: any) => j.estado === 'pendiente').length;

  const handleExportExcel = () => {
    if (!justificativos.length) { toast.error('No hay justificativos para exportar'); return; }
    const rows = (justificativos as any[]).map(j => ({
      Empleado:     j.employeeName ?? j.employee?.name ?? '',
      Fecha:        j.fecha ? new Date(j.fecha + 'T00:00:00').toLocaleDateString('es-CL') : '',
      Tipo:         TIPOS.find(t => t.value === j.tipo)?.label ?? j.tipo ?? '',
      Estado:       ESTADOS.find(e => e.value === j.estado)?.label ?? j.estado ?? '',
      Descripción:  j.descripcion ?? '',
      Documento:    j.documentoUrl ? 'Sí' : 'No',
    }));
    exportToExcel([{ sheetName: 'Justificativos', rows }], 'justificativos_asistencia');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-800">Justificativos de Ausencia</h3>
          {pending > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-2 py-0.5 rounded-full">
              {pending} pendiente{pending > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            title="Exportar a Excel"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nuevo Justificativo
          </button>
        </div>
      </div>

      {/* Formulario crear */}
      {showForm && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Nuevo Justificativo
          </h4>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Empleado *</label>
              <select
                value={formEmpId}
                onChange={e => setFormEmpId(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Seleccionar…</option>
                {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Fecha *</label>
              <input
                type="date"
                value={formFecha}
                onChange={e => setFormFecha(e.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
              <select
                value={formTipo}
                onChange={e => setFormTipo(e.target.value as Tipo)}
                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
              <input
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                placeholder="Opcional…"
                className="w-full border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => createMut.mutate()}
              disabled={!formEmpId || !formFecha || createMut.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Crear
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            value={filterEmp}
            onChange={e => setFilterEmp(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los empleados</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <select
          value={filterEstado}
          onChange={e => setFilterEstado(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todos los estados</option>
          {ESTADOS.map(e => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <span className="text-gray-400 text-xs">–</span>
        <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
          className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {(filterEmp || filterEstado || filterFrom || filterTo) && (
          <button
            onClick={() => { setFilterEmp(''); setFilterEstado(''); setFilterFrom(''); setFilterTo(''); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600"
          >
            <X className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Input oculto para upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={onFileChange}
      />

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-400 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
          </div>
        ) : justificativos.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <FileText className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No hay justificativos para los filtros seleccionados</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Empleado', 'Fecha', 'Tipo', 'Descripción', 'Estado', 'Documento', 'Acciones'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {justificativos.map((j: any) => (
                <tr key={j.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {j.employee?.name ?? j.employeeName ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">
                    {j.fecha ? new Date(j.fecha).toLocaleDateString('es-CL') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor(j.tipo)}`}>
                      {tipoLabel(j.tipo)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                    {j.descripcion ?? <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium capitalize ${estadoColor(j.estado)}`}>
                      {j.estado === 'aprobado'  && <CheckCircle className="w-3 h-3" />}
                      {j.estado === 'rechazado' && <XCircle     className="w-3 h-3" />}
                      {j.estado === 'pendiente' && <Clock       className="w-3 h-3" />}
                      {j.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {j.documento_url ? (
                      <a
                        href={`/api/attendance/uploads/justificativos/${j.documento_url.split('/').pop()}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        <Eye className="w-3 h-3" /> Ver doc
                      </a>
                    ) : (
                      uploadingId === j.id ? (
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {uploadPct > 0 ? `${uploadPct}%` : 'Subiendo…'}
                        </div>
                      ) : (
                        <button
                          onClick={() => triggerUpload(j.id)}
                          className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Subir documento"
                        >
                          <Paperclip className="w-3 h-3" /> Subir
                        </button>
                      )
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {j.estado === 'pendiente' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approveMut.mutate({ id: j.id, estado: 'aprobado' })}
                          disabled={approveMut.isPending}
                          className="flex items-center gap-1 px-2 py-1 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <CheckCircle className="w-3 h-3" /> Aprobar
                        </button>
                        <button
                          onClick={() => approveMut.mutate({ id: j.id, estado: 'rechazado' })}
                          disabled={approveMut.isPending}
                          className="flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors"
                        >
                          <XCircle className="w-3 h-3" /> Rechazar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Stats footer */}
      {justificativos.length > 0 && (
        <div className="flex gap-4 text-xs text-gray-500">
          {ESTADOS.map(e => {
            const count = justificativos.filter((j: any) => j.estado === e.value).length;
            return count > 0 ? (
              <span key={e.value} className={`flex items-center gap-1 px-2 py-1 rounded-full ${estadoColor(e.value)}`}>
                {count} {e.label.toLowerCase()}{count > 1 ? 's' : ''}
              </span>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}
