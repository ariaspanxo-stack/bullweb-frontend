import { useState, useRef } from 'react';
import {
  Terminal, Copy, ChevronDown, ChevronRight, Send,
  CheckCircle, Search, BookOpen, Code2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/services/api';

// ─── Definición de todos los endpoints admin ──────────────────────────────────
const ENDPOINTS = [
  // Users
  { group: 'Usuarios', method: 'GET',    path: '/admin/users',               desc: 'Listar usuarios' },
  { group: 'Usuarios', method: 'GET',    path: '/admin/users/:id',            desc: 'Obtener usuario' },
  { group: 'Usuarios', method: 'POST',   path: '/admin/users',               desc: 'Crear usuario', body: '{"name":"","email":"","role":"waiter","password":""}' },
  { group: 'Usuarios', method: 'PATCH',  path: '/admin/users/:id',            desc: 'Actualizar usuario', body: '{"name":"","role":""}' },
  { group: 'Usuarios', method: 'POST',   path: '/admin/users/bulk-action',    desc: 'Acción masiva', body: '{"action":"activate","ids":[]}' },
  // Roles
  { group: 'Roles',    method: 'GET',    path: '/admin/roles',               desc: 'Listar roles' },
  { group: 'Roles',    method: 'POST',   path: '/admin/roles',               desc: 'Crear rol', body: '{"name":"","description":"","permissions":{}}' },
  { group: 'Roles',    method: 'PATCH',  path: '/admin/roles/:id/matrix',    desc: 'Actualizar permisos', body: '{"permissions":{}}' },
  // Branches
  { group: 'Sucursales', method: 'GET',  path: '/admin/branches',            desc: 'Listar sucursales' },
  { group: 'Sucursales', method: 'POST', path: '/admin/branches',            desc: 'Crear sucursal', body: '{"name":"","address":"","city":"","phone":""}' },
  { group: 'Sucursales', method: 'PATCH',path: '/admin/branches/:id',        desc: 'Actualizar sucursal' },
  { group: 'Sucursales', method: 'PATCH',path: '/admin/branches/:id/toggle', desc: 'Activar/desactivar' },
  // Settings
  { group: 'Configuración', method: 'GET',   path: '/admin/settings',        desc: 'Obtener configuración' },
  { group: 'Configuración', method: 'PATCH', path: '/admin/settings',        desc: 'Actualizar configuración', body: '{"settings":[{"key":"","value":""}]}' },
  // Health
  { group: 'Sistema',  method: 'GET',    path: '/admin/health',              desc: 'Estado del sistema' },
  { group: 'Sistema',  method: 'GET',    path: '/admin/analytics',           desc: 'Reporte analítico' },
  { group: 'Sistema',  method: 'GET',    path: '/admin/maintenance',         desc: 'Estado mantenimiento' },
  { group: 'Sistema',  method: 'POST',   path: '/admin/maintenance',         desc: 'Toggle mantenimiento', body: '{}' },
  // Audit
  { group: 'Auditoría', method: 'GET',   path: '/admin/audit',               desc: 'Listar logs de auditoría' },
  { group: 'Auditoría', method: 'GET',   path: '/admin/audit/stats',         desc: 'Estadísticas de auditoría' },
  { group: 'Auditoría', method: 'GET',   path: '/admin/audit/export',        desc: 'Exportar CSV' },
  // Alerts
  { group: 'Alertas',  method: 'GET',    path: '/admin/alerts',              desc: 'Listar alertas' },
  { group: 'Alertas',  method: 'GET',    path: '/admin/alerts/count',        desc: 'Contar alertas activas' },
  { group: 'Alertas',  method: 'PATCH',  path: '/admin/alerts/:id/resolve',  desc: 'Resolver alerta' },
  { group: 'Alertas',  method: 'POST',   path: '/admin/alerts/resolve-all',  desc: 'Resolver todas' },
  // Security
  { group: 'Seguridad', method: 'GET',   path: '/admin/security-policy',     desc: 'Obtener política de seguridad' },
  { group: 'Seguridad', method: 'PATCH', path: '/admin/security-policy',     desc: 'Actualizar política', body: '{}' },
  { group: 'Seguridad', method: 'GET',   path: '/admin/ip-blocklist',        desc: 'Lista de IPs bloqueadas' },
  { group: 'Seguridad', method: 'POST',  path: '/admin/ip-blocklist',        desc: 'Bloquear IP', body: '{"ip":"","reason":""}' },
  { group: 'Seguridad', method: 'GET',   path: '/admin/rate-limiter/stats',  desc: 'Stats rate limiter' },
  { group: 'Seguridad', method: 'GET',   path: '/admin/rate-limiter/rules',  desc: 'Reglas rate limiter' },
  // Devices
  { group: 'Dispositivos', method: 'GET',  path: '/admin/devices',           desc: 'Listar dispositivos' },
  { group: 'Dispositivos', method: 'POST', path: '/admin/devices',           desc: 'Registrar dispositivo', body: '{"name":"","type":"pos","branch_id":""}' },
  { group: 'Dispositivos', method: 'PATCH',path: '/admin/devices/:id/toggle',desc: 'Activar/desactivar' },
  // API Keys
  { group: 'API Keys', method: 'GET',    path: '/admin/keys',                desc: 'Listar API Keys' },
  { group: 'API Keys', method: 'POST',   path: '/admin/keys',                desc: 'Crear API Key', body: '{"name":"","scopes":["read"],"expires_at":null}' },
  { group: 'API Keys', method: 'DELETE', path: '/admin/keys/:id',            desc: 'Revocar API Key' },
  // Webhooks
  { group: 'Webhooks', method: 'GET',    path: '/admin/webhooks',            desc: 'Listar webhooks' },
  { group: 'Webhooks', method: 'POST',   path: '/admin/webhooks',            desc: 'Crear webhook', body: '{"url":"","events":[],"is_active":true}' },
  { group: 'Webhooks', method: 'POST',   path: '/admin/webhooks/:id/test',   desc: 'Enviar test' },
  // Email
  { group: 'Email',    method: 'GET',    path: '/admin/email/config',        desc: 'Configuración SMTP' },
  { group: 'Email',    method: 'POST',   path: '/admin/email/config',        desc: 'Guardar SMTP', body: '{"host":"","port":587,"user":"","pass":"","from":""}' },
  { group: 'Email',    method: 'POST',   path: '/admin/email/test-smtp',     desc: 'Test SMTP' },
  { group: 'Email',    method: 'GET',    path: '/admin/email/templates',     desc: 'Listar plantillas' },
  // Backup
  { group: 'Backup',   method: 'GET',    path: '/admin/backup',              desc: 'Listar backups' },
  { group: 'Backup',   method: 'POST',   path: '/admin/backup',              desc: 'Crear backup' },
  // Scheduler
  { group: 'Scheduler', method: 'GET',   path: '/admin/scheduler',           desc: 'Listar tareas' },
  { group: 'Scheduler', method: 'POST',  path: '/admin/scheduler/:id/run',   desc: 'Ejecutar tarea ahora' },
  // Integrations
  { group: 'Integraciones', method: 'GET',  path: '/admin/integrations',     desc: 'Listar canales' },
  { group: 'Integraciones', method: 'GET',  path: '/admin/integrations/meta',desc: 'Meta tipos de integración' },
  { group: 'Integraciones', method: 'POST', path: '/admin/integrations/:id/test', desc: 'Test canal' },
  // License
  { group: 'Licencias', method: 'GET',   path: '/admin/license/plans',       desc: 'Listar planes' },
  { group: 'Licencias', method: 'GET',   path: '/admin/license/subscriptions/current', desc: 'Suscripción actual' },
  { group: 'Licencias', method: 'POST',  path: '/admin/license/subscriptions/activate', desc: 'Activar plan', body: '{"plan_id":""}' },
  // Reports
  { group: 'Reportes',  method: 'GET',   path: '/admin/reports/meta',        desc: 'Módulos disponibles' },
  { group: 'Reportes',  method: 'POST',  path: '/admin/reports/execute',     desc: 'Ejecutar reporte', body: '{"module":"orders","columns":["id","total"],"filters":{}}' },
  { group: 'Reportes',  method: 'GET',   path: '/admin/reports/templates',   desc: 'Listar plantillas' },
  // Data Import
  { group: 'Importación', method: 'GET',  path: '/admin/import/meta',        desc: 'Módulos de importación' },
  { group: 'Importación', method: 'POST', path: '/admin/import/validate',    desc: 'Validar CSV', body: '{"module":"customers","headers":[],"rows":[],"column_map":{}}' },
  { group: 'Importación', method: 'GET',  path: '/admin/import/jobs',        desc: 'Historial de imports' },
  // Tenants
  { group: 'Franquicia', method: 'GET',   path: '/admin/tenants',            desc: 'Listar tenants' },
  { group: 'Franquicia', method: 'GET',   path: '/admin/tenants/stats',      desc: 'Estadísticas tenants' },
  { group: 'Franquicia', method: 'POST',  path: '/admin/tenants',            desc: 'Crear tenant', body: '{"name":"","slug":"","plan":"starter"}' },
  // Printers
  { group: 'Impresoras', method: 'GET',   path: '/admin/printers',           desc: 'Listar impresoras' },
  { group: 'Impresoras', method: 'POST',  path: '/admin/printers',           desc: 'Crear impresora', body: '{"name":"","type":"receipt","ip_address":"","port":9100,"branch_id":""}' },
  { group: 'Impresoras', method: 'POST',  path: '/admin/printers/:id/test',  desc: 'Test de impresión' },
] as const;

const METHOD_COLORS: Record<string, string> = {
  GET:    'bg-green-100 text-green-700',
  POST:   'bg-blue-100 text-blue-700',
  PATCH:  'bg-yellow-100 text-yellow-700',
  PUT:    'bg-orange-100 text-orange-700',
  DELETE: 'bg-red-100 text-red-700',
};

const GROUPS = [...new Set(ENDPOINTS.map(e => e.group))];

// ─────────────────────────────────────────────────────────────────────────────
export default function ApiPlaygroundPage() {
  const [search, setSearch] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [bodyText, setBodyText] = useState('');
  const [pathParams, setPathParams] = useState('');
  const [response, setResponse]   = useState<{ status: number; data: unknown } | null>(null);
  const [loading, setLoading]     = useState(false);
  const [copied, setCopied]       = useState<number | null>(null);
  const responseRef = useRef<HTMLDivElement>(null);

  const filtered = ENDPOINTS.filter(e => {
    const matchSearch = !search || e.path.toLowerCase().includes(search.toLowerCase()) ||
                        e.desc.toLowerCase().includes(search.toLowerCase());
    const matchGroup  = !activeGroup || e.group === activeGroup;
    return matchSearch && matchGroup;
  });

  const copy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx); setTimeout(() => setCopied(null), 1500);
    });
  };

  const tryEndpoint = async (ep: typeof ENDPOINTS[number]) => {
    setLoading(true); setResponse(null);
    try {
      let path: string = ep.path as string;
      // Replace :param with value from pathParams
      if (pathParams) {
        const parts = pathParams.split(',');
        path = path.replace(/:([a-z_]+)/g, (_: string, _k: string) => parts.shift() ?? `:${_k}`);
      }
      let body: unknown | undefined;
      if (bodyText.trim()) { try { body = JSON.parse(bodyText); } catch { throw new Error('JSON inválido en body'); } }

      const method = ep.method.toLowerCase() as 'get'|'post'|'patch'|'put'|'delete';
      const res = await api[method](path as any, body ?? undefined);
      setResponse({ status: 200, data: res.data });
    } catch (err: any) {
      setResponse({ status: err?.response?.status ?? 0, data: err?.response?.data ?? { error: err.message } });
    } finally {
      setLoading(false);
      setTimeout(() => responseRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Terminal className="w-6 h-6 text-blue-600" /> API Playground
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Referencia interactiva de la API Admin · {ENDPOINTS.length} endpoints disponibles
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar endpoint..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-56" />
        </div>
        <button onClick={() => setActiveGroup(null)}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!activeGroup ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          Todos ({ENDPOINTS.length})
        </button>
        {GROUPS.map(g => (
          <button key={g} onClick={() => setActiveGroup(g === activeGroup ? null : g)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeGroup === g ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {g}
          </button>
        ))}
      </div>

      {/* Endpoints */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Sin resultados para "{search}"</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((ep, idx) => {
              const isOpen = expanded === idx;
              return (
                <div key={idx}>
                  <div
                    onClick={() => {
                      setExpanded(isOpen ? null : idx);
                      if (!isOpen && (ep as any).body) setBodyText((ep as any).body);
                      else if (!isOpen) setBodyText('');
                      setPathParams(''); setResponse(null);
                    }}
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold min-w-[52px] text-center ${METHOD_COLORS[ep.method]}`}>
                      {ep.method}
                    </span>
                    <code className="text-sm text-gray-700 font-mono flex-1">{ep.path}</code>
                    <span className="text-xs text-gray-400 hidden md:block">{ep.desc}</span>
                    <span className="text-xs text-gray-400 hidden md:block">{ep.group}</span>
                    <button onClick={e => { e.stopPropagation(); copy(ep.path, idx); }}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                      {copied === idx ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>

                  {isOpen && (
                    <div className="px-5 pb-5 bg-gray-50 border-t border-gray-100 space-y-3">
                      <div className="flex gap-4 flex-wrap text-sm">
                        <div>
                          <span className="text-gray-500">Módulo: </span>
                          <span className="font-medium text-gray-700">{ep.group}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Descripción: </span>
                          <span className="font-medium text-gray-700">{ep.desc}</span>
                        </div>
                      </div>

                      {/* Path params */}
                      {ep.path.includes(':') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">
                            Parámetros de ruta (separados por coma)
                            <span className="text-gray-400 ml-2 font-normal">
                              {ep.path.match(/:([a-z_]+)/g)?.join(', ')}
                            </span>
                          </label>
                          <input value={pathParams} onChange={e => setPathParams(e.target.value)}
                            placeholder="e.g.: uuid-aqui"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono bg-white" />
                        </div>
                      )}

                      {/* Body */}
                      {['POST','PATCH','PUT'].includes(ep.method) && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                            <Code2 className="w-3.5 h-3.5" /> Request Body (JSON)
                          </label>
                          <textarea
                            value={bodyText}
                            onChange={e => setBodyText(e.target.value)}
                            rows={5}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono bg-white resize-y"
                          />
                        </div>
                      )}

                      <button
                        onClick={() => tryEndpoint(ep)}
                        disabled={loading}
                        className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-40"
                      >
                        {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                        {loading ? 'Ejecutando...' : 'Ejecutar'}
                      </button>

                      {/* Response */}
                      {response && (
                        <div ref={responseRef}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`px-2.5 py-1 rounded text-xs font-bold ${response.status >= 200 && response.status < 300 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {response.status}
                            </span>
                            <span className="text-xs text-gray-500">Response</span>
                            <button
                              onClick={() => { copy(JSON.stringify(response.data, null, 2), -1); toast.success('Copiado'); }}
                              className="ml-auto p-1.5 rounded hover:bg-gray-200 text-gray-400"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <pre className="bg-gray-900 text-green-400 text-xs rounded-xl p-4 overflow-x-auto max-h-80 overflow-y-auto">
                            {JSON.stringify(response.data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
