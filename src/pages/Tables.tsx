import { useState } from 'react';
import SectionSelector from '@/components/tables/SectionSelector';
import TableStats from '@/components/tables/TableStats';
import TableMap from '@/components/tables/TableMap';
import TableDetailModal from '@/components/tables/TableDetailModal';
import TableFormModal from '@/components/tables/TableFormModal';
import SectionFormModal from '@/components/tables/SectionFormModal';
import Button from '@/components/ui/Button';
import { Plus, Info } from 'lucide-react';
import type { Table } from '@/types';

// ============================================================================
// PÁGINA TABLES (GESTIÓN DE MESAS)
// ============================================================================

export default function Tables() {
  // Estados de sección
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  
  // Estados de mesa seleccionada
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  
  // Estados de modales
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  
  // Mesa en edición
  const [editingTable, setEditingTable] = useState<Table | null>(null);

  // ========================================================================
  // HANDLERS
  // ========================================================================

  // Click en una mesa del plano
  const handleTableClick = (table: Table) => {
    setSelectedTable(table);
    setIsDetailModalOpen(true);
  };

  // Editar mesa desde el modal de detalle
  const handleEditTable = (table: Table) => {
    setEditingTable(table);
    setIsDetailModalOpen(false);
    setIsFormModalOpen(true);
  };

  // Crear nueva mesa
  const handleCreateTable = () => {
    setEditingTable(null);
    setIsFormModalOpen(true);
  };

  // Cerrar modal de formulario
  const handleCloseFormModal = () => {
    setIsFormModalOpen(false);
    setEditingTable(null);
  };

  return (
    <div className="space-y-6">
      {/* ====================================================================
          HEADER
      ==================================================================== */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Mesas
          </h1>
          <p className="text-gray-500 mt-1">
            Administra las mesas y secciones del restaurante
          </p>
        </div>
        <Button onClick={handleCreateTable} size="lg">
          <Plus className="w-5 h-5 mr-2" />
          Nueva Mesa
        </Button>
      </div>

      {/* ====================================================================
          ESTADÍSTICAS
      ==================================================================== */}
      <TableStats />

      {/* ====================================================================
          SELECTOR DE SECCIÓN
      ==================================================================== */}
      <SectionSelector
        selectedSection={selectedSection}
        onSectionChange={setSelectedSection}
        onCreateSection={() => setIsSectionModalOpen(true)}
      />

      {/* ====================================================================
          PLANO DE MESAS
      ==================================================================== */}
      <div className="bg-white rounded-lg border-2 border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Plano del Restaurante
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Vista en tiempo real de todas las mesas
                {selectedSection && ' de la sección seleccionada'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <Info className="w-4 h-4" />
              <span>Actualización automática cada 5 segundos</span>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <TableMap
            selectedSection={selectedSection}
            onTableClick={handleTableClick}
          />
        </div>
      </div>

      {/* ====================================================================
          LEYENDA DE ESTADOS
      ==================================================================== */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          Leyenda de Estados
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            <div className="w-6 h-6 rounded-lg bg-green-500 shadow-sm"></div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Disponible</p>
              <p className="text-xs text-gray-500">Lista para usar</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            <div className="w-6 h-6 rounded-lg bg-red-500 shadow-sm"></div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Ocupada</p>
              <p className="text-xs text-gray-500">Con clientes</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            <div className="w-6 h-6 rounded-lg bg-yellow-500 shadow-sm"></div>
            <div>
              <p className="font-medium text-gray-900 text-sm">Reservada</p>
              <p className="text-xs text-gray-500">Reservación activa</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-gray-200">
            <div className="w-6 h-6 rounded-lg bg-gray-500 shadow-sm"></div>
            <div>
              <p className="font-medium text-gray-900 text-sm">En Limpieza</p>
              <p className="text-xs text-gray-500">Preparando</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instrucciones de uso */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-semibold mb-1">💡 Consejos de uso:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• <strong>Click en una mesa</strong> para ver detalles y orden activa</li>
              <li>• <strong>Crear nueva mesa</strong> con el botón "Nueva Mesa"</li>
              <li>• <strong>Organiza por secciones</strong> para mejor gestión</li>
              <li>• Las mesas se actualizan automáticamente cada 5 segundos</li>
            </ul>
          </div>
        </div>
      </div>

      {/* ====================================================================
          MODALES
      ==================================================================== */}

      {/* Modal: Detalle de Mesa */}
      <TableDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedTable(null);
        }}
        table={selectedTable}
        onEdit={handleEditTable}
      />

      {/* Modal: Formulario Crear/Editar Mesa */}
      <TableFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseFormModal}
        table={editingTable}
      />

      {/* Modal: Crear Sección */}
      <SectionFormModal
        isOpen={isSectionModalOpen}
        onClose={() => setIsSectionModalOpen(false)}
      />
    </div>
  );
}
