import { useState, useEffect, useRef } from 'react';
import { Calendar, Filter, Search } from 'lucide-react';
import type { SalesFilters as Filters } from '../../types/sales.types';
import api from '@/services/api';

interface Props {
  onFilterChange: (filters: Partial<Filters>) => void;
}

const todayStr = () => new Date().toISOString().split('T')[0];
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; };

export const SalesFilters = ({ onFilterChange }: Props) => {
  const [dateMode, setDateMode] = useState<'diario' | 'semanal' | 'mensual' | 'rango'>('diario');
  const [day, setDay] = useState(new Date().getDate());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  // Estado para modo Rango
  const [rangeFrom,     setRangeFrom]     = useState(todayStr);
  const [rangeFromTime, setRangeFromTime] = useState('00:00');
  const [rangeTo,       setRangeTo]       = useState(tomorrowStr);
  const [rangeToTime,   setRangeToTime]   = useState('23:59');
  const [shift, setShift] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [waiter, setWaiter] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const isFirstSearchRender = useRef(true);

  // Datos dinámicos desde la API
  const [paymentMethods, setPaymentMethods] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/pos/payment-methods')
      .then(r => {
        const list = r.data?.data ?? r.data ?? [];
        setPaymentMethods(Array.isArray(list) ? list : []);
      })
      .catch(e => console.warn('[SalesFilters] error cargando métodos de pago', e));

    api.get('/employees?perPage=200')
      .then(r => {
        const raw = r.data?.data ?? r.data?.employees ?? r.data ?? [];
        const list = Array.isArray(raw) ? raw : [];
        setEmployees(list.map((e: any) => ({ id: e.id, name: e.name })));
      })
      .catch(e => console.warn('[SalesFilters] error cargando empleados', e));
  }, []);

  // FUNCIÓN PARA APLICAR FILTROS MANUALMENTE
  const handleApplyFilters = () => {
    let startDate: Date;
    let endDate: Date;

    if (dateMode === 'rango') {
      const [fH, fMin] = rangeFromTime.split(':').map(Number);
      const [tH, tMin] = rangeToTime.split(':').map(Number);
      startDate = new Date(`${rangeFrom}T${rangeFromTime}:00`);
      endDate   = new Date(`${rangeTo}T${rangeToTime}:59`);
      // Ajustar horas manualmente para evitar problemas de timezone local
      startDate.setHours(fH, fMin, 0, 0);
      endDate.setHours(tH, tMin, 59, 999);
    } else if (dateMode === 'semanal') {
      const base = new Date(year, month - 1, day);
      const dow = base.getDay();
      const mon = new Date(base); mon.setDate(base.getDate() - ((dow + 6) % 7)); mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);  sun.setDate(mon.getDate() + 6); sun.setHours(23, 59, 59, 999);
      startDate = mon; endDate = sun;
    } else if (dateMode === 'mensual') {
      startDate = new Date(year, month - 1, 1, 0, 0, 0);
      endDate   = new Date(year, month, 0, 23, 59, 59);
    } else {
      startDate = new Date(year, month - 1, day, 0, 0, 0);
      endDate   = new Date(year, month - 1, day, 23, 59, 59);
    }

    const filters: Partial<Filters> = {
      startDate,
      endDate,
      shift: shift || undefined,
      status: status as any || undefined,
      type: type as any || undefined,
      waiter: waiter || undefined,
      paymentMethod: paymentMethod as any || undefined,
      tableNumber: tableNumber || undefined,
      minAmount: minAmount ? Number(minAmount) : undefined,
      maxAmount: maxAmount ? Number(maxAmount) : undefined,
      search: searchQuery.trim() || undefined,
    };

    onFilterChange(filters);
  };

  // Debounce: auto-aplica filtros 400ms después de que el usuario deja de escribir en el buscador
  useEffect(() => {
    if (isFirstSearchRender.current) {
      isFirstSearchRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      handleApplyFilters();
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleReset = () => {
    const today = new Date();
    setDay(today.getDate());
    setMonth(today.getMonth() + 1);
    setYear(today.getFullYear());
    setShift('');
    setStatus('');
    setType('');
    setWaiter('');
    setPaymentMethod('');
    setTableNumber('');
    setSearchQuery('');
    setMinAmount('');
    setMaxAmount('');
    
    // Aplicar filtros reseteados
    const startDate = new Date(today.setHours(0, 0, 0, 0));
    const endDate = new Date(today.setHours(23, 59, 59, 999));
    
    onFilterChange({ startDate, endDate, search: undefined });
  };

  // Aplicar filtros de hoy al cargar (SOLO UNA VEZ)
  const handleTodayClick = () => {
    const today = new Date();
    setDay(today.getDate());
    setMonth(today.getMonth() + 1);
    setYear(today.getFullYear());
    
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    onFilterChange({ startDate, endDate });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm space-y-3">
      {/* Barra de búsqueda rápida */}
      <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
        <Search size={18} className="text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por venta, cliente, mesa..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && searchQuery.length >= 3) {
              handleApplyFilters();
            }
          }}
          className="flex-1 bg-transparent border-none outline-none text-sm placeholder-gray-400"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Primera fila - Filtros de fecha */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Selector de modo */}
        <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded overflow-hidden">
          <Calendar size={15} className="text-gray-400 ml-2" />
          <select
            value={dateMode}
            onChange={e => setDateMode(e.target.value as any)}
            className="px-2 py-2 bg-transparent border-none outline-none text-sm cursor-pointer font-medium text-gray-700"
          >
            <option value="diario">Diario</option>
            <option value="semanal">Semanal</option>
            <option value="mensual">Mensual</option>
            <option value="rango">Rango</option>
          </select>
        </div>

        {/* Turno */}
        <div className="flex items-center gap-1 bg-gray-50 px-2 py-2 rounded border border-gray-200">
          <select
            value={shift}
            onChange={(e) => setShift(e.target.value)}
            className="bg-transparent border-none outline-none text-sm cursor-pointer"
          >
            <option value="">Turno</option>
            <option value="morning">Mañana (08:00-14:00)</option>
            <option value="afternoon">Tarde (14:00-20:00)</option>
            <option value="night">Noche (20:00-02:00)</option>
          </select>
        </div>

        {/* Controles de fecha según modo */}
        {dateMode === 'rango' ? (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Desde:</span>
              <input
                type="date"
                value={rangeFrom}
                onChange={e => setRangeFrom(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
              />
              <input
                type="time"
                value={rangeFromTime}
                onChange={e => setRangeFromTime(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100 w-24"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Hasta:</span>
              <input
                type="date"
                value={rangeTo}
                onChange={e => setRangeTo(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
              />
              <input
                type="time"
                value={rangeToTime}
                onChange={e => setRangeToTime(e.target.value)}
                className="px-2 py-1.5 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100 w-24"
              />
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              {dateMode !== 'mensual' && (
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={day}
                  onChange={(e) => setDay(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))}
                  className="w-16 px-2 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-center cursor-pointer hover:bg-gray-100"
                />
              )}
              <select
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
              >
                <option value="1">ene</option>
                <option value="2">feb</option>
                <option value="3">mar</option>
                <option value="4">abr</option>
                <option value="5">may</option>
                <option value="6">jun</option>
                <option value="7">jul</option>
                <option value="8">ago</option>
                <option value="9">sep</option>
                <option value="10">oct</option>
                <option value="11">nov</option>
                <option value="12">dic</option>
              </select>
              <input
                type="number"
                min="2020"
                max="2030"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2026)}
                className="w-20 px-2 py-2 bg-gray-50 border border-gray-200 rounded text-sm text-center cursor-pointer hover:bg-gray-100"
              />
            </div>
            <button
              onClick={handleTodayClick}
              className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm font-medium hover:bg-blue-100"
            >
              Hoy
            </button>
          </>
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleApplyFilters}
          className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors"
        >
          🔍 Buscar
        </button>

        <button
          onClick={handleReset}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
        >
          Limpiar
        </button>

        {(shift || status || type || waiter || paymentMethod || tableNumber || minAmount || maxAmount) && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded">
            <Filter size={14} />
            <span>Filtros activos: {[shift, status, type, waiter, paymentMethod, tableNumber, minAmount, maxAmount].filter(Boolean).length}</span>
          </div>
        )}
      </div>

      {/* Segunda fila - Filtros avanzados */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded border border-gray-200">
          <Filter size={18} className="text-gray-500" />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="bg-transparent border-none outline-none text-sm cursor-pointer"
          >
            <option value="">Estado de Venta</option>
            <option value="open">Abiertas</option>
            <option value="paying">Pagando</option>
            <option value="closed">Cerradas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
        >
          <option value="">Tipo de Venta</option>
          <option value="dine_in">Mesa</option>
          <option value="takeout">Mostrador</option>
          <option value="delivery">Delivery</option>
        </select>

        <select
          value={waiter}
          onChange={(e) => setWaiter(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
        >
          <option value="">Garzón / Empleado</option>
          {employees.map(e => (
            <option key={e.id} value={e.name}>{e.name}</option>
          ))}
        </select>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
        >
          <option value="">Medio de pago</option>
          {paymentMethods.map(pm => (
            <option key={pm.id} value={pm.name}>{pm.name}</option>
          ))}
        </select>

        <select
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          className="px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm cursor-pointer hover:bg-gray-100"
        >
          <option value="">Mesa</option>
          {Array.from({ length: 30 }, (_, i) => (
            <option key={i + 1} value={i + 1}>Mesa {i + 1}</option>
          ))}
        </select>

        {/* Mejora #6 — Rango de monto */}
        <input
          type="number"
          min="0"
          placeholder="Desde $"
          value={minAmount}
          onChange={e => setMinAmount(e.target.value)}
          className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm hover:bg-gray-100 outline-none focus:ring-2 focus:ring-orange-300"
        />
        <input
          type="number"
          min="0"
          placeholder="Hasta $"
          value={maxAmount}
          onChange={e => setMaxAmount(e.target.value)}
          className="w-28 px-3 py-2 bg-gray-50 border border-gray-200 rounded text-sm hover:bg-gray-100 outline-none focus:ring-2 focus:ring-orange-300"
        />

      </div>
    </div>
  );
};
