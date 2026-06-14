import { useState, useEffect } from 'react';
import {
  X, Loader2, RefreshCw, AlertCircle, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { adminService } from '@/services/adminService';

interface FailedJob {
  id:           string;
  printer_id:   string;
  printer_name: string;
  status:       string;
  attempts:     number;
  error_msg:    string | null;
  created_at:   string;
}

interface FailedJobsPanelProps {
  printerId?: string;
  onClose:    () => void;
}

export function FailedJobsPanel({ printerId, onClose }: FailedJobsPanelProps) {
  const [jobs,     setJobs]     = useState<FailedJob[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.getFailedJobs(printerId);
      setJobs(data ?? []);
    } catch {
      toast.error('Error al cargar los jobs fallidos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [printerId]);

  const handleRetry = async (jobId: string) => {
    setRetrying(prev => new Set([...prev, jobId]));
    try {
      await adminService.retryFailedJob(jobId);
      toast.success('Job enviado a la cola de reimpresión');
      await load();
    } catch {
      toast.error('Error al reintentar el job');
    } finally {
      setRetrying(prev => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleCancel = async (jobId: string) => {
    try {
      await adminService.cancelFailedJob(jobId);
      toast.success('Job cancelado');
      setJobs(prev => prev.filter(j => j.id !== jobId));
    } catch {
      toast.error('Error al cancelar el job');
    }
  };

  const handleRetryAll = async () => {
    const ids = jobs.map(j => j.id);
    setRetrying(new Set(ids));
    try {
      await Promise.all(ids.map(id => adminService.retryFailedJob(id)));
      toast.success(`${ids.length} jobs enviados a la cola`);
      await load();
    } catch {
      toast.error('Error al reintentar los jobs');
    } finally {
      setRetrying(new Set());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-800 text-lg">Cola de reimpresión</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              {jobs.length} ticket{jobs.length !== 1 ? 's' : ''}{' '}
              fallido{jobs.length !== 1 ? 's' : ''}
              {printerId ? ' en esta impresora' : ' en total'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {jobs.length > 1 && (
              <button
                onClick={handleRetryAll}
                disabled={retrying.size > 0}
                className="flex items-center gap-2 px-3 py-2 bg-orange-500 hover:bg-orange-400
                           text-white text-sm font-medium rounded-xl disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar todos
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-orange-400" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
              <p className="font-semibold text-gray-700">Sin tickets fallidos</p>
              <p className="text-sm text-gray-400 mt-1">
                Todas las impresiones se completaron correctamente
              </p>
            </div>
          ) : (
            jobs.map(job => (
              <div key={job.id} className="bg-gray-50 rounded-2xl p-4 flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm truncate">
                      {job.printer_name}
                    </span>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(job.created_at).toLocaleString('es-CL', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {job.error_msg && (
                    <p className="text-xs text-red-500 truncate" title={job.error_msg}>
                      {job.error_msg}
                    </p>
                  )}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {job.attempts} intento{job.attempts !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleRetry(job.id)}
                    disabled={retrying.has(job.id)}
                    title="Reintentar impresión"
                    className="p-2 rounded-xl hover:bg-orange-100 text-gray-400 hover:text-orange-500
                               disabled:opacity-50 transition-colors"
                  >
                    {retrying.has(job.id)
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <RefreshCw className="w-4 h-4" />
                    }
                  </button>
                  <button
                    onClick={() => handleCancel(job.id)}
                    disabled={retrying.has(job.id)}
                    title="Cancelar job"
                    className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500
                               disabled:opacity-50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
