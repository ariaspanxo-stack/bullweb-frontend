import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CreditCard, Banknote, Smartphone, DollarSign, Percent, Hash, FileText } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import api from '@/services/api';
import type { PaymentMethod } from '@/types';
import { useRestaurant } from '../../contexts/RestaurantContext';
import { EmitBoletaButton } from './EmitBoletaButton';
import { CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

// ============================================================================
// TIPOS
// ============================================================================

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  onProcessPayment: (paymentMethodId: string, amount: number, tip?: number) => Promise<void>;
  orderId?: string;
}

// ============================================================================
// COMPONENTE CHECKOUT MODAL
// ============================================================================

export default function CheckoutModal({
  isOpen,
  onClose,
  subtotal,
  tax,
  discount,
  total,
  onProcessPayment,
  orderId
}: CheckoutModalProps) {
  const [selectedMethodId, setSelectedMethodId] = useState<string>('');
  const [tip, setTip] = useState<number>(0);
  const [tipType, setTipType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [tipFixed, setTipFixed] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);
const { dteIsConfigured, lastPaidOrderId } = useRestaurant();

  // Cargar métodos de pago
  const { data: paymentMethods, isLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: async () => {
      const response = await api.get<PaymentMethod[]>('/payment-methods');
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      return [];
    },
    enabled: isOpen
  });

  // Calcular propina
  const calculateTip = () => {
    if (tipType === 'PERCENTAGE') {
      return (total * tipPercentage) / 100;
    }
    return parseFloat(tipFixed) || 0;
  };

  // Total final con propina
  const finalTotal = total + tip;

  // Aplicar propina rápida (porcentaje)
  const applyQuickTip = (percentage: number) => {
    setTipType('PERCENTAGE');
    setTipPercentage(percentage);
    const calculatedTip = (total * percentage) / 100;
    setTip(calculatedTip);
    setTipFixed('');
  };

  // Cambiar tipo de propina
  const handleTipTypeChange = (type: 'PERCENTAGE' | 'FIXED') => {
    setTipType(type);
    if (type === 'PERCENTAGE') {
      const calculatedTip = (total * tipPercentage) / 100;
      setTip(calculatedTip);
    } else {
      setTip(parseFloat(tipFixed) || 0);
    }
  };

  // Cambiar propina porcentaje
  const handleTipPercentageChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    setTipPercentage(numValue);
    if (tipType === 'PERCENTAGE') {
      const calculatedTip = (total * numValue) / 100;
      setTip(calculatedTip);
    }
  };

  // Cambiar propina fija
  const handleTipFixedChange = (value: string) => {
    setTipFixed(value);
    if (tipType === 'FIXED') {
      setTip(parseFloat(value) || 0);
    }
  };

  // Procesar pago
  const handlePayment = async () => {
    if (!selectedMethodId) return;

    setIsProcessing(true);
    try {
      await onProcessPayment(selectedMethodId, finalTotal, tip > 0 ? tip : undefined);
      setPaymentCompleted(true);
    } catch (error) {
      console.error('Error processing payment:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset y cerrar
  const handleClose = () => {
    setSelectedMethodId('');
    setTip(0);
    setTipType('PERCENTAGE');
    setTipPercentage(0);
    setTipFixed('');
    onClose();
  };

  // Iconos según tipo de método
  const getMethodIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'cash':
        return Banknote;
      case 'card':
        return CreditCard;
      case 'digital':
        return Smartphone;
      default:
        return DollarSign;
    }
  };

  if (paymentCompleted) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-2xl text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">¡Pago Exitoso!</h3>
          <p className="text-sm text-gray-500 mb-6">La orden ha sido cobrada correctamente</p>
{dteIsConfigured && lastPaidOrderId && (
            <div className="mb-6">
              <EmitBoletaButton
                orderId={lastPaidOrderId}
isConfigured={dteIsConfigured}
                onEmitted={() => {}}
              />
            </div>
          )}
          <button
            onClick={() => {
              setPaymentCompleted(false);
              handleClose();
            }}
            className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Procesar Pago">
      <div className="space-y-6">
        {/* Resumen de la cuenta */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal:</span>
            <span className="font-medium text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Descuento:</span>
              <span className="font-medium">-{formatCurrency(discount)}</span>
            </div>
          )}
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">IGV (18%):</span>
            <span className="font-medium text-gray-900">{formatCurrency(tax)}</span>
          </div>
          
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2 mt-2">
            <span className="text-gray-900">Total:</span>
            <span className="text-blue-600">{formatCurrency(total)}</span>
          </div>
        </div>

        {/* Propina */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Propina (opcional)
          </label>
          
          {/* Botones rápidos */}
          <div className="flex gap-2 mb-3">
            {[10, 15, 20].map(percentage => (
              <button
                key={percentage}
                onClick={() => applyQuickTip(percentage)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  tipType === 'PERCENTAGE' && tipPercentage === percentage
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {percentage}%
              </button>
            ))}
          </div>

          {/* Tipo de propina */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => handleTipTypeChange('PERCENTAGE')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                tipType === 'PERCENTAGE'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Percent className="w-4 h-4" />
              Porcentaje
            </button>
            <button
              onClick={() => handleTipTypeChange('FIXED')}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                tipType === 'FIXED'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Hash className="w-4 h-4" />
              Monto Fijo
            </button>
          </div>

          {/* Input propina */}
          {tipType === 'PERCENTAGE' ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={tipPercentage}
                onChange={(e) => handleTipPercentageChange(e.target.value)}
                min="0"
                max="100"
                step="1"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
              <span className="text-gray-600 font-medium">%</span>
              <span className="text-lg font-bold text-blue-600 min-w-[100px] text-right">
                {formatCurrency(tip)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-gray-600 font-medium">S/.</span>
              <input
                type="number"
                value={tipFixed}
                onChange={(e) => handleTipFixedChange(e.target.value)}
                min="0"
                step="0.01"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
          )}
        </div>

        {/* Total final */}
        {tip > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-blue-900">
                Total a Pagar (con propina):
              </span>
              <span className="text-2xl font-bold text-blue-600">
                {formatCurrency(finalTotal)}
              </span>
            </div>
          </div>
        )}

        {/* Métodos de pago */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Método de Pago
          </label>
          
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 bg-gray-200 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : !paymentMethods || paymentMethods.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p className="text-sm">No hay métodos de pago disponibles</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paymentMethods.map(method => {
                const Icon = getMethodIcon(method.type);
                const isSelected = selectedMethodId === method.id;
                
                return (
                  <button
                    key={method.id}
                    onClick={() => setSelectedMethodId(method.id)}
                    disabled={!method.isActive}
                    className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                      !method.isActive
                        ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-200'
                        : isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:border-blue-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-blue-600' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isSelected ? 'text-white' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className={`font-semibold ${
                          isSelected ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {method.name}
                        </p>
                        {method.description && (
                          <p className="text-xs text-gray-500">
                            {method.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Botones */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          <Button
            variant="outline"
            size="lg"
            onClick={handleClose}
            className="flex-1"
            disabled={isProcessing}
          >
            Cancelar
          </Button>
          {orderId && (
            <EmitBoletaButton
              orderId={orderId}
              isConfigured={dteIsConfigured}
              onEmitted={() => {}}
            />
          )}
          <Button
            variant="primary"
            size="lg"
            onClick={handlePayment}
            className="flex-1"
            disabled={!selectedMethodId || isProcessing}
            isLoading={isProcessing}
          >
            {isProcessing ? 'Procesando...' : `Pagar ${formatCurrency(finalTotal)}`}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
