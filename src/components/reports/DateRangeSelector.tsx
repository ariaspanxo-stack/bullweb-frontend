import { Calendar } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear } from 'date-fns';

interface DateRangeSelectorProps {
  dateFrom: string;
  dateTo: string;
  onDateChange: (dateFrom: string, dateTo: string) => void;
}

interface Preset {
  label: string;
  days?: number;
  isYesterday?: boolean;
  isThisMonth?: boolean;
  isThisYear?: boolean;
}

const presets: Preset[] = [
  { label: 'Hoy', days: 0 },
  { label: 'Ayer', days: 1, isYesterday: true },
  { label: 'Últimos 7 días', days: 7 },
  { label: 'Últimos 30 días', days: 30 },
  { label: 'Este mes', isThisMonth: true },
  { label: 'Este año', isThisYear: true }
];

export default function DateRangeSelector({ 
  dateFrom, 
  dateTo, 
  onDateChange 
}: DateRangeSelectorProps) {
  const handlePreset = (preset: Preset) => {
    const today = new Date();
    let from: Date;
    let to: Date;

    if (preset.isYesterday) {
      from = subDays(today, 1);
      to = subDays(today, 1);
    } else if (preset.isThisMonth) {
      from = startOfMonth(today);
      to = endOfMonth(today);
    } else if (preset.isThisYear) {
      from = startOfYear(today);
      to = today;
    } else {
      from = subDays(today, preset.days || 0);
      to = today;
    }

    onDateChange(
      format(from, 'yyyy-MM-dd'),
      format(to, 'yyyy-MM-dd')
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {/* Presets */}
        <div className="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => handlePreset(preset)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Separador */}
        <div className="h-8 w-px bg-gray-300" />

        {/* Custom range */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => onDateChange(e.target.value, dateTo)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <span className="text-gray-500">-</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateChange(dateFrom, e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
    </div>
  );
}
