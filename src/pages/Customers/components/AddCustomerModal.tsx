import { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Home, MessageSquare } from 'lucide-react';
import { SECTORES_CHILE } from '../../../constants/sectors';
import customersService from '../../../services/customersService';
import toast from 'react-hot-toast';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCustomerModal({ isOpen, onClose, onSuccess }: AddCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Ingresa el nombre del cliente');
      return;
    }
    if (!phone.trim()) {
      toast.error('Ingresa el teléfono del cliente');
      return;
    }

    try {
      setSaving(true);
      
      await customersService.create({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        sector: sector || undefined,
        notes: notes.trim() || undefined,
        tags: []
      });

      // Reset form
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setAddressNumber('');
      setSector('');
      setNotes('');

      onSuccess();
    } catch (err: any) {
      toast.error('Error al crear cliente: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">Nuevo Cliente</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-zinc-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Nombre *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Teléfono *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56912345678"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none"
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Sector</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none z-10" />
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none appearance-none"
                >
                  <option value="">Selecciona un sector</option>
                  {SECTORES_CHILE.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Dirección</label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Providencia"
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none"
                />
              </div>
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Número</label>
              <input
                type="text"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Ej: 1234"
                className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg px-4 py-2.5
                         placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                         transition-all outline-none"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Notas</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Alérgico al maní, preferencias, etc."
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-lg pl-10 pr-4 py-2.5
                           placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 
                           transition-all outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2.5 px-4 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}
