// LOTE 338: Asignar imagenes referenciales a los productos sin foto del local (biblioteca primero; IA solo si la familia no tiene imagen).
// 1) vista previa (N sin foto, M desde biblioteca, K a generar, costo estimado) -> 2) confirmar -> 3) progreso -> resumen y errores por producto.
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useToast } from '../Toast';
import { adminService, type ImageLibraryJob, type ImageLibraryPreview } from '../../services/adminService';
import { BTN_OUTLINE, BTN_PRIMARY } from './productsUi';

interface Props { isOpen: boolean; onClose: () => void; onDone?: () => void }

const fmtClp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`;

export const AssignImagesModal: React.FC<Props> = ({ isOpen, onClose, onDone }) => {
  const toast = useToast();
  const [vista, setVista] = useState<ImageLibraryPreview | null>(null);
  const [cargando, setCargando] = useState(false);
  const [job, setJob] = useState<ImageLibraryJob | null>(null);
  const timer = useRef<number | null>(null);
  const corriendo = job?.estado === 'corriendo';

  const parar = () => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } };
  const seguir = () => {
    parar();
    timer.current = window.setInterval(async () => {
      try {
        const j = await adminService.imageLibraryJob();
        setJob(j);
        if (j && j.estado !== 'corriendo') { parar(); onDone?.(); }
      } catch { /* reintenta en el siguiente tick */ }
    }, 1500);
  };

  useEffect(() => {
    if (!isOpen) return;
    setVista(null); setJob(null); setCargando(true);
    adminService.imageLibraryJob().then((j) => { if (j?.estado === 'corriendo') { setJob(j); seguir(); } }).catch(() => {});
    adminService.imageLibraryPreview()
      .then(setVista)
      .catch((e: any) => toast.error(e?.message || 'No se pudo calcular la vista previa'))
      .finally(() => setCargando(false));
    return parar;
  }, [isOpen]);

  const iniciar = async () => {
    try {
      const j = await adminService.imageLibraryRun();
      setJob(j); seguir();
    } catch (e: any) {
      toast.error(e?.message || 'No se pudo iniciar la asignacion');
    }
  };

  if (!isOpen) return null;
  const pct = job && job.total > 0 ? Math.round((job.hechos / job.total) * 100) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 text-slate-900" role="dialog" aria-modal="true" aria-label="Asignar imagenes faltantes">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" data-testid="assign-images-modal">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-[#0F172A]">Asignar imágenes faltantes</h2>
            <p className="text-sm text-[#64748B]">Imágenes referenciales para los productos sin foto. Puedes cambiar cada una por tu foto real.</p>
          </div>
          <button onClick={() => { if (!corriendo) onClose(); }} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg hover:bg-slate-100" aria-label="Cerrar" disabled={corriendo}><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-4 space-y-4 overflow-y-auto">
          {cargando && <p className="text-sm text-[#475569] flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Revisando productos…</p>}

          {vista && !job && (
            <div className="space-y-3" data-testid="assign-images-preview">
              <p className="text-base text-[#0F172A]">
                <b>{vista.sinFoto}</b> productos sin foto: <b>{vista.desdeBiblioteca}</b> desde la biblioteca
                {vista.aGenerar > 0 && <>, <b>{vista.aGenerar}</b> {vista.aGenerar === 1 ? 'imagen' : 'imágenes'} a generar para {vista.conImagenNueva} productos</>}.
              </p>
              <p className="text-base">Costo estimado: <b>{fmtClp(vista.costoClp)}</b></p>
              {vista.sinFamilia > 0 && (
                <p className="text-sm text-[#64748B]">{vista.sinFamilia} sin imagen sugerida (quedan como están): {vista.sinFamiliaProductos.slice(0, 8).join(', ')}{vista.sinFamiliaProductos.length > 8 ? '…' : ''}</p>
              )}
              {vista.trial && (
                <p className="text-sm text-[#64748B]">Período de prueba: {vista.trial.usadas} de {vista.trial.tope} imágenes generadas usadas.{vista.bloqueadasPorTope > 0 ? ` ${vista.bloqueadasPorTope} productos quedan sin imagen por el tope.` : ''}</p>
              )}
            </div>
          )}

          {job && (
            <div className="space-y-2" data-testid="assign-images-progress">
              <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden"><div className="h-full bg-[#F97316] transition-all" style={{ width: `${pct}%` }} /></div>
              <p className="text-sm text-[#475569]">{job.hechos} de {job.total} · <b>{job.asignadas}</b> asignadas · <b>{job.generadas}</b> generadas{job.estado === 'terminado' ? ' · listo' : job.estado === 'error' ? ' · con error' : ''}</p>
              {job.errores.length > 0 && (
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-3 text-sm max-h-40 overflow-y-auto">
                  <p className="font-bold mb-1">Con error ({job.errores.length}):</p>
                  {job.errores.map((e, i) => <p key={i}>{e.producto}: {e.error}</p>)}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-200">
          <button onClick={onClose} className={BTN_OUTLINE} disabled={corriendo}>{job && !corriendo ? 'Cerrar' : 'Cancelar'}</button>
          {!job && (
            <button onClick={iniciar} className={BTN_PRIMARY} disabled={!vista || vista.sinFoto === 0 || (vista.desdeBiblioteca + vista.conImagenNueva) === 0} data-testid="assign-images-start">
              <ImageIcon className="w-5 h-5" /> Asignar imágenes
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AssignImagesModal;
