import { useQuery } from '@tanstack/react-query';
import { employeesService } from '@/services/employeesService';
import { attendanceService } from '@/services/attendanceService';
import {
  X, User, Phone, Mail, MapPin, Calendar, Briefcase, Clock,
  CheckCircle, XCircle, TrendingUp, ShoppingBag, FileText,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface EmployeeProfileModalProps {
  employee: any;
  onClose(): void;
}

const TURNO: Record<string, string> = {
  morning:   'Mañana (08:00–17:00)',
  afternoon: 'Tarde (14:00–23:00)',
  night:     'Noche (22:00–07:00)',
};

const CONTRATO: Record<string, string> = {
  indefinido: 'Indefinido',
  plazo_fijo: 'Plazo fijo',
  part_time:  'Part-time',
};

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-indigo-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm text-gray-800 font-medium">{value}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export function EmployeeProfileModal({ employee, onClose }: EmployeeProfileModalProps) {
  const now   = new Date();
  const year  = now.getFullYear();
  const month = now.getMonth() + 1;

  const { data: details } = useQuery({
    queryKey: ['employee-detail', employee.id],
    queryFn: () => employeesService.getEmployeeById(employee.id),
    staleTime: 60_000,
    enabled: !!employee.id,
  });

  const { data: calendario } = useQuery({
    queryKey: ['calendario', employee.id, year, month],
    queryFn: () => attendanceService.getCalendario(employee.id, year, month),
    staleTime: 60_000,
    enabled: !!employee.id,
  });

  const { data: justificativos = [] } = useQuery({
    queryKey: ['justificativos', employee.id],
    queryFn: () => attendanceService.getJustificativos({ employeeId: employee.id }),
    staleTime: 60_000,
    enabled: !!employee.id,
  });

  const emp   = (details as any)?.employee ?? employee;
  const stats = (details as any)?.stats;
  const resumen = (calendario as any)?.resumen;
  const recentJust = (justificativos as any[]).slice(0, 3);

  const turno = TURNO[emp.shift] ?? (emp.shift ?? '—');
  const fechaInicio = emp.fecha_inicio
    ? new Date(emp.fecha_inicio).toLocaleDateString('es-CL')
    : null;
  const fechaNacimiento = emp.fecha_nacimiento
    ? new Date(emp.fecha_nacimiento).toLocaleDateString('es-CL')
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white px-6 pt-5 pb-4 border-b border-gray-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{emp.name}</h2>
              <p className="text-xs text-gray-500">{emp.cargo ?? 'Sin cargo'} · {emp.roles?.name ?? '—'}</p>
            </div>
            <span className={`ml-2 flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              emp.active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-500'
            }`}>
              {emp.active !== false
                ? <><CheckCircle className="w-3 h-3" /> Activo</>
                : <><XCircle className="w-3 h-3" /> Inactivo</>
              }
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* ── Stats del mes ──────────────────────────────────────────────────── */}
          {resumen && (
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Presentes', value: resumen.presentes, cls: 'bg-green-50  text-green-700'  },
                { label: 'Tardanzas', value: resumen.tardanzas, cls: 'bg-amber-50  text-amber-700'  },
                { label: 'Ausentes',  value: resumen.ausentes,  cls: 'bg-red-50    text-red-700'    },
                { label: 'Horas',     value: `${resumen.totalHoras ?? 0}h`, cls: 'bg-indigo-50 text-indigo-700' },
              ].map(({ label, value, cls }) => (
                <div key={label} className={`rounded-xl p-3 text-center ${cls}`}>
                  <p className="text-lg font-bold">{value}</p>
                  <p className="text-xs mt-0.5 font-medium opacity-70">{label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ── Info personal ─────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Datos Personales</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={User}     label="RUT"               value={emp.rut} />
              <InfoRow icon={Mail}     label="Correo"            value={emp.email} />
              <InfoRow icon={Phone}    label="Teléfono"          value={emp.phone} />
              <InfoRow icon={Calendar} label="Fecha nacimiento"  value={fechaNacimiento ?? undefined} />
              <InfoRow icon={MapPin}   label="Dirección"         value={emp.direccion} />
            </div>
          </div>

          {/* ── Info laboral ──────────────────────────────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Datos Laborales</h3>
            <div className="grid grid-cols-2 gap-4">
              <InfoRow icon={Briefcase} label="Cargo"         value={emp.cargo} />
              <InfoRow icon={Clock}     label="Turno"         value={turno} />
              <InfoRow icon={FileText}  label="Contrato"      value={emp.tipo_contrato ? CONTRATO[emp.tipo_contrato] ?? emp.tipo_contrato : undefined} />
              <InfoRow icon={Calendar}  label="Inicio"        value={fechaInicio ?? undefined} />
            </div>
          </div>

          {/* ── Stats de ventas ───────────────────────────────────────────────── */}
          {stats && (stats.totalOrders > 0) && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Actividad en Sistema</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <ShoppingBag className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">{stats.totalOrders}</p>
                  <p className="text-xs text-gray-500">Órdenes</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(stats.totalSales)}
                  </p>
                  <p className="text-xs text-gray-500">Ventas totales</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-gray-400 mx-auto mb-1" />
                  <p className="text-lg font-bold text-gray-800">
                    {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(stats.averageTicket)}
                  </p>
                  <p className="text-xs text-gray-500">Ticket promedio</p>
                </div>
              </div>
            </div>
          )}

          {/* ── Justificativos recientes ──────────────────────────────────────── */}
          {recentJust.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
                Justificativos recientes
              </h3>
              <div className="space-y-2">
                {recentJust.map((j: any) => (
                  <div key={j.id} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                    <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 capitalize">{j.tipo}</p>
                      <p className="text-xs text-gray-400">
                        {j.fecha ? new Date(j.fecha + 'T00:00:00').toLocaleDateString('es-CL') : ''}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${
                      j.estado === 'aprobado'  ? 'bg-green-100 text-green-700' :
                      j.estado === 'rechazado' ? 'bg-red-100 text-red-600'    :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {j.estado}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
