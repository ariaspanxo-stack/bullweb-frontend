import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Upload, CheckCircle, XCircle, AlertTriangle, FileText,
  Clock, Trash2, ChevronRight, ChevronLeft, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';
import type { ImportModuleDef, ImportValidateResult, ImportJob } from '@/services/adminService';

// ─── helpers ─────────────────────────────────────────────────────────────────
function parseCSV(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };
  const parse = (line: string) => {
    const result: string[] = [];
    let cur = '';
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur.trim());
    return result;
  };
  return { headers: parse(lines[0]), rows: lines.slice(1).map(parse) };
}

const STATUS_COLORS: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-600',
  validating: 'bg-blue-100 text-blue-700',
  validated:  'bg-yellow-100 text-yellow-700',
  importing:  'bg-orange-100 text-orange-700',
  completed:  'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
};

// ─────────────────────────────────────────────────────────────────────────────
export default function DataImportPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<'wizard' | 'history'>('wizard');

  // Wizard steps: 0=módulo, 1=archivo+mapeo, 2=preview+errores, 3=resultado
  const [step, setStep] = useState(0);
  const [selectedModule, setSelectedModule] = useState<ImportModuleDef | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, string>>({});
  const [validateResult, setValidateResult] = useState<ImportValidateResult | null>(null);
  const [importResult, setImportResult] = useState<{ imported_rows: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: modules = [] } = useQuery({
    queryKey: ['import', 'meta'],
    queryFn:  () => adminService.getImportMeta(),
  });

  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ['import', 'jobs'],
    queryFn:  () => adminService.listImportJobs(30),
    enabled:  tab === 'history',
  });

  const validateMutation = useMutation({
    mutationFn: (p: Parameters<typeof adminService.validateImport>[0]) =>
      adminService.validateImport(p),
    onSuccess: (result) => {
      setValidateResult(result);
      setStep(2);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al validar'),
  });

  const confirmMutation = useMutation({
    mutationFn: (jobId: string) => adminService.confirmImport(jobId),
    onSuccess: (result) => {
      setImportResult({ imported_rows: result.imported_rows });
      setStep(3);
      qc.invalidateQueries({ queryKey: ['import', 'jobs'] });
      toast.success(`Importación completada: ${result.imported_rows} filas`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? 'Error al importar'),
  });

  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => adminService.deleteImportJob(id),
    onSuccess: () => { refetchJobs(); toast.success('Job eliminado'); },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((file: File) => {
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseCSV(e.target?.result as string);
      setCsvData(parsed);
      // Auto-mapear columnas por coincidencia de nombre
      if (selectedModule) {
        const map: Record<string, string> = {};
        for (const h of parsed.headers) {
          const match = selectedModule.fields.find(
            f => f.key.toLowerCase() === h.toLowerCase() ||
                 f.label.toLowerCase() === h.toLowerCase(),
          );
          if (match) map[h] = match.key;
        }
        setColumnMap(map);
      }
    };
    reader.readAsText(file);
  }, [selectedModule]);

  const resetWizard = () => {
    setStep(0); setSelectedModule(null); setCsvFile(null);
    setCsvData(null); setColumnMap({}); setValidateResult(null); setImportResult(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Importación de Datos</h1>
          <p className="text-sm text-gray-500 mt-1">Importa clientes, productos e inventario desde CSV</p>
        </div>
        <div className="flex gap-2">
          {(['wizard', 'history'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
                tab === t ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t === 'wizard' ? 'Importar' : 'Historial'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Wizard Tab ─────────────────────────────────────────────────────── */}
      {tab === 'wizard' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Progress bar */}
          <div className="px-6 pt-6 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              {['Módulo', 'Archivo', 'Validación', 'Listo'].map((label, i) => (
                <div key={i} className="flex items-center gap-2 flex-1">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    i < step ? 'bg-green-500 text-white' :
                    i === step ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>
                    {label}
                  </span>
                  {i < 3 && <div className="flex-1 h-px bg-gray-200" />}
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            {/* ── Step 0: Seleccionar módulo ─────────────────────────── */}
            {step === 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-800">¿Qué deseas importar?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {modules.map(mod => (
                    <button
                      key={mod.key}
                      onClick={() => { setSelectedModule(mod); setColumnMap({}); }}
                      className={`p-5 rounded-xl border-2 text-left transition-all ${
                        selectedModule?.key === mod.key
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="font-semibold text-gray-800 mb-2">{mod.label}</div>
                      <div className="space-y-1">
                        {mod.fields.map(f => (
                          <div key={f.key} className="flex items-center gap-1 text-xs text-gray-500">
                            <span>{f.label}</span>
                            {f.required && <span className="text-red-500">*</span>}
                          </div>
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setStep(1)}
                    disabled={!selectedModule}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    Continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 1: Subir CSV + mapear columnas ───────────────── */}
            {step === 1 && selectedModule && (
              <div className="space-y-5">
                <h2 className="text-lg font-semibold text-gray-800">Sube tu archivo CSV — {selectedModule.label}</h2>

                {/* Drop zone */}
                <div
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileChange(f); }}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                >
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  {csvFile ? (
                    <p className="text-gray-800 font-medium">{csvFile.name}</p>
                  ) : (
                    <>
                      <p className="text-gray-600 font-medium">Arrastra un CSV o haz clic para seleccionar</p>
                      <p className="text-gray-400 text-sm mt-1">Solo archivos .csv, UTF-8</p>
                    </>
                  )}
                  <input
                    ref={fileRef} type="file" accept=".csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChange(f); }}
                  />
                </div>

                {/* Mapeo de columnas */}
                {csvData && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Mapeo de columnas ({csvData.headers.length} detectadas, {csvData.rows.length} filas)
                    </h3>
                    <div className="space-y-2">
                      {csvData.headers.map(h => (
                        <div key={h} className="flex items-center gap-3">
                          <div className="flex-1 text-sm text-gray-700 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                            {h}
                          </div>
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                          <select
                            value={columnMap[h] ?? ''}
                            onChange={e => setColumnMap(prev => ({ ...prev, [h]: e.target.value }))}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                          >
                            <option value="">— No importar —</option>
                            {selectedModule.fields.map(f => (
                              <option key={f.key} value={f.key}>
                                {f.label}{f.required ? ' *' : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(0)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </button>
                  <button
                    onClick={() => {
                      if (!csvData || !selectedModule) return;
                      validateMutation.mutate({
                        module: selectedModule.key,
                        headers: csvData.headers,
                        rows: csvData.rows,
                        column_map: columnMap,
                        filename: csvFile?.name ?? 'import.csv',
                      });
                    }}
                    disabled={!csvData || validateMutation.isPending}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                  >
                    {validateMutation.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : null}
                    Validar y continuar <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Resultados de validación ──────────────────── */}
            {step === 2 && validateResult && (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  {validateResult.can_import
                    ? <CheckCircle className="w-8 h-8 text-green-500" />
                    : <XCircle className="w-8 h-8 text-red-500" />}
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      {validateResult.can_import ? '¡Validación exitosa!' : 'Validación con errores'}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {validateResult.total_rows} filas · {validateResult.error_count} errores
                    </p>
                  </div>
                </div>

                {/* Errores */}
                {validateResult.errors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-red-600 mb-2">Errores encontrados:</h3>
                    <div className="bg-red-50 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-red-100 text-red-700 sticky top-0">
                          <tr>
                            <th className="text-left px-3 py-2">Fila</th>
                            <th className="text-left px-3 py-2">Campo</th>
                            <th className="text-left px-3 py-2">Mensaje</th>
                            <th className="text-left px-3 py-2">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validateResult.errors.map((e, i) => (
                            <tr key={i} className="border-t border-red-100">
                              <td className="px-3 py-1.5 text-red-700 font-medium">{e.row_number}</td>
                              <td className="px-3 py-1.5 text-gray-600">{e.field}</td>
                              <td className="px-3 py-1.5 text-gray-700">{e.message}</td>
                              <td className="px-3 py-1.5 text-gray-500">{e.raw_value || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Preview */}
                {validateResult.preview.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Vista previa (primeras 10 filas):</h3>
                    <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            {Object.keys(validateResult.preview[0] ?? {}).map(k => (
                              <th key={k} className="text-left px-3 py-2 text-gray-600">{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {validateResult.preview.map((row, i) => (
                            <tr key={i} className="border-t border-gray-100">
                              {Object.values(row).map((v, j) => (
                                <td key={j} className="px-3 py-1.5 text-gray-700">{String(v || '—')}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-between pt-2">
                  <button onClick={() => setStep(1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
                    <ChevronLeft className="w-4 h-4" /> Atrás
                  </button>
                  {validateResult.can_import && (
                    <button
                      onClick={() => confirmMutation.mutate(validateResult.job_id)}
                      disabled={confirmMutation.isPending}
                      className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                    >
                      {confirmMutation.isPending
                        ? <RefreshCw className="w-4 h-4 animate-spin" />
                        : <Upload className="w-4 h-4" />}
                      Confirmar importación
                    </button>
                  )}
                  {!validateResult.can_import && (
                    <button
                      onClick={() => setStep(1)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium"
                    >
                      <AlertTriangle className="w-4 h-4" /> Corregir archivo
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 3: Resultado final ────────────────────────────── */}
            {step === 3 && importResult && (
              <div className="text-center py-10 space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-800">¡Importación completada!</h2>
                <p className="text-gray-600">
                  Se importaron <span className="font-bold text-green-600">{importResult.imported_rows}</span> filas
                  {selectedModule ? ` al módulo de ${selectedModule.label.toLowerCase()}` : ''}.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={resetWizard}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    Nueva importación
                  </button>
                  <button
                    onClick={() => { setTab('history'); refetchJobs(); }}
                    className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Ver historial
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── History Tab ────────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-800">Historial de importaciones</h2>
            <button onClick={() => refetchJobs()} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> Actualizar
            </button>
          </div>
          {jobs.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No hay importaciones registradas</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Archivo</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Módulo</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Estado</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Filas</th>
                  <th className="text-right px-4 py-3 text-gray-600 font-medium">Errores</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-medium">Fecha</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {(jobs as ImportJob[]).map(job => (
                  <tr key={job.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-800 font-medium max-w-xs truncate">
                      {job.original_name}
                    </td>
                    <td className="px-4 py-3">
                      <span className="capitalize text-gray-600">{job.module}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[job.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{job.total_rows}</td>
                    <td className="px-4 py-3 text-right">
                      <span className={job.error_count > 0 ? 'text-red-600 font-medium' : 'text-gray-400'}>
                        {job.error_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {new Date(job.created_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteJobMutation.mutate(job.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
