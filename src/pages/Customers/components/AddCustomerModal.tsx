import { useState } from 'react';
import { X, User, Phone, Mail, MapPin, Home, MessageSquare, Cake, IdCard } from 'lucide-react';
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
  // Hotfix #119: birthdate + rut
  const [birthdate, setBirthdate] = useState('');
  const [rut, setRut] = useState('');
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
        rut: rut.trim() || undefined,
        email: email.trim() || undefined,
        birthdate: birthdate ? new Date(birthdate + 'T12:00:00').toISOString() : undefined,
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
      setBirthdate('');
      setRut('');

      onSuccess();
    } catch (err: any) {
      toast.error('Error al crear cliente: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    backgroundColor: '#374151',
    color: '#FFFFFF',
    border: '1px solid #4B5563',
  };
  const labelStyle: React.CSSProperties = {
    color: '#E5E7EB',
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="force-light-inputs bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
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
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Nombre *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Juan Pérez"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Teléfono *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+56912345678"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cliente@email.com"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Fecha de nacimiento (Hotfix #119) */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Fecha de nacimiento</label>
              <div className="relative">
                <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none z-10" />
                <input
                  type="date"
                  value={birthdate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none [color-scheme:dark]"
                  style={inputStyle}
                />
                <p className="text-xs text-zinc-500 mt-1">Para felicitarlo en su cumpleaños 🎂</p>
              </div>
            </div>

            {/* RUT (Hotfix #119) */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>RUT</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={rut}
                  maxLength={12}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Sector */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Ciudad</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  placeholder="Ej: Providencia"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Dirección</label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ej: Av. Providencia"
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Número */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Número</label>
              <input
                type="text"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                placeholder="Ej: 1234"
                className="w-full rounded-md px-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none"
                style={inputStyle}
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium mb-2" style={labelStyle}>Notas</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: Alérgico al maní, preferencias, etc."
                  className="w-full rounded-md pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition-all outline-none resize-none"
                  style={inputStyle}
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
            className="flex-1 py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}