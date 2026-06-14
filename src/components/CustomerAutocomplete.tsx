import { useState, useEffect, useRef } from 'react';
import { Search, X, Users } from 'lucide-react';
import type { Customer } from '../pages/Restaurant/types';
import customersService from '../services/customersService';

interface CustomerAutocompleteProps {
  onSelect: (customer: Customer) => void;
  onSaveNew?: (name: string) => void;
  placeholder?: string;
  light?: boolean;
}

export default function CustomerAutocomplete({ onSelect, onSaveNew, placeholder, light }: CustomerAutocompleteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      searchCustomersDebounced();
    } else {
      setResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  const searchCustomersDebounced = async () => {
    try {
      const customers = await customersService.search(query);
      setResults(customers.slice(0, 5));
      setShowDropdown(true);
    } catch (err) {
      console.error('Error searching customers:', err);
      setResults([]);
      setShowDropdown(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (customer: Customer) => {
    onSelect(customer);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder || 'Buscar cliente existente...'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          className={`w-full rounded-lg pl-10 pr-10 py-2.5 transition-all outline-none text-sm ${
            light
              ? 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20'
              : 'bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
          }`}
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setShowDropdown(false);
            }}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${light ? 'text-gray-400 hover:text-gray-600' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {showDropdown && results.length > 0 && (
        <div
          ref={dropdownRef}
          className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto custom-scrollbar ${
            light ? 'bg-white border border-gray-200' : 'bg-zinc-800 border border-zinc-700'
          }`}
        >
          {results.map(customer => (
            <button
              key={customer.id}
              onClick={() => handleSelect(customer)}
              className={`w-full px-3 py-2.5 flex items-center justify-between transition-colors text-left ${
                light ? 'hover:bg-orange-50' : 'hover:bg-zinc-700'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className={`font-medium text-sm mb-0.5 ${light ? 'text-gray-900' : 'text-white'}`}>{customer.name}</div>
                <div className={`text-xs ${light ? 'text-gray-500' : 'text-zinc-500'}`}>{customer.phone}</div>
              </div>
              <div className="ml-3 flex items-center gap-1 flex-shrink-0">
                <Users className={`w-3 h-3 ${light ? 'text-gray-400' : 'text-zinc-500'}`} />
                <span className={`text-xs ${light ? 'text-gray-400' : 'text-zinc-500'}`}>{customer.totalOrders} pedidos</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showDropdown && query.length >= 2 && results.length === 0 && (
        <div className={`absolute top-full left-0 right-0 mt-2 rounded-lg shadow-xl z-50 ${
          light ? 'bg-white border border-gray-200' : 'bg-zinc-800 border border-zinc-700'
        }`}>
          <p className={`text-xs px-3 pt-2 pb-1 ${light ? 'text-gray-400' : 'text-zinc-500'}`}>No se encontraron clientes existentes</p>
          {onSaveNew && (
            <button
              type="button"
              onClick={() => {
                onSaveNew(query);
                setQuery('');
                setShowDropdown(false);
              }}
              className={`w-full px-3 py-2.5 text-left text-sm font-medium flex items-center gap-2 border-t transition-colors ${
                light ? 'border-gray-100 text-orange-600 hover:bg-orange-50' : 'border-zinc-700 text-orange-400 hover:bg-zinc-700'
              }`}
            >
              <span className="text-lg leading-none">+</span>
              Usar &quot;{query}&quot; como nuevo cliente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
