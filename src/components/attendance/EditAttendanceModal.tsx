import { useState } from 'react';
import { format } from 'date-fns';
import { LogIn, LogOut, X, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import api from '@/services/api';
import { fmtDateTime } from '@/utils/exportExcel';
import toast from 'react-hot-toast';

interface AttendanceRecord {
  id:                 string;
  employeeName:       string;
  type:               'ENTRY' | 'EXIT';
  timestamp:          string;
  method:             string;
  notes:              string | null;
  editedBy?:          string | null;
  editedAt?:          string | null;
  originalTimestamp?: string | null;
  editNote?:          string | null;
}

interface Props {
  record:  AttendanceRecord;
  onClose: () => void;
  onSaved: () => void;
}

export function EditAttendanceModal({ record, onClose, onSaved }: Props) {
  const [type,      setType]      = useState<'ENTRY' | 'EXIT'>(record.type);
  const [timestamp, setTimestamp] = useState(
    format(new Date(record.timestamp), "yyyy-MM-dd'T'HH:mm")
  );
  const [notes,     setNotes]     = useState(record.notes ?? '');
  const [editNote,  setEditNote]  = useState('');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNote.trim()) {
      setError('El motivo de edición es obligatorio');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await api.patch(`/attendance/records/${record.id}`, {
        type,
        timestamp,
        notes: notes || null,
        editNote,
      });
      toast.success('Registro actualizado');
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.response?.data?.message ?? 'Error al actualizar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-800 text-lg">Editar registro</h2>
            <p className="text-sm text-gray-400 mt-0.5">{record.employeeName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Banner historial de edición — solo si ya fue editado */}
        {record.editedAt && (
          <div className="mx-6 mt-4 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 space-y-0.5">
                <p className="font-semibold">Registro editado manualmente</p>
                <p>Editado el {fmtDateTime(record.editedAt)}</p>
                {record.originalTimestamp && (
                  <p>Hora original: {fmtDateTime(record.originalTimestamp)}</p>
                )}
                {record.editNote && <p>Motivo: {record.editNote}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Tipo ENTRY / EXIT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('ENTRY')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                  type === 'ENTRY'
                    ? 'bg-green-50 border-green-400 text-green-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                <LogIn className="w-4 h-4" /> Entrada
              </button>
              <button
                type="button"
                onClick={() => setType('EXIT')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors border-2 ${
                  type === 'EXIT'
                    ? 'bg-blue-50 border-blue-400 text-blue-700'
                    : 'bg-white border-gray-200 text-gray-500'
                }`}
              >
                <LogOut className="w-4 h-4" /> Salida
              </button>
            </div>
          </div>

          {/* Fecha y hora */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha y hora</label>
            <input
              type="datetime-local"
              value={timestamp}
              onChange={e => setTimestamp(e.target.value)}
              required
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ej: Trabajó en sala VIP"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>

          {/* Motivo de edición — obligatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Motivo de la edición <span className="text-red-400">*</span>
            </label>
            <textarea
              value={editNote}
              onChange={e => setEditNote(e.target.value)}
              required
              rows={2}
              placeholder="Ej: Empleado olvidó marcar entrada"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">Queda registrado en el historial de auditoría</p>
          </div>

          {/* Error inline */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 text-sm px-3 py-2.5 rounded-xl">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !editNote.trim()}
              className="flex-1 py-2.5 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
