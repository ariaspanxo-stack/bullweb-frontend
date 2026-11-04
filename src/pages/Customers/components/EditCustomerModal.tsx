import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Home, MessageSquare, Cake, IdCard } from 'lucide-react';
import type { Customer } from '../../Restaurant/types';
import { SECTORES_CHILE } from '../../../constants/sectors';
import customersService from '../../../services/customersService';
import toast from 'react-hot-toast';

interface EditCustomerModalProps {
  isOpen: boolean;
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditCustomerModal({ isOpen, customer, onClose, onSuccess }: EditCustomerModalProps) {
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

  useEffect(() => {
    if (isOpen && customer) {
      setName(customer.name);
      setPhone(customer.phone);
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setAddressNumber(customer.addressNumber || '');
      setSector(customer.sector || '');
      setNotes(customer.notes || '');
      setBirthdate(customer.birthdate ? customer.birthdate.slice(0, 10) : '');
      setRut(customer.rut || '');
    }
  }, [isOpen, customer]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error('Ingresa el nombre');
      return;
    }
    if (!phone.trim()) {
      toast.error('Ingresa el teléfono');
      return;
    }

    try {
      setSaving(true);
      
      await customersService.update(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        rut: rut.trim() || undefined,
        email: email.trim() || undefined,
        birthdate: birthdate ? new Date(birthdate + 'T12:00:00').toISOString() : undefined,
        address: address.trim() || undefined,
        addressNumber: addressNumber.trim() || undefined,
        sector: sector || undefined,
        notes: notes.trim() || undefined
      });

      onSuccess();
    } catch (err: any) {
      toast.error('Error al actualizar cliente: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    createPortal(<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-white">Editar Cliente</h3>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-50 hover:bg-slate-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Nombre *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Teléfono *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">RUT</label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={rut}
                  maxLength={12}
                  onChange={(e) => setRut(e.target.value)}
                  placeholder="12.345.678-9"
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Fecha de nacimiento</label>
              <div className="relative">
                <Cake className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                <input
                  type="date"
                  value={birthdate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none [color-scheme:dark]"
                />
                <p className="text-xs text-slate-500 mt-1">Para felicitarlo en su cumpleaños 🎂</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Sector</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                <select
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none appearance-none [color-scheme:dark]"
                >
                  <option value="">Selecciona un sector</option>
                  {SECTORES_CHILE.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Dirección</label>
              <div className="relative">
                <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Número</label>
              <input
                type="text"
                value={addressNumber}
                onChange={(e) => setAddressNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg px-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Notas</label>
              <div className="relative">
                <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 !text-white rounded-lg pl-10 pr-4 py-2.5 placeholder-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 transition-all outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="min-h-[44px] flex-1 py-2.5 px-4 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="min-h-[44px] flex-1 py-2.5 px-4 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>, document.body)
  );
}
