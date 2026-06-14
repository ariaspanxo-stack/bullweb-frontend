// ═══════════════════════════════════════════════════════════════
// MESERO TRANSFER SHEET — transferencia completa de mesa
// ═══════════════════════════════════════════════════════════════

import { useState } from 'react';
import { X, ArrowRightLeft, Loader2 } from 'lucide-react';
import { meseroService } from '../meseroService';
import toast from 'react-hot-toast';

interface Table {
  id:     string;
  name?:  string;
  number: number;
  status: string;
}

interface MeseroTransferSheetProps {
  isOpen:        boolean;
  fromTableId:   string;
  fromTableName: string;
  tables:        Table[];
  onClose:       () => void;
  onTransfer:    () => void;
}

export function MeseroTransferSheet({
  isOpen, fromTableId, fromTableName, tables, onClose, onTransfer,
}: MeseroTransferSheetProps) {

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const availableTables = tables.filter(
    t => t.id !== fromTableId && t.status === 'AVAILABLE'
  );

  const selectedTable = availableTables.find(t => t.id === selectedTableId);

  const handleTransfer = async () => {
    if (!selectedTableId) return;
    setLoading(true);
    try {
      await meseroService.transferOrder(fromTableId, selectedTableId);
      toast.success('Mesa transferida correctamente');
      setSelectedTableId(null);
      onTransfer();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al transferir la mesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="fixed bottom-0 left-0 right-0 z-[70] bg-white rounded-t-3xl shadow-2xl
                      max-h-[80vh] flex flex-col">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-2 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="font-bold text-gray-800 text-lg leading-tight">Transferir mesa</h3>
              <p className="text-xs text-gray-400">Desde {fromTableName}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Grid de mesas disponibles */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {availableTables.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <ArrowRightLeft className="w-10 h-10 text-gray-200" />
              <p className="text-sm text-gray-400 text-center">
                No hay mesas disponibles para transferir
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 pb-2">
              {availableTables.map(table => (
                <button
                  key={table.id}
                  onClick={() =>
                    setSelectedTableId(
                      selectedTableId === table.id ? null : table.id
                    )
                  }
                  className={`aspect-square rounded-2xl flex flex-col items-center justify-center
                    gap-1 border-2 transition-all font-bold
                    ${selectedTableId === table.id
                      ? 'border-blue-400 bg-blue-50 text-blue-700 scale-105 shadow-md'
                      : 'border-gray-100 bg-gray-50 text-gray-700 hover:border-blue-200'
                    }`}
                >
                  <span className="text-xl">{table.number}</span>
                  {table.name && (
                    <span className="text-xs font-normal text-gray-400 truncate px-1 max-w-full">
                      {table.name}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 pb-8 pt-3 border-t border-gray-100">
          <button
            onClick={handleTransfer}
            disabled={!selectedTableId || loading}
            className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-base
                       rounded-2xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Transfiriendo...</>
            ) : selectedTableId ? (
              <><ArrowRightLeft className="w-5 h-5" /> Mover a {selectedTable?.name ?? `Mesa ${selectedTable?.number}`}</>
            ) : (
              'Selecciona una mesa'
            )}
          </button>
        </div>
      </div>
    </>
  );
}
