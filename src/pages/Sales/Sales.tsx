import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SalesFilters } from './SalesFilters';
import { SalesStats } from './SalesStats';
import { SalesMasterDetail } from '@/components/Sales/SalesMasterDetail';
import { SalesHourChart } from '@/components/Sales/SalesHourChart';
import { TabMovimientos } from './tabs/TabMovimientos';
import { TabArqueos } from './tabs/TabArqueos';
import { TabPropinas } from './tabs/TabPropinas';
import { TabDescuentos } from './tabs/TabDescuentos';
import { TabCerrado } from './tabs/TabCerrado';
import type { Sale, SalesFilters as Filters, SalesStats as Stats } from '../../types/sales.types';
import { salesService } from '../../services/salesService';
import { cashRegistersService } from '../../services/cashRegistersService';
import { DollarSign, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

type TabType = 'ventas' | 'movimientos' | 'arqueos' | 'cerrado' | 'propinas' | 'descuentos';

export const Sales = () => {
  const qc = useQueryClient();
  const canViewTips = usePermission('tips.view');
  const [activeTab, setActiveTab] = useState<TabType>('ventas');
  const [sales, setSales] = useState<Sale[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [filters, setFilters] = useState<Partial<Filters>>(() => {
    // Inicializar con fecha de hoy
    const today = new Date();
    return {
      startDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0),
      endDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59)
    };
  });
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [previousStats, setPreviousStats] = useState<Stats | null>(null);
  const [showCashModal, setShowCashModal] = useState(false);

  // Estado modal apertura caja
  const [openDate, setOpenDate] = useState('');
  const [openTime, setOpenTime] = useState('');
  const [openMonto, setOpenMonto] = useState('');
  const [openingCash, setOpeningCash] = useState(false);
  const [availableRegisters, setAvailableRegisters] = useState<any[]>([]);
  const [selectedRegisterId, setSelectedRegisterId] = useState('');
  const [loadingRegisters, setLoadingRegisters] = useState(false);
  const [registerError, setRegisterError] = useState('');

  // Cargar datos (se llama manualmente desde el botón Buscar)
  const loadData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      // Fix #1 — una sola llamada; stats calculados localmente
      const salesData = await salesService.getSales(filters);
      const statsData = salesService.calculateStats(salesData);
      setSales(salesData);
      setStats(statsData);
      setHasSearched(true);
      if (salesData.length > 0 && !selectedSale) {
        setSelectedSale(salesData[0]);
      } else if (selectedSale) {
        // Re-sincronizar selectedSale con los datos frescos del servidor
        const fresh = salesData.find(s => s.id === selectedSale.id);
        if (fresh) setSelectedSale(fresh);
      }

      // Mejora #5 — cargar stats de la semana anterior si el rango es un solo día
      if (filters.startDate && filters.endDate) {
        const diffMs = filters.endDate.getTime() - filters.startDate.getTime();
        const isDaily = diffMs <= 25 * 3600 * 1000; // ≤25 h = rango diario
        if (isDaily) {
          const prevStart = new Date(filters.startDate.getTime() - 7 * 24 * 3600 * 1000);
          const prevEnd   = new Date(filters.endDate.getTime()   - 7 * 24 * 3600 * 1000);
          const prevSales = await salesService.getSales({ startDate: prevStart, endDate: prevEnd });
          setPreviousStats(salesService.calculateStats(prevSales));
        } else {
          setPreviousStats(null);
        }
      }
    } catch (error) {
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Cargar datos SOLO al montar
  useEffect(() => {
    if (activeTab === 'ventas') {
      loadData();
    }
  }, []); // Array vacío = solo al montar

  // Recargar cuando cambien los filtros (ACTIVADO POR EL BOTÓN BUSCAR)
  useEffect(() => {
    if (activeTab === 'ventas' && filters.startDate && filters.endDate) {
      loadData();
    }
  }, [filters]);

  // Mejora C — auto-refresh silencioso cada 60s en tab Ventas
  useEffect(() => {
    if (activeTab !== 'ventas') return;
    const interval = setInterval(() => { loadData(true); }, 60_000);
    return () => clearInterval(interval);
  }, [activeTab, filters]);

  const handleFilterChange = (newFilters: Partial<Filters>) => {
    setFilters(newFilters);
    // loadData() se llamará automáticamente por el useEffect de arriba
  };

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
  };

  // Filtro local de búsqueda (se aplica sobre los datos ya cargados)
  const displaySales = (() => {
    const q = (filters.search || '').toLowerCase().trim();
    if (!q) return sales;
    return sales.filter(s =>
      (s.saleNumber || '').toLowerCase().includes(q) ||
      (s.customerName || '').toLowerCase().includes(q) ||
      (s.tableNumber || '').toLowerCase().includes(q) ||
      (s.waiterName || '').toLowerCase().includes(q)
    );
  })();

  const loadRegisters = async () => {
    setLoadingRegisters(true);
    setRegisterError('');
    setAvailableRegisters([]);
    setSelectedRegisterId('');
    try {
      // Fix #5 — usar salesService en lugar de api.get directo
      const reg = await salesService.getActiveCashRegister();

      let resolved: any = null;
      if (reg?.id) resolved = reg;
      else if (reg?.register?.id) resolved = reg.register;
      else if (Array.isArray(reg?.registers) && reg.registers.length > 0) resolved = reg.registers[0];

      if (resolved?.id) {
        if (resolved.isOpen === true) {
          setRegisterError(
            `La caja "${resolved.name || 'Caja'}" ya tiene una sesion activa. ` +
            'Para abrir un nuevo arqueo, primero cierra la sesion actual desde la pestana Arqueos.'
          );
          return;
        }
        setAvailableRegisters([{ id: resolved.id, name: resolved.name || 'Caja' }]);
        setSelectedRegisterId(resolved.id);
        return;
      }

      // Fallback: listar todas las cajas
      const regs = await salesService.getCashRegisters();
      if (regs.length > 0) {
        setAvailableRegisters(regs.map((r: any) => ({ id: r.id, name: r.name || 'Caja' })));
        setSelectedRegisterId(regs[0].id);
      } else {
        setRegisterError('No se encontraron cajas registradoras.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? err?.message ?? 'Error de conexion al cargar cajas';
      setRegisterError(msg);
    } finally {
      setLoadingRegisters(false);
    }
  };

  const handleOpenCash = () => {
    const now = new Date();
    setOpenDate(now.toISOString().slice(0, 10));
    setOpenTime(now.toTimeString().slice(0, 8));
    setOpenMonto('');
    setShowCashModal(true);
    loadRegisters();
  };

  const handleConfirmOpenCash = async () => {
    if (!selectedRegisterId) {
      toast.error('Selecciona una caja registradora');
      return;
    }
    try {
      setOpeningCash(true);
      await cashRegistersService.openSession(selectedRegisterId, {
        openingCash: parseFloat(openMonto) || 0,
        openedAt: new Date(`${openDate}T${openTime}`).toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['active-register'] });
      qc.invalidateQueries({ queryKey: ['cash-sessions-all'] });
      qc.invalidateQueries({ queryKey: ['cash-cuadre'] });
      setShowCashModal(false);
      toast.success('Caja abierta correctamente.');
    } catch (e: any) {
      const status = e?.status;
      if (status === 409) {
        toast.error('La caja ya esta abierta. Cierra la sesion actual desde Arqueos primero.');
      } else {
        toast.error(e?.data?.error ?? e?.message ?? 'Error al abrir caja');
      }
      setShowCashModal(false);
    } finally {
      setOpeningCash(false);
    }
  };

  if (loading && activeTab === 'ventas') {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando ventas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-4xl font-bold text-gray-800">VENTAS</h1>
        <button 
          onClick={handleOpenCash}
          className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-md"
        >
          <DollarSign size={20} />
          Abrir la caja
        </button>
      </div>

      {/* Tabs de navegación */}
      <div className="mb-6 flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('ventas')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'ventas'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Ventas
        </button>
        <button
          onClick={() => setActiveTab('movimientos')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'movimientos'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Movimientos de caja
        </button>
        <button
          onClick={() => setActiveTab('arqueos')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'arqueos'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Arqueos de Caja
        </button>
        <button
          onClick={() => setActiveTab('cerrado')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'cerrado'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Cerrado
        </button>
        {canViewTips && (
        <button
          onClick={() => setActiveTab('propinas')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'propinas'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Propinas
        </button>
        )}
        <button
          onClick={() => setActiveTab('descuentos')}
          className={`px-4 py-2 font-semibold transition-colors ${
            activeTab === 'descuentos'
              ? 'text-orange-600 border-b-2 border-orange-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Descuentos
        </button>
      </div>

      {/* Contenido según tab activo */}
      {activeTab === 'ventas' && (
        <>
          {/* Filtros */}
          <div className="mb-6">
            <SalesFilters onFilterChange={handleFilterChange} />
          </div>

          {/* Estadísticas */}
          {stats && (
            <div className="mb-6">
              <SalesStats
                stats={stats}
                startDate={filters.startDate || new Date()}
                endDate={filters.endDate || new Date()}
                recordCount={sales.filter(s => s.status !== 'cancelled').length}
                previousStats={previousStats}
                isPeriodDaily={!!(filters.startDate && filters.endDate && (filters.endDate.getTime() - filters.startDate.getTime()) <= 25 * 3600 * 1000)}
                onNavigateToTab={(tab) => setActiveTab(tab as TabType)}
              />
            </div>
          )}

          {/* Gráfico ventas por hora — Mejora #4 */}
          {sales.length > 0 && (
            <div className="mb-6">
              <SalesHourChart sales={sales} />
            </div>
          )}

          {/* Layout Master-Detail: 65% tabla + 35% panel */}
          <SalesMasterDetail
            sales={displaySales}
            selectedSale={selectedSale}
            onSelectSale={handleSelectSale}
            dateRange={
              filters.startDate && filters.endDate
                ? { start: filters.startDate, end: filters.endDate }
                : undefined
            }
            totalCount={displaySales.length}
            loading={loading}
            onRefresh={loadData}
          />
        </>
      )}

      {activeTab === 'movimientos' && <TabMovimientos />}
      {activeTab === 'arqueos' && <TabArqueos />}
      {activeTab === 'propinas' && canViewTips && <TabPropinas filters={filters} />}
      {activeTab === 'descuentos' && <TabDescuentos sales={sales} isLoading={loading} hasSearched={hasSearched} />}
      
      {activeTab === 'cerrado' && <TabCerrado />}

      {/* Modal Abrir Caja */}
      {showCashModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="bg-orange-500 px-5 py-3">
              <h2 className="text-white font-bold text-sm uppercase tracking-wide">Nuevo Arqueo de Caja</h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              {/* Estado de carga de cajas */}
              {loadingRegisters && (
                <div className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded px-3 py-2 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-orange-400 flex-shrink-0" />
                  Cargando cajas disponibles...
                </div>
              )}
              {!loadingRegisters && registerError && (
                <div className="space-y-2">
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                    {registerError}
                  </div>
                  <button onClick={loadRegisters} className="text-xs text-orange-600 underline">
                    Reintentar
                  </button>
                </div>
              )}
              {!loadingRegisters && availableRegisters.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Caja <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedRegisterId}
                    onChange={e => setSelectedRegisterId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {availableRegisters.map((r: any) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!loadingRegisters && availableRegisters.length === 1 && (
                <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
                  Caja: <span className="font-semibold text-gray-800">{availableRegisters[0].name}</span>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hora de apertura <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={openDate}
                    onChange={e => setOpenDate(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <input
                    type="time"
                    step="1"
                    value={openTime}
                    onChange={e => setOpenTime(e.target.value)}
                    className="w-32 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Las ventas desde esta hora se sumaran al arqueo.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Inicial <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <span className="text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={openMonto}
                    onChange={e => setOpenMonto(e.target.value)}
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 pb-5 flex justify-end gap-2">
              <button
                onClick={() => setShowCashModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={openingCash || loadingRegisters || !openDate || !openTime || !selectedRegisterId}
                onClick={handleConfirmOpenCash}
                className="px-4 py-2 text-sm rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold transition-colors flex items-center gap-2"
              >
                {openingCash ? <Loader2 className="animate-spin" size={15} /> : null}
                Iniciar Arqueo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sales;
