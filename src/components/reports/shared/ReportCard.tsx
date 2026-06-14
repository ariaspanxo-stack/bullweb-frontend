interface ReportCardProps {
  label:     string;
  value:     string | number;
  subvalue?: string;
  trend?:    number | null;
  icon:      string;
  color:     'green' | 'blue' | 'purple' | 'orange' | 'red' | 'gray';
}

const COLORS = {
  green:  { icon: 'bg-green-100',  text: 'text-green-700'  },
  blue:   { icon: 'bg-blue-100',   text: 'text-blue-700'   },
  purple: { icon: 'bg-purple-100', text: 'text-purple-700' },
  orange: { icon: 'bg-orange-100', text: 'text-orange-700' },
  red:    { icon: 'bg-red-100',    text: 'text-red-700'    },
  gray:   { icon: 'bg-gray-100',   text: 'text-gray-700'   },
};

export function ReportCard({ label, value, subvalue, trend, icon, color }: ReportCardProps) {
  const c = COLORS[color];

  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.icon}`}>
          <span className="text-lg">{icon}</span>
        </div>
        {trend !== null && trend !== undefined && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${
            trend >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
          }`}>
            {trend >= 0 ? '↑' : '↓'}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-3xl font-extrabold text-gray-900 mb-0.5 tabular-nums">{value}</div>
      <div className="text-xs font-semibold text-gray-500">{label}</div>
      {subvalue && (
        <div className="text-xs text-gray-400 mt-0.5">{subvalue}</div>
      )}
    </div>
  );
}
