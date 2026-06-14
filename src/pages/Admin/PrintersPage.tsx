import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Printer, Plus, Pencil, Trash2, ToggleLeft, ToggleRight,
  Wifi, WifiOff, PlayCircle, RefreshCw, X, Check,
  Download, Bot, Copy, Eye, EyeOff, Circle, History,
  AlertTriangle, Clock, RotateCcw, Ban, Zap,
  UserPlus, CheckCircle2, XCircle, ScrollText,
  ArrowUpCircle, ChevronRight,
  Loader2, BarChart2, AlertCircle, Wrench, GripVertical,
  CheckCircle, Puzzle, Terminal, MonitorCheck,
} from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { adminService } from '@/services/adminService';
import type { Printer as PrinterType, Branch, PrintAgent, PrintJobHistory, PrintersHealth, AgentLog, AgentRelease } from '@/services/adminService';
import toast from 'react-hot-toast';
import { NotificationSettingsPanel } from '@/components/print/NotificationSettingsPanel';
import { PrinterRoutingManager }     from '@/components/print/PrinterRoutingManager';
import { PrinterModal }              from '@/components/print/PrinterModal';
import { ConfirmDialog }             from '@/components/common/ConfirmDialog';
import { FailedJobsPanel }           from '@/components/print/FailedJobsPanel';
import { PrinterHistoryModal }       from '@/components/print/PrinterHistoryModal';

// ─── Constantes ─────────────────────────────────────────────────────────────────
const PRINTER_TYPES    = ['receipt', 'kitchen', 'kds', 'label'] as const;

// Tiempo relativo simple sin date-fns
function timeAgo(date: string | null): string {
  if (!date) return 'Nunca';
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60)        return 'Hace un momento';
  if (secs < 3600)      return `Hace ${Math.floor(secs / 60)} min`;
  if (secs < 86400)     return `Hace ${Math.floor(secs / 3600)} h`;
  if (secs < 2592000)   return `Hace ${Math.floor(secs / 86400)} d`;
  return new Date(date).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' });
}
const PROTOCOLS        = ['escpos', 'star', 'zpl'] as const;
const PAPER_WIDTHS     = [58, 62, 80] as const;
const CONNECTION_TYPES = ['ethernet', 'usb', 'serial', 'os_driver', 'bluetooth'] as const;
const BAUD_RATES       = [9600, 19200, 38400, 57600, 115200] as const;

const QR_TYPES = [
  { value: 'receipt',            label: '🧾 Recibo digital' },
  { value: 'menu',               label: '📋 Carta / Menú' },
  { value: 'review_google',      label: '⭐ Reseña Google' },
  { value: 'review_tripadvisor', label: '🦉 TripAdvisor' },
  { value: 'custom',             label: '🔗 URL personalizada' },
] as const;

const TYPE_LABEL: Record<string, string> = {
  receipt: 'Recibo',
  kitchen: 'Cocina / Comanda',
  kds:     'KDS',
  label:   'Etiquetas',
};
const TYPE_COLOR: Record<string, string> = {
  receipt: 'bg-blue-100 text-blue-700',
  kitchen: 'bg-orange-100 text-orange-700',
  kds:     'bg-purple-100 text-purple-700',
  label:   'bg-green-100 text-green-700',
};

const CONN_LABEL: Record<string, string> = {
  ethernet:  '🌐 Ethernet',
  usb:       '🔌 USB',
  serial:    '📡 Serial',
  os_driver: '🖨️ Driver SO',
  bluetooth: '📶 Bluetooth',
};
const CONN_COLOR: Record<string, string> = {
  ethernet:  'bg-blue-100 text-blue-700',
  usb:       'bg-purple-100 text-purple-700',
  serial:    'bg-yellow-100 text-yellow-700',
  os_driver: 'bg-emerald-100 text-emerald-700',
  bluetooth: 'bg-cyan-100 text-cyan-700',
};

// ─── Modal: Nuevo Agente ──────────────────────────────────────────────────────
function NewAgentModal({ onClose, onSave, saving }: {
  onClose: () => void;
  onSave: (dto: { name: string }) => void;
  saving: boolean;
}) {
  const [name, setName] = useState('');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Bot className="w-5 h-5 text-blue-600" /> Registrar agente
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del agente *</label>
            <input value={name} onChange={e => setName(e.target.value)}
              placeholder="Ej: Agente Caja 1"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
          </div>
          <p className="text-xs text-gray-500">Se generará una clave API automáticamente. Ingresala en el Agente BullWeb al configurarlo.</p>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={() => onSave({ name: name.trim() })}
            disabled={!name.trim() || saving}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            {saving ? 'Creando...' : 'Crear agente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección: Extensión Chrome/Edge ──────────────────────────────────────────
function ExtensionSection() {
  // null = verificando, true = detectada, false = no detectada
  const [detected, setDetected] = useState<boolean | null>(null);
  const [extVersion, setExtVersion] = useState<string>('');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [copied, setCopied] = useState(false);

  // Detección: la extensión inyecta window.BullWebExtension (puede tardar ~3 s)
  useEffect(() => {
    let attempts = 0;
    const check = () => {
      const ext = (window as any).BullWebExtension;
      // 'connected' = polling activo en background.js v1.1; 'installed' = versión anterior
      if (ext?.status === 'connected' || ext?.status === 'installed') {
        setDetected(true);
        setExtVersion(ext.version ?? '');
      } else if (attempts >= 6) {
        setDetected(false);
      } else {
        attempts++;
        setTimeout(check, 600);
      }
    };
    check();
  }, []);

  // Agentes registrados — necesarios para mostrar la API Key
  const { data: agents = [] } = useQuery<PrintAgent[]>({
    queryKey: ['print-agents'],
    queryFn: () => adminService.listAgents(),
    enabled: detected === true,
  });
  const firstAgent = agents[0] ?? null;

  const handleCopyApiKey = () => {
    if (!firstAgent?.api_key) return;
    navigator.clipboard.writeText(firstAgent.api_key).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (detected === null) return null; // cargando silenciosamente

  const INSTALLER_URL = 'https://app.bullwebchile.com/downloads/install-host.ps1';
  const EXTENSION_ZIP_URL = 'https://app.bullwebchile.com/downloads/bullweb-extension.zip';
  const EXTENSION_REPO_URL = 'https://github.com/ariaspanxo-stack/bullweb-extension';

  // ── Extensión detectada ───────────────────────────────────────────────────
  if (detected) {
    return (
      <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Puzzle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  BullWeb Extension
                  <span className="bg-white/25 text-xs font-semibold px-2 py-0.5 rounded-full">
                    {extVersion ? `v${extVersion}` : 'Instalada'}
                  </span>
                </h3>
                <p className="text-sm text-emerald-100 mt-0.5">
                  Impresión local vía Native Messaging — sin WebSocket, sin reinicios
                </p>
              </div>
            </div>
            <div className="shrink-0 bg-white/20 rounded-xl px-3 py-2 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-0.5" />
              <p className="text-xs font-semibold">Activa</p>
            </div>
          </div>
        </div>

        {/* API Key del agente */}
        {firstAgent && (
          <div className="px-5 py-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              API Key del agente
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 truncate select-all">
                {firstAgent.api_key}
              </code>
              <button
                onClick={handleCopyApiKey}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  copied
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copiada' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
              <Puzzle className="w-3 h-3" />
              Pega esta API Key en el popup de la extensión Chrome/Edge → campo API Key → Guardar
            </p>
          </div>
        )}

        <div className="px-5 py-3 bg-emerald-50 border-t border-emerald-100 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle className="w-4 h-4 shrink-0" />
          La extensión procesa trabajos de impresión localmente — funciona aunque el backend reinicie
        </div>
      </div>
    );
  }

  // ── Wizard de instalación (4 pasos) ──────────────────────────────────────
  const steps = [
    { num: 1 as const, icon: <Puzzle className="w-5 h-5" />,      title: 'Instalar extensión',  desc: 'Añade BullWeb Extension a Chrome o Edge' },
    { num: 2 as const, icon: <Terminal className="w-5 h-5" />,    title: 'Native Host',          desc: 'Script PowerShell en el PC de la caja' },
    { num: 3 as const, icon: <Copy className="w-5 h-5" />,        title: 'API Key',              desc: 'Configura la clave en el popup' },
    { num: 4 as const, icon: <MonitorCheck className="w-5 h-5" />, title: 'Verificar',           desc: 'Recarga y confirma conexión' },
  ];

  return (
    <div className="bg-white rounded-xl border border-indigo-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-5 text-white">
        <div className="flex items-start gap-3">
          <div className="bg-white/20 p-2 rounded-xl shrink-0">
            <Puzzle className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold">BullWeb Extension (Recomendado)</h3>
            <p className="text-sm text-indigo-100 mt-0.5">
              Sin agente .exe, sin WebSocket. Arranca con el navegador y nunca falla por reinicios del servidor.
            </p>
          </div>
          <span className="shrink-0 text-xs bg-amber-400 text-amber-900 font-semibold px-2 py-0.5 rounded-full">
            Nuevo
          </span>
        </div>

        {/* Stepper */}
        <div className="mt-4 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <div key={s.num} className="flex items-center gap-1.5 flex-1">
              <button
                onClick={() => setStep(s.num)}
                className={`flex items-center gap-2 text-left w-full rounded-xl px-2.5 py-2 transition-colors ${
                  step === s.num ? 'bg-white/25' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  step > s.num ? 'bg-green-400 text-white' : step === s.num ? 'bg-white text-indigo-700' : 'bg-white/30 text-white'
                }`}>
                  {step > s.num ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span className="text-xs font-medium leading-tight hidden sm:block">{s.title}</span>
              </button>
              {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-white/40 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido por paso */}
      <div className="p-5">

        {/* ── Paso 1: Instalar extensión ── */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Paso 1: Instala la extensión en Chrome o Edge</h4>
              <p className="text-sm text-gray-500">
                Aún no está en la Chrome Web Store — se instala en modo desarrollador (2 minutos).
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Instrucciones:</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Descarga el ZIP desde el botón de abajo</li>
                <li>Descomprime en una carpeta permanente (ej: <code className="bg-gray-200 px-1 rounded">C:\BullWebExtension</code>)</li>
                <li>Abre Chrome/Edge → <code className="bg-gray-200 px-1 rounded">chrome://extensions</code></li>
                <li>Activa <strong>Modo desarrollador</strong> (arriba a la derecha)</li>
                <li>Clic en <strong>Cargar descomprimida</strong> → selecciona la carpeta <code className="bg-gray-200 px-1 rounded">bullweb-extension/</code></li>
                <li>Confirma que el ID sea: <code className="bg-gray-200 px-1 rounded text-xs">gpkgbfapialjgbgnepomoiadbmlbgbae</code></li>
              </ol>
            </div>
            <div className="flex gap-2">
              <a
                href={EXTENSION_ZIP_URL}
                download
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar extensión (.zip)
              </a>
              <a
                href={EXTENSION_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ver en GitHub
              </a>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-sm text-indigo-600 hover:underline font-medium"
            >
              Extensión instalada → Continuar al paso 2
            </button>
          </div>
        )}

        {/* ── Paso 2: Native Host ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Paso 2: Instala el Native Host en el PC de la caja</h4>
              <p className="text-sm text-gray-500">
                El Native Host es el puente entre la extensión y la impresora física. Se instala con un comando PowerShell.
              </p>
            </div>
            <div className="bg-gray-900 rounded-xl p-4">
              <p className="text-xs text-gray-400 mb-2 font-mono">PowerShell (Ejecutar como Administrador)</p>
              <code className="text-green-400 text-sm font-mono break-all">
                {`irm ${INSTALLER_URL} | iex`}
              </code>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>Ejecuta PowerShell <strong>como Administrador</strong> para que el registro del host se guarde correctamente.</span>
            </div>
            <a
              href={INSTALLER_URL}
              download="install-host.ps1"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Descargar install-host.ps1
            </a>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="text-sm text-gray-500 hover:underline">← Volver</button>
              <button onClick={() => setStep(3)} className="text-sm text-indigo-600 hover:underline font-medium">
                Native Host instalado → Continuar al paso 3
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 3: Configurar API Key ── */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Paso 3: Configura tu API Key</h4>
              <p className="text-sm text-gray-500">
                La extensión necesita tu API Key para autenticarse con el backend y recibir trabajos de impresión.
              </p>
            </div>

            {/* API Key del agente */}
            {firstAgent ? (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-indigo-900">Tu API Key ({firstAgent.name}):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800 truncate select-all">
                    {firstAgent.api_key}
                  </code>
                  <button
                    onClick={handleCopyApiKey}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                      copied
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>No hay agentes registrados. Crea uno en la sección <strong>Agentes BullWeb</strong> para obtener una API Key.</span>
              </div>
            )}

            {/* Instrucción de uso */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Cómo configurarla:</p>
              <ol className="space-y-1.5 list-decimal list-inside">
                <li>Haz clic en el <strong>ícono de la extensión</strong> en la barra de Chrome/Edge</li>
                <li>Pega la API Key en el campo <strong>"API Key"</strong></li>
                <li>Clic en <strong>Guardar</strong></li>
                <li>El estado debe cambiar a <strong className="text-emerald-700">✅ Conectado</strong></li>
              </ol>
            </div>

            {/* Placeholder ilustrativo */}
            <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center h-28 text-gray-400 text-sm">
              <div className="text-center">
                <Puzzle className="w-8 h-8 mx-auto mb-1 opacity-30" />
                <span>Popup de la extensión → campo API Key → Guardar</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="text-sm text-gray-500 hover:underline">← Volver</button>
              <button onClick={() => setStep(4)} className="text-sm text-indigo-600 hover:underline font-medium">
                API Key guardada → Continuar al paso 4
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 4: Verificar conexión ── */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">Paso 4: Verificar conexión</h4>
              <p className="text-sm text-gray-500">
                Recarga la página — si todo está correcto, aparecerá el badge verde con la API Key de tu agente.
              </p>
            </div>

            {/* Checklist final */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {[
                { label: 'Extensión cargada en Chrome/Edge (chrome://extensions)' },
                { label: 'Native Host registrado (install-host.ps1 ejecutado como Administrador)' },
                { label: 'API Key copiada y guardada en el popup de la extensión' },
                { label: 'Impresora agregada en BullWeb (/admin/printers)' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex items-center justify-center shrink-0">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                  </div>
                  <span className="text-gray-600">{item.label}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="text-sm text-gray-500 hover:underline">← Volver</button>
              <button
                onClick={() => window.location.reload()}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar página para detectar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Sección: Agentes BullWeb ─────────────────────────────────────────────────
function AgentsSection() {
  const qc = useQueryClient();
  const [showModal,  setShowModal]  = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [logsAgent,  setLogsAgent]  = useState<PrintAgent | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<{ id: string; name: string } | null>(null);

  const { data: agents = [], isLoading, refetch } = useQuery<PrintAgent[]>({
    queryKey: ['admin', 'agents'],
    queryFn:  () => adminService.listAgents(),
    refetchInterval: 15_000,
  });

  const { data: downloadInfo } = useQuery({
    queryKey: ['admin', 'agents', 'download'],
    queryFn:  () => adminService.getAgentDownloadInfo(),
  });

  const { data: release } = useQuery<AgentRelease | null>({
    queryKey: ['admin', 'agents', 'release'],
    queryFn:  () => adminService.getAgentRelease(),
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: (dto: { name: string }) => adminService.createAgent(dto),
    onSuccess: (agent) => {
      qc.invalidateQueries({ queryKey: ['admin', 'agents'] });
      setShowModal(false);
      setRevealedId(agent.id);
      toast.success('Agente creado — guardá la clave API');
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear agente'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deleteAgent(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin', 'agents'] }); toast.success('Agente eliminado'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const onlineCount = agents.filter(a => a.is_online).length;

  return (
    <div id="agent-section" className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Banner de descarga */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <Bot className="w-7 h-7" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold">BullWeb Print Agent</h3>
              <p className="text-sm text-blue-100 mt-0.5">
                Instalá el agente en las PCs con impresoras USB, Serial o de driver SO. Se conecta al servidor usando una clave API y procesa trabajos automáticamente.
              </p>

              {/* ── Instalación automática recomendada ── */}
              <div className="mt-3 bg-white/10 border border-white/20 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold leading-tight">
                    RECOMENDADO
                  </span>
                  <span className="text-sm font-semibold">Instalación automática</span>
                </div>
                <p className="text-blue-100 text-xs mb-2">
                  Abre <strong>PowerShell como Administrador</strong> y ejecuta:
                </p>
                <div className="bg-gray-900/80 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                  <code className="text-green-400 text-xs font-mono break-all leading-relaxed">
                    iwr -useb https://app.bullwebchile.com/install-agent.ps1 | iex
                  </code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('iwr -useb https://app.bullwebchile.com/install-agent.ps1 | iex');
                      toast.success('Comando copiado');
                    }}
                    title="Copiar comando"
                    className="text-gray-400 hover:text-white transition-colors shrink-0 p-1"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* ── Descarga manual por plataforma ── */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(downloadInfo?.platforms ?? [
                  { name: 'windows', label: 'Windows (exe)',   url: 'https://app.bullwebchile.com/releases/BullWebPrintAgent-win.exe', installer_url: 'https://app.bullwebchile.com/install-agent.bat' },
                  { name: 'linux',   label: 'Linux (x64)',     url: 'https://app.bullwebchile.com/releases/BullWebPrintAgent-linux' },
                  { name: 'macos',   label: 'macOS (x64)',     url: 'https://app.bullwebchile.com/releases/BullWebPrintAgent-macos' },
                ]).map((p: any) => (
                  <a key={p.name} href={p.installer_url ?? p.url} download
                    className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 border border-white/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors">
                    <Download className="w-3 h-3" /> {p.label}
                  </a>
                ))}
                {(release?.version ?? downloadInfo?.version) && (
                  <span className="flex items-center text-blue-200 text-xs px-2 opacity-70">
                    v{release?.version ?? downloadInfo?.version}
                  </span>
                )}
              </div>

              {/* ── Aviso SmartScreen (colapsable) ── */}
              <details className="mt-3 group">
                <summary className="text-xs text-yellow-200 cursor-pointer hover:text-white select-none flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                  ¿Aparece aviso de Windows? — Haz clic aquí
                </summary>
                <div className="mt-2 bg-yellow-500/20 border border-yellow-400/30 rounded-xl p-3 text-xs text-yellow-100">
                  <p className="font-semibold text-yellow-200 mb-1.5">Aviso de Windows SmartScreen</p>
                  <p className="mb-2 text-yellow-100/90">
                    Es normal — aparece porque el agente es software nuevo y aún no tiene suficientes
                    descargas para ser reconocido automáticamente. No indica ningún peligro.
                  </p>
                  <ol className="space-y-1 list-decimal list-inside text-yellow-200">
                    <li>Haz clic en <strong className="text-white">"Más información"</strong></li>
                    <li>Haz clic en <strong className="text-white">"Ejecutar de todas formas"</strong></li>
                  </ol>
                  <p className="mt-2 text-yellow-300/70">
                    El código fuente es público en GitHub y auditable por cualquier persona.
                  </p>
                </div>
              </details>


            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold">{onlineCount}</div>
            <div className="text-xs text-blue-200">{onlineCount === 1 ? 'agente' : 'agentes'} online</div>
          </div>
        </div>
      </div>

      {/* Encabezado tabla */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Bot className="w-4 h-4 text-gray-500" /> Agentes registrados
          {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
        </h4>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="p-1.5 rounded hover:bg-gray-100">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700">
            <Plus className="w-3.5 h-3.5" /> Nuevo agente
          </button>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="py-10 text-center text-gray-400 text-sm">
          <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>Sin agentes registrados</p>
          <p className="text-xs mt-1">Descargá el instalador y configuralo con una nueva clave API</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Estado</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Nombre</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Plataforma</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Versión</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">IP</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Últ. conexión</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Clave API</th>
              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {agents.map(a => {
              const latestVer = release?.version ?? null;
              const agentVer  = a.version ?? null;
              const vUpToDate = latestVer && agentVer && agentVer === latestVer;
              const vOutdated = latestVer && agentVer && agentVer !== latestVer;
              return (
              <tr key={a.id} className="hover:bg-gray-50">
                <td className="px-4 py-2.5">
                  {a.is_online
                    ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><Circle className="w-2 h-2 fill-green-500" /> Online</span>
                    : <span className="flex items-center gap-1 text-gray-400 text-xs"><Circle className="w-2 h-2 fill-gray-300" /> Offline</span>
                  }
                </td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{a.name}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{a.platform ?? '—'}</td>
                <td className="px-4 py-2.5">
                  {!agentVer ? (
                    <span className="text-xs text-gray-300">—</span>
                  ) : vUpToDate ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                      <CheckCircle2 className="w-3 h-3" /> v{agentVer}
                    </span>
                  ) : vOutdated ? (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium" title={`Versión publicada: v${latestVer}`}>
                      <ArrowUpCircle className="w-3 h-3" /> v{agentVer} → {latestVer}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">v{agentVer}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{a.ip_address ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs text-gray-400">
                  {a.last_seen_at
                    ? new Date(a.last_seen_at).toLocaleString('es-CL', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })
                    : 'Nunca'}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <code className="text-xs font-mono text-gray-500 bg-gray-100 rounded px-1 py-0.5">
                      {revealedId === a.id ? a.api_key : `${a.api_key.slice(0, 8)}••••••••`}
                    </code>
                    <button onClick={() => setRevealedId(revealedId === a.id ? null : a.id)}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      {revealedId === a.id ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(a.api_key); toast.success('Clave copiada'); }}
                      className="p-1 hover:bg-gray-100 rounded text-gray-400">
                      <Copy className="w-3 h-3" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right">
                  <button
                    onClick={() => setLogsAgent(a)}
                    title="Ver logs del agente"
                    className="p-1.5 rounded hover:bg-indigo-50 text-indigo-400 mr-1">
                    <ScrollText className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setAgentToDelete({ id: a.id, name: a.name })}
                    className="p-1.5 rounded hover:bg-red-50 text-red-400">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showModal && (
        <NewAgentModal
          onClose={() => setShowModal(false)}
          onSave={dto => createMut.mutate(dto)}
          saving={createMut.isPending}
        />
      )}

      {logsAgent && (
        <AgentLogsModal
          agent={logsAgent}
          onClose={() => setLogsAgent(null)}
        />
      )}

      {agentToDelete && (
        <ConfirmDialog
          isOpen={!!agentToDelete}
          onClose={() => setAgentToDelete(null)}
          onConfirm={() => { deleteMut.mutate(agentToDelete.id); setAgentToDelete(null); }}
          title="Eliminar agente"
          message={`¿Estás seguro de que deseas eliminar el agente "${agentToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteMut.isPending}
        />
      )}
    </div>
  );
}

// ─── Modal: Logs del Agente ───────────────────────────────────────────────────
function AgentLogsModal({ agent, onClose }: { agent: PrintAgent; onClose: () => void }) {
  const [filter, setFilter] = useState<'all' | 'error' | 'warn'>('all');

  const { data: logs = [], isLoading, refetch } = useQuery<AgentLog[]>({
    queryKey: ['admin', 'agents', agent.id, 'logs', filter],
    queryFn:  () => adminService.getAgentLogs(agent.id, 100, filter === 'all' ? undefined : filter),
    refetchInterval: 5_000,
  });

  const levelBadge = (level: string) => {
    if (level === 'error') return 'bg-red-100 text-red-600';
    if (level === 'warn')  return 'bg-amber-100 text-amber-600';
    if (level === 'info')  return 'bg-blue-100 text-blue-600';
    return 'bg-gray-100 text-gray-500';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-indigo-500" />
            <h3 className="font-semibold text-gray-900">Logs — {agent.name}</h3>
            {isLoading && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
            <span className={`w-2 h-2 rounded-full ml-1 ${agent.is_online ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-100 shrink-0">
          {(['all', 'error', 'warn'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {f === 'all' ? 'Todos' : f === 'error' ? 'Errores' : 'Warnings'}
            </button>
          ))}
          <button onClick={() => refetch()} className="ml-auto p-1 hover:bg-gray-100 rounded" title="Actualizar">
            <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
          </button>
          <span className="text-xs text-gray-400">Auto-refresh 5s</span>
        </div>

        {/* Lista de logs */}
        <div className="overflow-y-auto flex-1 font-mono text-xs">
          {logs.length === 0 ? (
            <div className="py-10 text-center text-gray-400">
              <ScrollText className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sin logs {filter !== 'all' ? `de nivel "${filter}"` : 'disponibles'}</p>
              <p className="text-xs mt-1">Los eventos aparecen aquí en tiempo real</p>
            </div>
          ) : (
            <table className="w-full">
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className={`border-b border-gray-50 hover:bg-gray-50 ${
                    log.level === 'error' ? 'bg-red-50/30' :
                    log.level === 'warn'  ? 'bg-amber-50/30' : ''
                  }`}>
                    <td className="px-3 py-1.5 whitespace-nowrap text-gray-400 w-24">
                      {new Date(log.logged_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap w-16">
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${levelBadge(log.level)}`}>
                        {log.level}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-gray-700 w-40">{log.event}</td>
                    <td className="px-2 py-1.5 text-gray-500 max-w-xs truncate">
                      {log.data ? JSON.stringify(log.data) : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-100 shrink-0 text-xs text-gray-400 text-center">
          {logs.length} evento{logs.length !== 1 ? 's' : ''} · actualización automática cada 5s
        </div>
      </div>
    </div>
  );
}

// ─── PrintersEmptyState ──────────────────────────────────────────────────────
function PrintersEmptyState({ onCreatePrinter }: { onCreatePrinter: () => void }) {
  const steps = [
    {
      n: '1',
      title: 'Instala el Agente BullWeb',
      desc: 'Descarga el instalador para Windows desde la sección «Agentes» de arriba y ejecútalo en la PC con la impresora conectada.',
      icon: <Download className="w-5 h-5 text-blue-500" />,
    },
    {
      n: '2',
      title: 'Agrega una impresora',
      desc: 'Haz clic en «Nueva impresora», completa los datos de conexión (IP, USB, Serial o Driver SO) y asígnale el agente que acabas de instalar.',
      icon: <Printer className="w-5 h-5 text-indigo-500" />,
    },
    {
      n: '3',
      title: 'Envía un test de impresión',
      desc: 'Con el agente online y la impresora configurada, haz clic en el botón «Test» para verificar que todo funciona correctamente.',
      icon: <PlayCircle className="w-5 h-5 text-emerald-500" />,
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-200 p-8 text-center space-y-6">
      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto">
        <Printer className="w-7 h-7 text-blue-500" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Configura tu primera impresora</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
          Aún no hay impresoras registradas. Sigue estos tres pasos para comenzar a imprimir recibos, comandas y etiquetas desde BullWeb.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
        {steps.map((step, idx) => (
          <div key={step.n} className="relative flex flex-col items-center text-center gap-2 p-4 bg-gray-50 rounded-xl">
            {idx < steps.length - 1 && (
              <ChevronRight className="hidden sm:block absolute -right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300 z-10" />
            )}
            <div className="w-9 h-9 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center">
              {step.icon}
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Paso {step.n}</span>
            <p className="text-sm font-semibold text-gray-700">{step.title}</p>
            <p className="text-xs text-gray-400 leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <button
          onClick={onCreatePrinter}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm">
          <Plus className="w-4 h-4" /> Nueva impresora
        </button>
        <button
          onClick={() => document.getElementById('agent-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors">
          <Download className="w-4 h-4" /> ↑ Ver instalador del agente
        </button>
      </div>
    </div>
  );
}

// ─── Modal: Asignar Agente ─────────────────────────────────────────────────
function AssignAgentModal({
  printer,
  agents,
  onClose,
  onAssigned,
}: {
  printer: PrinterType;
  agents: PrintAgent[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const [selectedId, setSelectedId] = useState(printer.agent_id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedId) return;
    setSaving(true);
    try {
      await adminService.updatePrinter(printer.id, { agent_id: selectedId });
      toast.success(`✅ Agente asignado correctamente a ${printer.name}`);
      onAssigned();
      onClose();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? 'Error al asignar agente');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-blue-600" />
            Asignar agente a {printer.name}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona el agente BullWeb instalado en la misma red que la impresora.
          </p>
          {agents.length === 0 ? (
            <div className="text-center py-6 text-gray-400 text-sm">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>Sin agentes registrados</p>
              <p className="text-xs mt-1">Descargá e instalá el Agente BullWeb primero</p>
            </div>
          ) : (
            <div className="space-y-2">
              {agents.map(a => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-colors ${
                    selectedId === a.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${a.is_online ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                    <p className="text-xs text-gray-400">
                      {a.is_online ? 'Online' : 'Offline'}
                      {a.ip_address ? ` · ${a.ip_address}` : ''}
                      {a.platform ? ` · ${a.platform}` : ''}
                    </p>
                  </div>
                  {selectedId === a.id && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!selectedId || saving || agents.length === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
            {saving ? 'Asignando...' : 'Asignar agente'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── JobHistoryPanel ─────────────────────────────────────────────────────────
function JobHistoryPanel({ printer, onClose }: { printer: PrinterType; onClose: () => void }) {
  const qc = useQueryClient();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: jobs = [], isLoading, refetch } = useQuery<PrintJobHistory[]>({
    queryKey: ['printer-jobs', printer.id],
    queryFn:  () => adminService.getPrinterJobHistory(printer.id, 50),
    refetchInterval: autoRefresh ? 5000 : false,
  });

  const hasPending = jobs.some(j => j.status === 'pending');
  // auto-habilitar refresh si hay jobs activos
  useEffect(() => { if (hasPending) setAutoRefresh(true); }, [hasPending]);

  const retryMut = useMutation({

    mutationFn: (id: string) => adminService.retryPrintJob(id),
    onSuccess:  () => { refetch(); toast.success('Job encolado de nuevo'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const cancelMut = useMutation({
    mutationFn: (id: string) => adminService.cancelPrintJob(id),
    onSuccess:  () => { refetch(); toast.success('Job cancelado'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const reprintMut = useMutation({
    mutationFn: (id: string) => adminService.reprintJobFromHistory(id, printer.id),
    onSuccess:  () => { refetch(); toast.success('Reimpresión encolada'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? e.message ?? 'Error al reimprimir'),
  });

  const cleanupMut = useMutation({
    mutationFn: () => adminService.cleanupPrintJobs(7),
    onSuccess:  (r) => {
      refetch();
      qc.invalidateQueries({ queryKey: ['admin', 'printers', 'health'] });
      toast.success(`${r.deleted} job(s) eliminados`);
    },
    onError: (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const pendingCount   = jobs.filter(j => j.status === 'pending').length;
  const failedCount    = jobs.filter(j => j.status === 'failed').length;
  const cancelledCount = jobs.filter(j => j.status === 'cancelled').length;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-white h-full overflow-y-auto shadow-xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <History className="w-4 h-4 text-purple-500" />
              Cola — {printer.name}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Últimos 50 trabajos · Auto-refresco cada 5s</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoRefresh(a => !a)}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors ${
                autoRefresh ? 'border-green-300 bg-green-50 text-green-700' : 'border-gray-200 text-gray-400'
              }`}
            >
              {autoRefresh ? '�?� Pausar' : '▶ Reanudar'}
            </button>
            <button onClick={() => refetch()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 bg-gray-50">
          {[
            { label: 'Pendientes', val: pendingCount,   color: 'text-yellow-600' },
            { label: 'Fallidos',   val: failedCount,    color: 'text-red-600' },
            { label: 'Cancelados', val: cancelledCount, color: 'text-gray-500' },
            { label: 'Total',      val: jobs.length,    color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="py-2.5 text-center">
              <p className={`text-lg font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Acciones masivas */}
        {(failedCount > 0 || cancelledCount > 0) && (
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex gap-2 flex-wrap">
            <button
              onClick={() => cleanupMut.mutate()}
              disabled={cleanupMut.isPending}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 border border-red-100 disabled:opacity-50">
              <Trash2 className="w-3 h-3" />
              Limpiar fallidos/cancelados (&gt;7d)
            </button>
          </div>
        )}

        {/* Lista de jobs */}
        <div className="flex-1 p-4 space-y-2">
          {isLoading && (
            <div className="flex justify-center py-10">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          )}
          {!isLoading && jobs.length === 0 && (
            <div className="text-center py-12 text-gray-400 text-sm">
              <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Sin trabajos de impresión registrados
            </div>
          )}
          {jobs.map(job => (
            <div key={job.id} className="border border-gray-100 rounded-xl p-3 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    job.status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                    job.status === 'printed'   ? 'bg-green-100  text-green-700'  :
                    job.status === 'sent'      ? 'bg-blue-100   text-blue-700'   :
                    job.status === 'failed'    ? 'bg-red-100    text-red-700'    :
                    job.status === 'cancelled' ? 'bg-gray-100   text-gray-500'   :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {job.status === 'pending'   ? '�?� Pendiente' :
                     job.status === 'printed'   ? '✅ Impreso'   :
                     job.status === 'sent'      ? '📤 Enviado'   :
                     job.status === 'failed'    ? '�?� Fallido'   :
                     job.status === 'cancelled' ? '⚫ Cancelado' :
                     job.status}
                  </span>
                  {job.order_number && (
                    <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">
                      #{job.order_number}
                    </span>
                  )}
                  {job.trigger_type && (
                    <span className="text-xs text-gray-400 capitalize">
                      {job.trigger_type === 'kitchen'  ? '�?� Comanda'     :
                       job.trigger_type === 'receipt'  ? '🧾 Recibo'      :
                       job.trigger_type === 'reprint'  ? '↩ Reimpresión'  :
                       job.trigger_type === 'test'     ? '🔧 Test'        :
                       job.trigger_type}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {job.status === 'failed' && (
                    <button
                      onClick={() => retryMut.mutate(job.id)}
                      disabled={retryMut.isPending}
                      title="Reintentar"
                      className="p-1 rounded hover:bg-blue-50 text-blue-500 disabled:opacity-40">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {job.status === 'printed' && job.order_number && (
                    <button
                      onClick={() => reprintMut.mutate(job.id)}
                      disabled={reprintMut.isPending}
                      title="Reimprimir"
                      className="p-1 rounded hover:bg-indigo-50 text-indigo-500 disabled:opacity-40">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {job.status === 'pending' && (
                    <button
                      onClick={() => cancelMut.mutate(job.id)}
                      disabled={cancelMut.isPending}
                      title="Cancelar"
                      className="p-1 rounded hover:bg-red-50 text-red-400 disabled:opacity-40">
                      <Ban className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(job.created_at).toLocaleString('es-CL', {
                    day: '2-digit', month: '2-digit',
                    hour: '2-digit', minute: '2-digit', second: '2-digit',
                  })}
                </span>
                {job.attempts > 0 && <span>· {job.attempts} intento(s)</span>}
                {job.printed_at && (
                  <span className="text-green-600">
                    · Impreso {new Date(job.printed_at).toLocaleString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                )}
              </div>
              {job.error_msg && (
                <p className="text-xs text-red-500 mt-1.5 bg-red-50 rounded px-2 py-1 font-mono break-all">
                  {job.error_msg}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SortablePrinterRow (Mejora #7 — Drag & Drop) ────────────────────────────
function SortablePrinterRow({
  id, children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform:  CSS.Transform.toString(transform),
        transition,
        opacity:    isDragging ? 0.5 : 1,
        zIndex:     isDragging ? 10 : undefined,
      }}
      className="hover:bg-gray-50 transition-colors"
    >
      <td className="w-8 px-2 py-3">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-gray-300 hover:text-gray-500"
          title="Arrastrar para reordenar"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      {children}
    </tr>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export default function PrintersPage() {
  const qc = useQueryClient();
  const [modal,           setModal]           = useState<'create' | 'edit' | null>(null);
  const [selected,        setSelected]        = useState<PrinterType | null>(null);
  const [filterType,      setFilterType]      = useState('');
  const [filterBranch,    setFilterBranch]    = useState('');
  const [historyPrinter,  setHistoryPrinter]  = useState<PrinterType | null>(null);
  const [statsModalPrinter, setStatsModalPrinter] = useState<PrinterType | null>(null);
  const [assignPrinter,   setAssignPrinter]   = useState<PrinterType | null>(null);
  const [printerToDelete, setPrinterToDelete] = useState<PrinterType | null>(null);
  const [showFailedJobs,      setShowFailedJobs]      = useState(false);
  const [failedJobsPrinterId, setFailedJobsPrinterId] = useState<string | undefined>(undefined);
  const [failedJobs,      setFailedJobs]      = useState<any[]>([]);

  // Estado del test: idle | sending | waiting | success | error
  const [testState, setTestState]     = useState<Record<string, 'idle' | 'sending' | 'waiting' | 'success' | 'error'>>({});
  const [testMsg,   setTestMsg]       = useState<Record<string, string>>({});
  const [testDuration, setTestDuration] = useState<Record<string, number>>({});

  // DnD local state
  const [localPrinters, setLocalPrinters] = useState<PrinterType[]>([]);

  const sensors = useSensors(useSensor(PointerSensor));

  const { data: printers = [], isLoading, refetch } = useQuery<PrinterType[]>({
    queryKey: ['admin', 'printers'],
    queryFn:  () => adminService.listPrinters(),
    refetchInterval: 30_000,
  });

  // Sync DnD local state with query
  useEffect(() => { setLocalPrinters(printers); }, [printers]);

  // Auto-reset test state después de 3s
  useEffect(() => {
    const ids = Object.entries(testState)
      .filter(([, v]) => v === 'success' || v === 'error')
      .map(([k]) => k);
    if (ids.length === 0) return;
    const timer = setTimeout(() => {
      setTestState(prev => {
        const next = { ...prev };
        ids.forEach(id => { next[id] = 'idle'; });
        return next;
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, [testState]);

  // Cargar jobs fallidos al montar
  useEffect(() => {
    adminService.getFailedJobs()
      .then(jobs => setFailedJobs(jobs ?? []))
      .catch(e => console.warn('[PrintersPage] error cargando jobs fallidos', e));
  }, []);

  // Conteo por impresora
  const printerFailedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of failedJobs) {
      counts[job.printer_id] = (counts[job.printer_id] ?? 0) + 1;
    }
    return counts;
  }, [failedJobs]);

  const { data: stats } = useQuery({
    queryKey: ['admin', 'printers', 'stats'],
    queryFn:  () => adminService.getPrinterStats(),
  });

  const { data: health } = useQuery<PrintersHealth>({
    queryKey: ['admin', 'printers', 'health'],
    queryFn:  () => adminService.getPrintersHealth(),
    refetchInterval: 15_000,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ['admin', 'branches'],
    queryFn:  () => adminService.listBranches(),
  });

  const { data: agents = [] } = useQuery<PrintAgent[]>({
    queryKey: ['admin', 'agents'],
    queryFn:  () => adminService.listAgents(),
  });

  const createMut = useMutation({
    mutationFn: (dto: Partial<PrinterType>) => adminService.createPrinter(dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin','printers'] }); setModal(null); toast.success('Impresora creada'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error al crear'),
  });

  const updateMut = useMutation({
    mutationFn: (dto: Partial<PrinterType>) => adminService.updatePrinter(selected!.id, dto),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin','printers'] }); setModal(null); toast.success('Impresora actualizada'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error al actualizar'),
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => adminService.togglePrinter(id),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['admin','printers'] }),
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error'),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminService.deletePrinter(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['admin','printers'] }); toast.success('Impresora eliminada'); },
    onError:    (e: any) => toast.error(e.response?.data?.error ?? 'Error al eliminar'),
  });

  const handleTest = async (p: PrinterType) => {
    if (!p.agent_id) {
      toast.error('�?� Sin agente asignado: asigna uno antes de enviar el test');
      setAssignPrinter(p);
      return;
    }
    const start = Date.now();
    setTestState(s => ({ ...s, [p.id]: 'sending' }));
    setTestMsg(m => ({ ...m, [p.id]: '' }));
    try {
      // 1. Crear el job de test (via submitJob que ya valida agent_id)
      const result = await adminService.submitTestJob(p.agent_id, p.id);
      const jobId: string | undefined = result?.data?.id ?? result?.id ?? result?.job_id;

      if (jobId) {
        toast('🖨�? Job de prueba enviado — esperando respuesta...', { duration: 2000 });
        setTestState(s => ({ ...s, [p.id]: 'waiting' }));

        // 2. Polling: cada 800ms, timeout 45s (Driver SO puede tardar más por Windows)
        const deadline = Date.now() + 45_000;
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 800));
          const job = await adminService.getJobStatus(jobId);
          if (job.status === 'printed' || job.status === 'sent') {
            const ms = Date.now() - start;
            setTestDuration(d => ({ ...d, [p.id]: ms }));
            setTestState(s => ({ ...s, [p.id]: 'success' }));
            setTestMsg(m => ({ ...m, [p.id]: `Impreso en ${(ms / 1000).toFixed(1)}s` }));
            toast.success(`✅ Test exitoso en ${(ms / 1000).toFixed(1)}s`);
            qc.invalidateQueries({ queryKey: ['admin', 'printers'] });
            setTimeout(() => setTestState(s => ({ ...s, [p.id]: 'idle' })), 4000);
            return;
          }
          if (job.status === 'failed' || job.status === 'cancelled') {
            const errMsg = job.error_msg ?? 'El agente no pudo imprimir. Verifica que la impresora esté encendida y el nombre del driver sea correcto.';
            throw new Error(errMsg);
          }
        }
        throw new Error(
          p.connection_type === 'os_driver'
            ? 'Timeout — el agente no respondió. Verifica que el nombre del driver SO sea correcto y que la impresora esté encendida.'
            : 'Timeout — el agente no respondió en 45s'
        );
      } else {
        // Impresora con IP pública — test directo TCP
        const secs = ((Date.now() - start) / 1000).toFixed(1);
        setTestState(s => ({ ...s, [p.id]: 'success' }));
        setTestMsg(m => ({ ...m, [p.id]: `OK en ${secs}s` }));
        toast.success(`✅ Test enviado directamente en ${secs}s`);
        setTimeout(() => setTestState(s => ({ ...s, [p.id]: 'idle' })), 4000);
        qc.invalidateQueries({ queryKey: ['admin', 'printers'] });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error ?? e?.message ?? 'Error al enviar test';
      setTestState(s => ({ ...s, [p.id]: 'error' }));
      setTestMsg(m => ({ ...m, [p.id]: msg }));
      toast.error(`�?� ${msg}`);
      setTimeout(() => setTestState(s => ({ ...s, [p.id]: 'idle' })), 5000);
    }
  };

  const filtered = localPrinters.filter(p =>
    (!filterType   || p.type      === filterType) &&
    (!filterBranch || p.branch_id === filterBranch)
  );

  // ─── Mejora #2: Duplicar impresora ──────────────────────────────────────────
  const handleDuplicatePrinter = async (printer: PrinterType) => {
    try {
      const payload: Partial<PrinterType> = {
        branch_id:       printer.branch_id,
        name:            `${printer.name} (Copia)`,
        type:            printer.type,
        connection_type: printer.connection_type,
        agent_id:        printer.agent_id,
        ip_address:      printer.ip_address,
        port:            printer.port,
        protocol:        printer.protocol,
        paper_width:     printer.paper_width,
        notes:           printer.notes,
        usb_vendor_id:   printer.usb_vendor_id,
        usb_product_id:  printer.usb_product_id,
        serial_port:     printer.serial_port,
        serial_baud:     printer.serial_baud,
        os_printer_name: printer.os_printer_name,
        print_qr:        printer.print_qr,
        qr_type:         printer.qr_type,
        qr_custom_url:   printer.qr_custom_url,
      };
      await adminService.createPrinter(payload);
      toast.success(`"${printer.name}" duplicada correctamente`);
      qc.invalidateQueries({ queryKey: ['admin', 'printers'] });
    } catch {
      toast.error('Error al duplicar la impresora');
    }
  };

  // ─── Mejora #3: Exportar JSON ────────────────────────────────────────────────
  const handleExportJSON = () => {
    const exportData = {
      exported_at: new Date().toISOString(),
      total:       printers.length,
      printers:    printers.map(p => ({
        name:            p.name,
        type:            p.type,
        connection_type: p.connection_type,
        ip_address:      p.ip_address,
        port:            p.port,
        protocol:        p.protocol,
        paper_width:     p.paper_width,
        notes:           p.notes,
        usb_vendor_id:   p.usb_vendor_id,
        usb_product_id:  p.usb_product_id,
        serial_port:     p.serial_port,
        serial_baud:     p.serial_baud,
        os_printer_name: p.os_printer_name,
        print_qr:        p.print_qr,
        qr_type:         p.qr_type,
        qr_custom_url:   p.qr_custom_url,
      })),
    };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = `printers-config-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Configuración exportada');
  };

  // ─── Mejora #6: Toggle mantenimiento ────────────────────────────────────────
  const handleToggleMaintenance = async (printer: PrinterType, enabled: boolean) => {
    try {
      await adminService.toggleMaintenanceMode(printer.id, enabled);
      const label = enabled ? 'en mantenimiento' : 'activa';
      toast.success(`"${printer.name}" marcada como ${label}`);
      qc.invalidateQueries({ queryKey: ['admin', 'printers'] });
    } catch {
      toast.error('Error al cambiar el modo de mantenimiento');
    }
  };

  // ─── Mejora #7: Drag & drop ──────────────────────────────────────────────────
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = localPrinters.findIndex(p => p.id === active.id);
    const newIndex = localPrinters.findIndex(p => p.id === over.id);
    const reordered = arrayMove(localPrinters, oldIndex, newIndex);
    setLocalPrinters(reordered);
    try {
      await adminService.reorderPrinters(
        reordered.map((p, i) => ({ id: p.id, sort_order: i }))
      );
    } catch {
      setLocalPrinters(printers);
      toast.error('Error al guardar el orden');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Printer className="w-6 h-6 text-gray-700" /> Impresoras
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestión de impresoras térmicas y de etiquetas por sucursal</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { refetch(); qc.invalidateQueries({ queryKey: ['admin','printers','health'] }); }} disabled={isLoading}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportJSON}
            title="Exportar configuración de impresoras"
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600
                       hover:border-gray-300 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar JSON
          </button>
          <button
            onClick={() => { setFailedJobsPrinterId(undefined); setShowFailedJobs(true); }}
            className="relative flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600
                       hover:border-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl text-sm
                       font-medium transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            Cola fallida
            {failedJobs.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-xs font-bold
                               w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                {failedJobs.length > 99 ? '99+' : failedJobs.length}
              </span>
            )}
          </button>
          <button onClick={() => { setSelected(null); setModal('create'); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus className="w-4 h-4" /> Nueva impresora
          </button>
        </div>
      </div>

      {/* Health Alerts Banner */}
      {health && health.alerts.length > 0 && (
        <div className="space-y-2">
          {health.alerts.map((alert, i) => {
            // Buscar impresora que tenga este nombre para ofrecer acción directa
            const alertPrinter = alert.message === 'Sin agente asignado'
              ? printers.find(p => p.name === alert.printer && !p.agent_id)
              : undefined;
            return (
              <div key={i} className={`flex items-center justify-between gap-3 px-4 py-3 rounded-xl border text-sm ${
                alert.level === 'error'
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-amber-50 border-amber-200 text-amber-800'
              }`}>
                <div className="flex items-start gap-3 flex-1">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>{alert.printer}:</strong> {alert.message}
                  </span>
                </div>
                {alertPrinter && (
                  <button
                    onClick={() => setAssignPrinter(alertPrinter)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs rounded-lg hover:bg-red-700 shrink-0 font-medium"
                  >
                    <UserPlus className="w-3 h-3" /> Asignar agente →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Health Stats rápidas */}
      {health && (
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {[
            { label: 'Impresoras',     val: health.total_printers,         color: 'text-gray-900' },
            { label: 'Activas',        val: health.active_printers,        color: 'text-green-600' },
            { label: 'Con agente',     val: health.printers_with_agent,    color: 'text-blue-600' },
            { label: 'Sin agente',     val: health.printers_without_agent, color: health.printers_without_agent > 0 ? 'text-red-600' : 'text-gray-400' },
            { label: 'Agentes online', val: health.agents_online,          color: 'text-green-600' },
            { label: 'Offline',        val: health.agents_offline,         color: health.agents_offline > 0 ? 'text-amber-600' : 'text-gray-400' },
            { label: 'Jobs pendientes',val: health.pending_jobs,           color: health.pending_jobs > 0 ? 'text-yellow-600' : 'text-gray-400' },
            { label: 'Jobs fallidos',  val: health.failed_jobs,            color: health.failed_jobs > 0 ? 'text-red-600' : 'text-gray-400' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sección Extensión Chrome/Edge */}
      <ExtensionSection />

      {/* Sección Agentes BullWeb */}
      <AgentsSection />

      {/* Notificaciones push */}
      <NotificationSettingsPanel />

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total impresoras</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
            <p className="text-xs text-gray-500 mt-0.5">Activas</p>
          </div>
          {(stats.by_type ?? []).slice(0, 2).map(t => (
            <div key={t.type} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{t.count}</p>
              <p className="text-xs text-gray-500 mt-0.5">{TYPE_LABEL[t.type] ?? t.type}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtros — solo si hay impresoras */}
      {printers.length > 0 && (
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 flex-wrap items-center">
        <select value={filterType} onChange={e => setFilterType(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {PRINTER_TYPES.map(t => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
        </select>
        {(branches as Branch[]).length > 1 && (
          <select value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm">
            <option value="">Todas las sucursales</option>
            {(branches as Branch[]).map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <span className="text-sm text-gray-400 flex items-center">
          {filtered.length} impresora{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>
      )}

      {/* Tabla impresoras — o empty state si no hay ninguna */}
      {!isLoading && printers.length === 0 ? (
        <PrintersEmptyState onCreatePrinter={() => { setSelected(null); setModal('create'); }} />
      ) : (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="w-8 px-2 py-3" />
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Tipo</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Conexión</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Destino</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Sucursal</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">Última impresión</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-600">Acciones</th>
            </tr>
          </thead>
          <SortableContext items={localPrinters.map(p => p.id)} strategy={verticalListSortingStrategy}>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-gray-400">
                  <Printer className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Sin impresoras configuradas</p>
                </td>
              </tr>
            )}
            {filtered.map(p => {
              const connType = p.connection_type ?? 'ethernet';
              const destino =
                connType === 'ethernet'  ? (p.ip_address ? `${p.ip_address}:${p.port}` : '—') :
                connType === 'usb'       ? (p.usb_vendor_id ? `${p.usb_vendor_id}/${p.usb_product_id}` : '—') :
                connType === 'serial'    ? (p.serial_port ? `${p.serial_port} @ ${p.serial_baud}` : '—') :
                                           (p.os_printer_name ?? '—');
              const ts = testState[p.id] ?? 'idle';
              const noAgent = !p.agent_id;
              const failedCount = printerFailedCounts[p.id] ?? 0;
              return (
                <SortablePrinterRow key={p.id} id={p.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <div className="flex flex-col gap-0.5">
                      <span>{p.name}</span>
                      {p.maintenance_mode && (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700
                                         text-xs font-semibold px-2 py-0.5 rounded-full w-fit">
                          <Wrench className="w-2.5 h-2.5" /> Mantenimiento
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${TYPE_COLOR[p.type] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TYPE_LABEL[p.type] ?? p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${CONN_COLOR[connType] ?? 'bg-gray-100 text-gray-600'}`}>
                      {CONN_LABEL[connType] ?? connType}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{destino}</td>
                  <td className="px-4 py-3 text-gray-600">{p.branch_name ?? <span className="text-gray-400">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {p.is_active
                        ? <span className="flex items-center gap-1 text-green-600 text-xs font-medium"><Wifi   className="w-3.5 h-3.5" /> Activa</span>
                        : <span className="flex items-center gap-1 text-gray-400 text-xs">      <WifiOff className="w-3.5 h-3.5" /> Inactiva</span>
                      }
                      {noAgent ? (
                        <button
                          onClick={() => setAssignPrinter(p)}
                          className="flex items-center gap-1 text-amber-600 text-xs hover:text-amber-700 hover:underline text-left"
                          title="Asignar agente ahora"
                        >
                          <AlertTriangle className="w-3 h-3" /> Sin agente — asignar →
                        </button>
                      ) : (
                        <span className={`flex items-center gap-1 text-xs ${
                          agents.find(a => a.id === p.agent_id)?.is_online
                            ? 'text-emerald-500' : 'text-gray-400'
                        }`}>
                          <Zap className="w-3 h-3" />
                          {agents.find(a => a.id === p.agent_id)?.is_online ? 'Agente online' : 'Agente offline'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {p.last_printed_at
                      ? <span title={new Date(p.last_printed_at).toLocaleString('es-CL')}>{timeAgo(p.last_printed_at)}</span>
                      : <span className="text-gray-300">Nunca</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {/* Test */}
                      <button
                        onClick={() => handleTest(p)}
                        disabled={ts === 'sending' || ts === 'waiting'}
                        title={
                          ts === 'sending' ? 'Enviando...' :
                          ts === 'waiting' ? 'Esperando impresora...' :
                          ts === 'success' ? (testMsg[p.id] ?? 'Exitoso') :
                          ts === 'error'   ? (testMsg[p.id] ?? 'Error') :
                          'Test de impresión'
                        }
                        className={`p-1.5 rounded-lg transition-colors ${
                          ts === 'success' ? 'text-green-600 bg-green-50' :
                          ts === 'error'   ? 'text-red-500 bg-red-50'    :
                          'hover:bg-blue-50 text-blue-500'
                        } disabled:opacity-30`}
                      >
                        {(ts === 'sending' || ts === 'waiting')
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : ts === 'success'
                            ? <CheckCircle className="w-4 h-4" />
                            : ts === 'error'
                              ? <XCircle className="w-4 h-4" />
                              : <Printer className="w-4 h-4" />}
                      </button>
                      {/* Cola fallida por impresora */}
                      {failedCount > 0 && (
                        <button
                          onClick={() => { setFailedJobsPrinterId(p.id); setShowFailedJobs(true); }}
                          title={`${failedCount} tickets fallidos`}
                          className="relative p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <AlertCircle className="w-4 h-4" />
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold
                                           w-3.5 h-3.5 rounded-full flex items-center justify-center leading-none">
                            {failedCount}
                          </span>
                        </button>
                      )}
                      {/* Historial jobs */}
                      <button
                        onClick={() => setHistoryPrinter(p)}
                        title="Ver historial de trabajos"
                        className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500">
                        <History className="w-4 h-4" />
                      </button>
                      {/* Historial 30 días */}
                      <button
                        onClick={() => setStatsModalPrinter(p)}
                        title="Ver estadísticas (30 días)"
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      {/* Duplicar */}
                      <button
                        onClick={() => handleDuplicatePrinter(p)}
                        title="Duplicar configuración"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors">
                        <Copy className="w-4 h-4" />
                      </button>
                      {/* Mantenimiento */}
                      <button
                        onClick={() => handleToggleMaintenance(p, !p.maintenance_mode)}
                        title={p.maintenance_mode ? 'Quitar modo mantenimiento' : 'Poner en mantenimiento'}
                        className={`p-1.5 rounded-lg transition-colors ${
                          p.maintenance_mode
                            ? 'text-amber-500 bg-amber-50 hover:bg-amber-100'
                            : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'
                        }`}>
                        <Wrench className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => toggleMut.mutate(p.id)}
                        title={p.is_active ? 'Desactivar' : 'Activar'}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                        {p.is_active
                          ? <ToggleRight className="w-4 h-4 text-green-500" />
                          : <ToggleLeft  className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => { setSelected(p); setModal('edit'); }}
                        title="Editar"
                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-500">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setPrinterToDelete(p)}
                        title="Eliminar"
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </SortablePrinterRow>
              );
            })}
          </tbody>
          </SortableContext>
        </table>
      </div>
      </DndContext>
      )}

      {/* Enrutamiento por categoría */}
      {(branches as Branch[]).length > 1 && !filterBranch ? (
        <p className="text-sm text-gray-400 text-center py-2">
          Filtra por sucursal para ver las reglas de enrutamiento por categoría
        </p>
      ) : (branches as Branch[]).length > 0 ? (
        <PrinterRoutingManager
          branchId={filterBranch || (branches as Branch[])[0]!.id}
          printers={printers}
          branches={branches as Branch[]}
        />
      ) : null}

      {modal && (
        <PrinterModal
          printer={modal === 'edit' ? selected : null}
          branches={branches as Branch[]}
          agents={agents}
          onClose={() => setModal(null)}
          onSave={dto => modal === 'edit' ? updateMut.mutate(dto) : createMut.mutate(dto)}
          saving={createMut.isPending || updateMut.isPending}
        />
      )}

      {historyPrinter && (
        <JobHistoryPanel
          printer={historyPrinter}
          onClose={() => setHistoryPrinter(null)}
        />
      )}

      {statsModalPrinter && (
        <PrinterHistoryModal
          printer={statsModalPrinter}
          onClose={() => setStatsModalPrinter(null)}
        />
      )}

      {showFailedJobs && (
        <FailedJobsPanel
          printerId={failedJobsPrinterId}
          onClose={() => {
            setShowFailedJobs(false);
            adminService.getFailedJobs()
              .then(jobs => setFailedJobs(jobs ?? []))
              .catch(() => {});
          }}
        />
      )}

      {assignPrinter && (
        <AssignAgentModal
          printer={assignPrinter}
          agents={agents}
          onClose={() => setAssignPrinter(null)}
          onAssigned={() => {
            qc.invalidateQueries({ queryKey: ['admin', 'printers'] });
            qc.invalidateQueries({ queryKey: ['admin', 'printers', 'health'] });
          }}
        />
      )}

      {printerToDelete && (
        <ConfirmDialog
          isOpen={!!printerToDelete}
          onClose={() => setPrinterToDelete(null)}
          onConfirm={() => { deleteMut.mutate(printerToDelete.id); setPrinterToDelete(null); }}
          title="Eliminar impresora"
          message={`¿Estás seguro de que deseas eliminar la impresora "${printerToDelete.name}"? Esta acción no se puede deshacer.`}
          confirmText="Eliminar"
          variant="danger"
          isLoading={deleteMut.isPending}
        />
      )}
    </div>
  );
}
