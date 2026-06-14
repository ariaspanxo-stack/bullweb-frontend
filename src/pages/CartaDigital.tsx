import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ShoppingBag, Search, ChevronLeft, ChevronRight, Clock, ShoppingCart, Plus, Minus, Trash2, X, CheckCircle, MapPin, Phone, Mail } from 'lucide-react';

const fmtCLP = (n: number) => `$${n.toLocaleString('es-CL')}`;

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image: string | null;
  emoji?: string | null;
  available?: boolean;
  tags?: string[];
}
interface Category {
  id: string;
  name: string;
  products: Product[];
}
interface CartaSettings {
  restaurantName:   string;
  logo:             string | null;
  bannerUrl:        string | null;
  themeColor:       string;
  tagline:          string | null;
  hideUnavailable?: boolean;
  slug?:            string | null;
  paymentMethods?:  Array<{ id: string; name: string }>;
  address?:         string | null;
  phone?:           string | null;
  email?:           string | null;
  hours?:           string | null;
}
interface CartItem {
  product:  Product;
  quantity: number;
}

// ── TAG config ─────────────────────────────────────────────────
const TAG_CONFIG: Record<string, { label: string; emoji: string; bg: string; text: string }> = {
  vegano:      { label: 'Vegano',      emoji: '🌱', bg: 'bg-green-900/40',  text: 'text-green-400'  },
  vegetariano: { label: 'Vegetariano', emoji: '🥦', bg: 'bg-lime-900/40',   text: 'text-lime-400'   },
  sin_gluten:  { label: 'Sin gluten',  emoji: '🌾', bg: 'bg-yellow-900/40', text: 'text-yellow-400' },
  picante:     { label: 'Picante',     emoji: '🌶️', bg: 'bg-red-900/40',    text: 'text-red-400'    },
  popular:     { label: 'Popular',     emoji: '⭐', bg: 'bg-orange-900/40', text: 'text-orange-400' },
  nuevo:       { label: 'Nuevo',       emoji: '🆕', bg: 'bg-blue-900/40',   text: 'text-blue-400'   },
  oferta:      { label: 'Oferta',      emoji: '🏷️', bg: 'bg-pink-900/40',   text: 'text-pink-400'   },
};

function ProductTag({ tag }: { tag: string }) {
  const cfg = TAG_CONFIG[tag];
  if (!cfg) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-medium
      px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
}

// ── Business hours hook ─────────────────────────────────────────
function useBusinessHours(slug: string | null) {
  const [isOpen,     setIsOpen]     = useState<boolean | null>(null);
  const [nextChange, setNextChange] = useState('');

  useEffect(() => {
    if (!slug) return;
    const params = new URLSearchParams({ slug });
    fetch(`/api/public/hours?${params.toString()}`)
      .then(r => r.json())
      .then(res => {
        const { hours, timezone } = res.data ?? res ?? {};
        if (!hours) return;
        const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
        const dayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];

        // Respetar el timezone del restaurant (ej: "America/Lima")
        const tz = (timezone && timezone !== '') ? timezone : Intl.DateTimeFormat().resolvedOptions().timeZone;
        // Convertir la hora actual al timezone del restaurant
        const tzDate = new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
        const dayIndex = tzDate.getDay();
        const dayName  = days[dayIndex];
        const nowMin   = tzDate.getHours() * 60 + tzDate.getMinutes();
        const todayH   = hours[dayName];

        if (!todayH?.enabled) {
          setIsOpen(false); setNextChange('Cerrado hoy');
          // Buscar próximo día abierto
          for (let i = 1; i <= 7; i++) {
            const nextIdx = (dayIndex + i) % 7;
            const nextDay = days[nextIdx];
            if (hours[nextDay]?.enabled) {
              const label = i === 1 ? 'mañana' : `el ${dayNames[nextIdx]}`;
              setNextChange(`Abre ${label} a las ${hours[nextDay].open}`);
              break;
            }
          }
          return;
        }
        const [oh, om] = todayH.open.split(':').map(Number);
        const [ch, cm] = todayH.close.split(':').map(Number);
        const openMin  = oh * 60 + om;
        const closeMin = ch * 60 + cm;

        if (nowMin >= openMin && nowMin < closeMin) {
          setIsOpen(true);
          setNextChange(`Cierra a las ${todayH.close}`);
        } else if (nowMin < openMin) {
          setIsOpen(false);
          setNextChange(`Abre hoy a las ${todayH.open}`);
        } else {
          // Ya pasó el horario de hoy — buscar próximo día abierto
          setIsOpen(false);
          for (let i = 1; i <= 7; i++) {
            const nextIdx = (dayIndex + i) % 7;
            const nextDay = days[nextIdx];
            if (hours[nextDay]?.enabled) {
              const label = i === 1 ? 'mañana' : `el ${dayNames[nextIdx]}`;
              setNextChange(`Abre ${label} a las ${hours[nextDay].open}`);
              break;
            }
          }
        }
      })
      .catch(() => { /* silencioso */ });
  }, [slug]);

  return { isOpen, nextChange };
}

// ── Skeleton components ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="w-full rounded-2xl p-4 flex items-center gap-4 animate-pulse" style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div className="w-16 h-16 rounded-xl shrink-0" style={{ backgroundColor: '#27272a' }} />
      <div className="flex-1 space-y-2">
        <div className="h-4 rounded-lg w-2/3" style={{ backgroundColor: '#27272a' }} />
        <div className="h-3 rounded-lg w-4/5" style={{ backgroundColor: '#27272a' }} />
        <div className="h-3 rounded-lg w-1/2" style={{ backgroundColor: '#27272a' }} />
      </div>
      <div className="h-5 w-16 rounded-lg shrink-0" style={{ backgroundColor: '#27272a' }} />
    </div>
  );
}

function SkeletonTabs() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {[72, 88, 64, 96, 80].map((w, i) => (
        <div
          key={i}
          className="shrink-0 h-7 rounded-full animate-pulse"
          style={{ width: w, backgroundColor: '#27272a' }}
        />
      ))}
    </div>
  );
}

// ── ProductCard component ───────────────────────────────────────
function ProductCard({
  product,
  quantity,
  themeColor,
  onAdd,
  onRemove,
  onClick,
  isBusinessOpen = true,
}: {
  product:         Product;
  quantity:        number;
  themeColor:      string;
  onAdd:           () => void;
  onRemove:        () => void;
  onClick?:        () => void;
  isBusinessOpen?: boolean | null;
}) {
  const isAvailable      = product.available !== false;
  const canAdd           = isAvailable && isBusinessOpen !== false;
  const fallbackEmoji    = product.emoji ?? '🍽️';
  const inCart           = quantity > 0;

  return (
    <div
      onClick={isAvailable && onClick ? onClick : undefined}
      className={`bg-white border border-gray-100 shadow-sm rounded-xl p-3 flex items-center gap-3 hover:shadow-md transition-shadow
        ${isAvailable && onClick ? 'cursor-pointer' : ''}
        ${!isAvailable ? 'opacity-55' : ''}
      `}
    >
      {/* Imagen / emoji — solo si existe */}
      {(product.image || product.emoji) && (
        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50 flex items-center justify-center relative">
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              className={`w-full h-full object-cover ${!isAvailable ? 'grayscale' : ''}`}
              loading="lazy"
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <span className="text-4xl select-none">{fallbackEmoji}</span>
          )}
          {inCart && (
            <div
              className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
              style={{ backgroundColor: themeColor }}
            >
              {quantity}
            </div>
          )}
        </div>
      )}

      {/* Info + Precio/Botón — proximidad semántica */}
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        {/* Zona superior: Info */}
        <div>
          <p className="font-semibold text-gray-800 text-sm truncate">{product.name.toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())}</p>
          {product.description && (
            <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">{product.description}</p>
          )}
          {product.tags && product.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {product.tags.map((tag: string) => <ProductTag key={tag} tag={tag} />)}
            </div>
          )}
          {!isAvailable && (
            <span className="inline-block mt-1 text-[10px] font-medium text-gray-400 px-2 py-0.5 rounded-full bg-gray-100">
              No disponible hoy
            </span>
          )}
        </div>

        {/* Zona inferior: Precio + Acción juntos */}
        <div className="flex items-center justify-between mt-2" onClick={e => e.stopPropagation()}>
          {!isAvailable ? (
            <span className="font-bold text-gray-400 text-sm line-through">{fmtCLP(product.price)}</span>
          ) : (
            <span className="font-extrabold text-xl" style={{ color: themeColor }}>{fmtCLP(product.price)}</span>
          )}
          {isAvailable && (
            canAdd ? (
              inCart ? (
                <div className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-1">
                  <button
                    onClick={onRemove}
                    className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
                    aria-label={`Quitar ${product.name}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-gray-900 w-5 text-center text-sm">{quantity}</span>
                  <button
                    onClick={onAdd}
                    className="w-8 h-8 rounded-full shadow-sm flex items-center justify-center text-white hover:opacity-90 transition-colors"
                    style={{ backgroundColor: themeColor }}
                    aria-label={`Agregar ${product.name}`}
                  >
                    <Plus className="w-4 h-4 text-white" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={onAdd}
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all flex-shrink-0"
                  style={{ backgroundColor: themeColor }}
                  aria-label={`Agregar ${product.name}`}
                >
                  <Plus className="w-4 h-4 text-white" />
                </button>
              )
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 opacity-40"
                title="Negocio cerrado"
              >
                <Plus className="w-4 h-4 text-gray-400" />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

// ── Componentes auxiliares del CartSheet ────────────────────────────────────
// CRÍTICO: definidos FUERA de CartSheet para que React no los destruya
// en cada render. Si estuvieran adentro, cada keystroke en un input
// causaría una redefinición → React ve nuevo tipo de componente →
// desmonta el árbol → el input pierde el foco.
function FieldErr({ errors, k }: { errors: Record<string, string>; k: string }) {
  if (!errors[k]) return null;
  return <p className="text-red-400 text-xs mt-1">{errors[k]}</p>;
}

function TypeBtn({
  emoji,
  title,
  sub,
  hoverColor,
  onSelect,
}: {
  emoji:      string;
  title:      string;
  sub:        string;
  hoverColor: string;
  onSelect:   () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex items-center gap-5 p-5 rounded-2xl border-2 border-gray-700 hover:border-gray-500 bg-white/[0.04] transition-all active:scale-[0.98] text-left w-full group"
    >
      <div className="text-4xl shrink-0">{emoji}</div>
      <div className="flex-1">
        <div className="text-white font-bold text-base group-hover:text-orange-400 transition-colors">{title}</div>
        <div className="text-gray-400 text-sm mt-0.5">{sub}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-500 group-hover:text-orange-400 transition-colors shrink-0" />
    </button>
  );
}

// ── Cart Sheet — flujo multi-paso ─────────────────────────────
type OrderStep = 'cart' | 'type' | 'form' | 'payment' | 'success';
type OrderType = 'mostrador' | 'delivery';

type PaymentMethod = string;   // dinámico desde Backend

const FALLBACK_PAYMENT_METHODS: Array<{ id: string; name: string }> = [
  { id: 'efectivo',      name: 'Efectivo'      },
  { id: 'debito',        name: 'Débito'        },
  { id: 'credito',       name: 'Crédito'       },
  { id: 'transferencia', name: 'Transferencia' },
];

const PAYMENT_ICON: Record<string, string> = {
  efectivo:      '💵',
  'débito':      '💳',
  debito:        '💳',
  'crédito':     '💳',
  credito:       '💳',
  transferencia: '📱',
};
const PAYMENT_DESC: Record<string, string> = {
  efectivo:      'Pagas al recibir',
  'débito':      'Redcompra / Maestro',
  debito:        'Redcompra / Maestro',
  'crédito':     'Visa / Mastercard',
  credito:       'Visa / Mastercard',
  transferencia: 'Depósito / Transbank',
};

// ── Definidos FUERA de CartSheet para evitar que React los destruya
// en cada re-render, causando pérdida de foco en inputs ─────────────
function SheetWrap({
  children,
  onClose,
  noOverlayClose = false,
}: {
  children:       React.ReactNode;
  onClose:        () => void;
  noOverlayClose?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
      onClick={noOverlayClose ? undefined : onClose}
    >
      <div
        className="rounded-t-3xl w-full max-w-xl flex flex-col max-h-[92vh] overflow-hidden"
        style={{ backgroundColor: '#0d0d14', border: '1px solid rgba(255,255,255,0.07)', borderBottom: 'none' }}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function SheetTopBar({
  title,
  onClose,
  onBack,
}: {
  title:    React.ReactNode;
  onClose:  () => void;
  onBack?:  () => void;
}) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2">
        {onBack && (
          <button onClick={onBack} className="text-zinc-400 hover:text-white transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <h2 className="font-bold text-white text-lg">{title}</h2>
      </div>
      <button
        onClick={onClose}
        className="text-zinc-500 hover:text-white transition-colors p-1.5 rounded-lg"
        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// ── CartaHero ────────────────────────────────────────────────────────────
function CartaHero({
  name,
  tagline,
  logo,
  themeColor,
  isOpen,
  nextChange,
  tableNumber,
  bannerUrl,
}: {
  name:        string;
  tagline:     string | null;
  logo:        string | null;
  themeColor:  string;
  isOpen:      boolean | null;
  nextChange:  string;
  tableNumber: string | null;
  bannerUrl?:  string | null;
}) {
  const initials = name.slice(0, 2).toUpperCase();
  const [logoError, setLogoError] = useState(false);

  return (
    <div className="w-full" style={{ position: 'relative' }}>
      {/* Gradiente hero / Banner */}
      <div
        style={{
          width: '100%',
          minHeight: '180px',
          position: 'relative',
          overflow: 'hidden',
          backgroundImage: bannerUrl
            ? `url(${bannerUrl.trim()})`
            : `linear-gradient(135deg, ${themeColor}dd 0%, ${themeColor}88 40%, ${themeColor}22 75%, #09090b 100%)`,
          backgroundSize: bannerUrl ? 'cover' : undefined,
          backgroundPosition: bannerUrl ? 'center' : undefined,
          backgroundRepeat: bannerUrl ? 'no-repeat' : undefined,
        }}
      >
        {/* Overlay degradado cuando hay banner */}
        {bannerUrl && <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />}
        <div style={{
          position: 'absolute',
          top: '-20px',
          right: '-20px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          backgroundColor: themeColor,
          filter: 'blur(60px)',
          opacity: 0.25,
        }} />
      </div>
      <div className="py-6 px-6 relative z-10" style={{ marginTop: bannerUrl ? '-60px' : '-48px', position: 'relative' }}>
        {tableNumber && (
          <div
            className="flex items-center justify-center gap-2 mb-3 py-1.5 px-3 rounded-xl text-xs font-semibold"
            style={{ backgroundColor: `${themeColor}22`, color: themeColor, border: `1px solid ${themeColor}40` }}
          >
            🧉 Mesa {tableNumber}
          </div>
        )}
        <div className="flex items-center gap-4">
        {logo && !logoError
          ? <img src={logo} alt={name} className="w-[72px] h-[72px] rounded-full object-contain shrink-0 border-[3px] border-white shadow-xl" style={{ backgroundColor: '#18181b' }} onError={() => setLogoError(true)} />
          : <div
              className="w-[72px] h-[72px] rounded-full flex items-center justify-center shrink-0 font-black text-white text-xl border-[3px] border-white shadow-xl"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)`, boxShadow: `0 4px 20px ${themeColor}40` }}
            >{initials}</div>
        }
        <div className="flex-1 min-w-0">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white leading-tight truncate drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{name}</h1>
          {tagline && <p className="text-base text-white/80 font-medium mt-1 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">{tagline}</p>}
          {isOpen !== null && (
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: isOpen ? '#22c55e' : '#ef4444' }} />
              <span className="text-[11px]" style={{ color: isOpen ? '#86efac' : '#fca5a5' }}>
                {isOpen
                  ? `Abierto · ${nextChange}`
                  : nextChange
                    ? `Cerrado · ${nextChange}`
                    : 'Cerrado'
                }
              </span>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

// ── CartaNavbar ─────────────────────────────────────────────────────────
function CartaNavbar({
  searchQuery,
  onSearchChange,
  themeColor: _themeColor,
}: {
  searchQuery:    string;
  onSearchChange: (v: string) => void;
  categories:     Category[];
  activeTab:      string;
  onTabChange:    (id: string) => void;
  themeColor:     string;
}) {
  return (
    <div className="px-6 pb-3 w-full">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Buscar en el menú..."
          className="w-full rounded-xl pl-9 pr-10 py-2 text-sm text-white focus:outline-none transition-colors"
          style={{ backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff' }}
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ── CartaFloatingCart ────────────────────────────────────────────────
function CartaFloatingCart({
  count,
  total,
  themeColor,
  onClick,
}: {
  count:      number;
  total:      number;
  themeColor: string;
  onClick:    () => void;
}) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4">
      <button
        onClick={onClick}
        className="w-full max-w-[420px] flex items-center justify-between px-5 py-4 rounded-2xl text-white font-bold active:scale-[0.97] transition-all"
        style={{
          background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)`,
          boxShadow: `0 8px 32px ${themeColor}55`,
        }}
      >
        <span
          className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-black animate-pulse"
          style={{ backgroundColor: 'rgba(0,0,0,0.25)' }}
        >
          {count}
        </span>
        <span className="flex items-center gap-2">
          <ShoppingCart className="w-4 h-4" /> Ver pedido
        </span>
        <span className="font-black">{fmtCLP(total)}</span>
      </button>
    </div>
  );
}

function CartSheet({
  cart,
  tableNumber,
  tenantSlug,
  themeColor,
  paymentMethods,
  onClose,
  onUpdate,
  onOrderSuccess,
}: {
  cart:             CartItem[];
  tableNumber:      string | null;
  tenantSlug:       string | null;
  themeColor:       string;
  paymentMethods:   Array<{ id: string; name: string }>;
  onClose:          () => void;
  onUpdate:         (productId: string, delta: number) => void;
  onOrderSuccess:   () => void;
}) {
  const [step,          setStep]          = useState<OrderStep>('cart');
  const [orderType,     setOrderType]     = useState<OrderType | null>(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [orderNumber,   setOrderNumber]   = useState<string | null>(null);
  const [submitError,   setSubmitError]   = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', address: '', city: '', comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount,    setCashAmount]    = useState('');

  const stepNumber: Record<OrderStep, number> = { cart: 1, type: 2, form: 3, payment: 4, success: 5 };
  const sn = stepNumber[step];

  const total    = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const totalQty = cart.reduce((s, i) => s + i.quantity, 0);

  const setField = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
    setErrors(err => ({ ...err, [k]: '' }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim())  e.name  = 'El nombre es obligatorio';
    const digits = form.phone.replace(/\D/g, '');
    if (!digits)             e.phone = 'El teléfono es obligatorio';
    else if (digits.length < 8) e.phone = 'Mínimo 8 dígitos';
    if (orderType === 'delivery' && !form.address.trim()) e.address = 'La dirección es obligatoria';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/public/orders', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tableNumber:     tableNumber ?? null,
          tenantSlug:      tenantSlug  ?? null,
          orderType:       orderType,
          customerName:    form.name.trim(),
          customerPhone:   form.phone.trim(),
          customerAddress: orderType === 'delivery' ? form.address.trim() : null,
          customerCity:    orderType === 'delivery' ? form.city.trim() || null : null,
          deliveryFee:     0,
          notes:           form.comment.trim() || null,
          paymentMethod:   paymentMethod ?? paymentMethods[0]?.id ?? 'efectivo',
          cashAmount:      paymentMethod === 'efectivo' && cashAmount
                             ? parseInt(cashAmount)
                             : null,
          items: cart.map(i => ({
            productId: i.product.id,
            name:      i.product.name,
            price:     i.product.price,
            quantity:  i.quantity,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setOrderNumber(json.orderNumber);
        setStep('success');
        onOrderSuccess();
      } else {
        setSubmitError(json.error ?? 'No se pudo enviar el pedido. Intenta nuevamente.');
      }
    } catch {
      setSubmitError('No se pudo enviar el pedido. Verifica tu conexión e intenta nuevamente.');
    } finally { setSubmitting(false); }
  };

  // ── PASO 4: ÉXITO ─────────────────────────────────────────────
  if (step === 'success') {
    return (
      <SheetWrap onClose={onClose} noOverlayClose>
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div
            className="w-20 h-20 rounded-full flex items-center justify-center mb-6 bounce-in"
            style={{ backgroundColor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-white text-2xl font-bold mb-2 fade-up fade-up-1">¡Pedido enviado! 🎉</h2>
          <p className="text-zinc-400 text-sm mb-4 fade-up fade-up-1">
            {orderType === 'delivery'
              ? 'En breve salimos a tu dirección'
              : 'En breve el personal preparará tu pedido'}
          </p>
          {orderNumber && (
            <div
              className="rounded-2xl px-6 py-4 mb-6 fade-up fade-up-2"
              style={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <div className="text-zinc-500 text-xs mb-1">Número de pedido</div>
              <div className="text-2xl font-bold" style={{ color: themeColor }}>{orderNumber}</div>
            </div>
          )}
          {tableNumber && (
            <p className="text-zinc-500 text-sm mb-6 fade-up fade-up-2">Mesa {tableNumber}</p>
          )}
          <button
            onClick={onClose}
            className="w-full py-4 text-white rounded-2xl font-bold transition-all active:scale-[0.98] fade-up fade-up-3"
            style={{ background: themeColor, boxShadow: `0 8px 24px ${themeColor}40` }}
          >
            Volver al menú
          </button>
        </div>
      </SheetWrap>
    );
  }

  // ── PASO 4: MÉTODO DE PAGO ───────────────────────────────────
  if (step === 'payment') {
    const cashNum    = parseInt(cashAmount) || 0;
    const change     = cashNum - total;
    const canConfirm = paymentMethod !== null &&
                       (paymentMethod !== 'efectivo' || cashAmount.trim() !== '');

    const colorActiveMap: Record<PaymentMethod, string> = {
      efectivo:      'border-green-500 bg-green-500/10',
      debito:        'border-blue-500 bg-blue-500/10',
      credito:       'border-purple-500 bg-purple-500/10',
      transferencia: 'border-orange-500 bg-orange-500/10',
    };

    // Montos sugeridos para efectivo (únicos, hasta 4)
    const suggestedAmounts = [
      total,
      Math.ceil(total / 1000)  * 1000,
      Math.ceil(total / 5000)  * 5000,
      Math.ceil(total / 10000) * 10000,
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4);

    const isEfectivo = paymentMethod === 'efectivo';

    return (
      <SheetWrap onClose={onClose}>
        <SheetTopBar title="💳 Método de pago" onClose={onClose} onBack={() => setStep('form')} />

        {/* Indicador de Progreso */}
        <div className="flex items-center justify-center gap-1 py-3 px-4 text-xs font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className={sn >= 1 ? 'text-orange-500' : 'text-gray-500'}>① Carrito</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 2 ? 'text-orange-500' : 'text-gray-500'}>② Entrega</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 3 ? 'text-orange-500' : 'text-gray-500'}>③ Datos</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 4 ? 'text-orange-500' : 'text-gray-500'}>④ Pago</span>
        </div>

        {/* Mini Resumen del Pedido */}
        <div
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          onClick={() => setStep('cart')}
        >
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShoppingCart className="w-4 h-4" />
            <span>{cart.length} producto{cart.length !== 1 ? 's' : ''} en el carrito</span>
          </div>
          <span className="text-sm font-bold" style={{ color: themeColor }}>{fmtCLP(total)}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Total */}
          <div className="bg-gray-800/60 rounded-xl p-3 flex justify-between">
            <span className="text-gray-400 text-sm">Total a pagar</span>
            <span className="text-orange-400 font-bold text-lg">{fmtCLP(total)}</span>
          </div>

          {/* Lista vertical de métodos */}
          <div className="flex flex-col gap-3">
            {paymentMethods.map(method => {
              const isActive = paymentMethod === method.id;
              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setPaymentMethod(method.id);
                    if (method.id !== 'efectivo') setCashAmount('');
                  }}
                  className="w-full flex items-center gap-3 p-4 border-2 rounded-xl transition-all duration-200 active:scale-[0.98]"
                  style={{
                    borderColor: isActive ? themeColor : 'rgba(255,255,255,0.1)',
                    backgroundColor: isActive ? `${themeColor}15` : 'rgba(255,255,255,0.04)',
                  }}
                >
                  <span className="text-2xl">{PAYMENT_ICON[method.name.toLowerCase()] ?? PAYMENT_ICON[method.id] ?? '💰'}</span>
                  <div className="flex-1 text-left">
                    <span className={`font-semibold text-sm ${isActive ? 'text-white' : 'text-gray-300'}`}>
                      {method.name}
                    </span>
                    <p className="text-xs text-gray-500">{PAYMENT_DESC[method.name.toLowerCase()] ?? PAYMENT_DESC[method.id] ?? ''}</p>
                  </div>
                  {isActive && <CheckCircle className="w-5 h-5 shrink-0" style={{ color: themeColor }} />}
                </button>
              );
            })}
          </div>

          {/* Campo monto efectivo */}
          {isEfectivo && (
            <div className="bg-green-900/20 border border-green-700/50 rounded-2xl p-4 space-y-3">
              <label className="block text-sm font-medium text-green-300">
                💵 ¿Con cuánto pagas?
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold text-lg">$</span>
                <input
                  type="number"
                  value={cashAmount}
                  onChange={e => setCashAmount(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="20000"
                  inputMode="numeric"
                  className="w-full bg-gray-800 text-white text-lg font-bold pl-8 pr-4 py-3 rounded-xl border border-green-700 placeholder-gray-500 focus:outline-none focus:border-green-400"
                  style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
                />
              </div>

              {/* Vuelto */}
              {cashAmount && cashNum >= total && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Vuelto estimado:</span>
                  <span className="text-green-400 font-semibold">{fmtCLP(change)}</span>
                </div>
              )}
              {cashAmount && cashNum < total && (
                <p className="text-red-400 text-xs">⚠️ El monto es menor al total</p>
              )}

              {/* Atajos */}
              <div className="flex gap-2 flex-wrap">
                {suggestedAmounts.map(amount => (
                  <button
                    key={amount}
                    onClick={() => setCashAmount(String(amount))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                      cashAmount === String(amount)
                        ? 'bg-green-500/20 border-green-500 text-green-300'
                        : 'border-gray-600 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {fmtCLP(amount)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700/50 shrink-0 space-y-2">
          {submitError && (
            <div
              className="rounded-xl px-4 py-3 text-sm text-red-300 flex items-start gap-2"
              style={{ backgroundColor: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <span className="shrink-0">⚠️</span>
              <span>{submitError}</span>
            </div>
          )}
          <button
            onClick={handleSubmit}
            disabled={!canConfirm || submitting}
            className={`w-full py-4 rounded-2xl text-white font-extrabold text-lg tracking-wide transition-all duration-200 ${canConfirm && !submitting ? 'bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] active:scale-[0.98]' : 'bg-gray-300 cursor-not-allowed shadow-none'}`}
          >
            {submitting ? '⏳ Enviando...' : `✅ Confirmar pedido · ${fmtCLP(total)}`}
          </button>
          {!paymentMethod && (
            <p className="text-center text-gray-500 text-xs">Selecciona un método de pago</p>
          )}
        </div>
      </SheetWrap>
    );
  }

  // ── PASO 3: FORMULARIO ────────────────────────────────────────
  if (step === 'form') {
    const isDelivery = orderType === 'delivery';
    const inputCls = (k: string) =>
      `w-full bg-gray-800 text-white placeholder-gray-400 rounded-xl px-4 py-3 border focus:outline-none transition-colors [&:-webkit-autofill]:![box-shadow:inset_0_0_0_1000px_#1f2937] [&:-webkit-autofill]:![-webkit-text-fill-color:white] ${
        errors[k] ? 'border-red-500' : 'border-gray-700 focus:border-orange-500'
      }`;

    return (
      <SheetWrap onClose={onClose}>
        <SheetTopBar
          title={isDelivery ? '🛵 Datos de delivery' : '🏪 Datos del pedido'}
          onClose={onClose}
        />

        {/* Indicador de Progreso */}
        <div className="flex items-center justify-center gap-1 py-3 px-4 text-xs font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className={sn >= 1 ? 'text-orange-500' : 'text-gray-500'}>① Carrito</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 2 ? 'text-orange-500' : 'text-gray-500'}>② Entrega</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 3 ? 'text-orange-500' : 'text-gray-500'}>③ Datos</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 4 ? 'text-orange-500' : 'text-gray-500'}>④ Pago</span>
        </div>

        {/* Mini Resumen del Pedido */}
        <div
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          onClick={() => setStep('cart')}
        >
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShoppingCart className="w-4 h-4" />
            <span>{cart.length} producto{cart.length !== 1 ? 's' : ''} en el carrito</span>
          </div>
          <span className="text-sm font-bold" style={{ color: themeColor }}>{fmtCLP(total)}</span>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Resumen compacto */}
          <div className="bg-gray-800/60 rounded-xl p-3 flex justify-between text-sm">
            <span className="text-gray-400">{totalQty} producto{totalQty !== 1 ? 's' : ''}</span>
            <span className="text-orange-400 font-semibold">{fmtCLP(total)}</span>
          </div>

          {/* NOMBRE */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Nombre <span className="text-red-400">*</span>
            </label>
            <input
              type="text" value={form.name} onChange={setField('name')}
              placeholder="¿Cómo te llamamos?" autoComplete="name"
              className={inputCls('name')}
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
            />
            <FieldErr errors={errors} k="name" />
          </div>

          {/* TELÉFONO */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Teléfono de contacto <span className="text-red-400">*</span>
            </label>
            <input
              type="tel" value={form.phone} inputMode="tel" autoComplete="tel"
              onChange={e => {
                const v = e.target.value.replace(/[^\d+\s\-]/g, '');
                setForm(f => ({ ...f, phone: v }));
                setErrors(err => ({ ...err, phone: '' }));
              }}
              placeholder="+56 9 1234 5678"
              className={inputCls('phone')}
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
            />
            <FieldErr errors={errors} k="phone" />
            <p className="text-gray-500 text-xs mt-1">Mínimo 8 dígitos</p>
          </div>

          {/* DIRECCIÓN — solo delivery */}
          {isDelivery && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                Dirección de entrega <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.address} onChange={setField('address')} rows={3}
                placeholder="Calle, número, piso, referencias..."
                className={`${inputCls('address')} resize-none`}
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
              />
              <FieldErr errors={errors} k="address" />
            </div>
          )}

          {/* CIUDAD — solo delivery */}
          {isDelivery && (
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1.5">
                Ciudad <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <input
                type="text" value={form.city} onChange={setField('city')}
                placeholder="Chillán, Santiago, Concepción..."
                className={inputCls('city')}
                style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
              />
            </div>
          )}

          {/* COMENTARIO */}
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1.5">
              Comentario <span className="text-gray-500 font-normal">(opcional)</span>
            </label>
            <textarea
              value={form.comment} onChange={setField('comment')} rows={2}
              placeholder="Sin cebolla, alergia al gluten, punto de cocción..."
              className="w-full bg-gray-800 text-white placeholder-gray-400 rounded-xl px-4 py-3 border border-gray-700 focus:border-orange-500 focus:outline-none resize-none"
              style={{ color: '#ffffff', WebkitTextFillColor: '#ffffff', backgroundColor: '#1f2937' }}
            />
          </div>
        </div>

        <div className="p-4 border-t border-gray-700/50 shrink-0">
          <button
            onClick={() => { if (validate()) setStep('payment'); }}
            disabled={submitting}
            className="w-full py-4 disabled:opacity-60 text-white font-extrabold text-lg tracking-wide rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-200"
          >
            Ir a pagar →
          </button>
          <p className="text-center text-gray-500 text-xs mt-2">
            {isDelivery ? '🛵 Delivery a tu dirección' : '🏪 Retiro en mostrador'}
          </p>
        </div>
      </SheetWrap>
    );
  }

  // ── PASO 2: TIPO DE PEDIDO ───────────────────────────────────
  if (step === 'type') {
    return (
      <SheetWrap onClose={onClose}>
        <SheetTopBar title="¿Cómo lo quieres?" onClose={onClose} onBack={() => setStep('cart')} />

        {/* Indicador de Progreso */}
        <div className="flex items-center justify-center gap-1 py-3 px-4 text-xs font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className={sn >= 1 ? 'text-orange-500' : 'text-gray-500'}>① Carrito</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 2 ? 'text-orange-500' : 'text-gray-500'}>② Entrega</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 3 ? 'text-orange-500' : 'text-gray-500'}>③ Datos</span>
          <ChevronRight className="w-3 h-3 text-gray-600" />
          <span className={sn >= 4 ? 'text-orange-500' : 'text-gray-500'}>④ Pago</span>
        </div>

        {/* Mini Resumen del Pedido */}
        <div
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/[0.03] transition-colors"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          onClick={() => setStep('cart')}
        >
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <ShoppingCart className="w-4 h-4" />
            <span>{cart.length} producto{cart.length !== 1 ? 's' : ''} en el carrito</span>
          </div>
          <span className="text-sm font-bold" style={{ color: themeColor }}>{fmtCLP(total)}</span>
        </div>

        <div className="flex-1 p-6 flex flex-col justify-center gap-4">
          <div className="flex gap-3">
            <button 
              className="flex-1 flex flex-col items-center gap-2 p-5 border-2 rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{ 
                borderColor: orderType === 'mostrador' ? themeColor : 'rgba(255,255,255,0.1)',
                backgroundColor: orderType === 'mostrador' ? `${themeColor}15` : 'rgba(255,255,255,0.04)'
              }}
              onClick={() => { setOrderType('mostrador'); setStep('form'); }}
            >
              <span className="text-3xl">🏪</span>
              <span className="font-semibold text-white text-sm">Mostrador / Mesa</span>
              <span className="text-xs text-gray-400 text-center">Retiro en el local o te lo llevamos a la mesa</span>
            </button>
            <button 
              className="flex-1 flex flex-col items-center gap-2 p-5 border-2 rounded-xl transition-all duration-200 active:scale-[0.97]"
              style={{ 
                borderColor: orderType === 'delivery' ? themeColor : 'rgba(255,255,255,0.1)',
                backgroundColor: orderType === 'delivery' ? `${themeColor}15` : 'rgba(255,255,255,0.04)'
              }}
              onClick={() => { setOrderType('delivery'); setStep('form'); }}
            >
              <span className="text-3xl">🛵</span>
              <span className="font-semibold text-white text-sm">Delivery</span>
              <span className="text-xs text-gray-400 text-center">Te lo llevamos a tu domicilio</span>
            </button>
          </div>
          <p className="text-center text-gray-500 text-sm">
            Total: <span className="text-orange-400 font-semibold">{fmtCLP(total)}</span>
          </p>
        </div>
      </SheetWrap>
    );
  }

  // ── PASO 1: CARRITO ──────────────────────────────────────────
  return (
    <SheetWrap onClose={onClose}>
      <SheetTopBar
        title={
          <span className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" style={{ color: themeColor }} />
            Tu pedido
            {tableNumber && <span className="text-sm font-normal" style={{ color: themeColor }}>· Mesa {tableNumber}</span>}
          </span>
        }
        onClose={onClose}
      />

      {/* Indicador de Progreso */}
      <div className="flex items-center justify-center gap-1 py-3 px-4 text-xs font-bold" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <span className={sn >= 1 ? 'text-orange-500' : 'text-gray-500'}>① Carrito</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className={sn >= 2 ? 'text-orange-500' : 'text-gray-500'}>② Entrega</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className={sn >= 3 ? 'text-orange-500' : 'text-gray-500'}>③ Datos</span>
        <ChevronRight className="w-3 h-3 text-gray-600" />
        <span className={sn >= 4 ? 'text-orange-500' : 'text-gray-500'}>④ Pago</span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3">
        {cart.map(item => (
          <div key={item.product.id} className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-lg bg-gray-800 shrink-0 flex items-center justify-center overflow-hidden">
              {item.product.image
                ? <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                : <span className="text-xl">{item.product.emoji ?? '🍽️'}</span>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{item.product.name}</p>
              <p className="text-xs font-semibold" style={{ color: themeColor }}>{fmtCLP(item.product.price)}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => onUpdate(item.product.id, -1)}
                className="w-7 h-7 bg-gray-700 hover:bg-gray-600 rounded-full flex items-center justify-center transition-colors"
              >
                {item.quantity === 1
                  ? <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  : <Minus className="w-3.5 h-3.5 text-gray-300" />
                }
              </button>
              <span className="w-5 text-center text-white font-bold text-sm">{item.quantity}</span>
              <button
                onClick={() => onUpdate(item.product.id, +1)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-colors"
                style={{ background: themeColor }}
              >
                <Plus className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <span className="text-sm font-semibold text-white shrink-0 w-16 text-right">
              {fmtCLP(item.product.price * item.quantity)}
            </span>
          </div>
        ))}
      </div>

      <div className="px-5 pb-6 pt-3 border-t border-gray-800 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-400 text-sm">{totalQty} {totalQty === 1 ? 'ítem' : 'ítems'}</span>
          <span className="text-white font-black text-xl">{fmtCLP(total)}</span>
        </div>
        <button
          onClick={() => setStep('type')}
          disabled={cart.length === 0}
          className="w-full py-4 disabled:opacity-40 text-white font-extrabold text-base tracking-wide rounded-2xl bg-gradient-to-r from-orange-500 to-red-500 shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-200"
        >
          Elegir forma de entrega →
        </button>
        <p className="text-center text-xs text-gray-600">
          El personal de sala recibirá tu pedido
        </p>
      </div>
    </SheetWrap>
  );
}

/** Página pública de carta digital — /carta */
export default function CartaDigital() {
  const { slug: slugFromPath } = useParams<{ slug?: string }>();
  const [searchParams]  = useSearchParams();
  const mesaNumber      = searchParams.get('mesa');
  const tenantSlug      = slugFromPath ?? searchParams.get('t') ?? null;
  const { isOpen, nextChange } = useBusinessHours(tenantSlug);

  const [categories,    setCategories]    = useState<Category[]>([]);
  const [cartaSettings, setCartaSettings] = useState<CartaSettings | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [activeTab,     setActiveTab]     = useState('');
  const [search,        setSearch]        = useState('');
  const [selected,      setSelected]      = useState<Product | null>(null);
  const [retryCount,    setRetryCount]    = useState(0);
  const [activeTag,     setActiveTag]     = useState<string | null>(null);
  const [modalQty,     setModalQty]     = useState(1);

  // ── Cart state ────────────────────────────────────────────────
  const [cart,     setCart]     = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const addToCart = useCallback((product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
  }, []);

  const updateCartItem = useCallback((productId: string, delta: number) => {
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: i.quantity + delta } : i).filter(i => i.quantity > 0));
  }, []);

  const totalCartQty = cart.reduce((s, i) => s + i.quantity, 0);
  const totalCartAmt = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartQtyMap   = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    for (const i of cart) m[i.product.id] = i.quantity;
    return m;
  }, [cart]);

  const themeColor = cartaSettings?.themeColor ?? '#FF6B35';

  // Carga con retry automático (máx 2 veces, delay 2s)
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    const load = async () => {
      try {
        const params = new URLSearchParams();
        if (mesaNumber)  params.set('mesa', mesaNumber);
        if (tenantSlug)  params.set('slug', tenantSlug);
        const url = `/api/public/menu${params.size ? '?' + params.toString() : ''}`;
        const res  = await fetch(url);
        const json = await res.json();
        if (cancelled) return;
        const cats: Category[]    = json.data?.categories    ?? json.data ?? [];
        const cfg:  CartaSettings = json.data?.cartaSettings ?? null;
        setCategories(cats);
        if (cfg) setCartaSettings(cfg);
        if (cats.length > 0) setActiveTab(cats[0].id);
      } catch {
        if (cancelled) return;
        if (retryCount < 2) {
          setTimeout(() => setRetryCount(r => r + 1), 2000);
        } else {
          setError('No se pudo cargar el menú. Verifica tu conexión.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [retryCount, mesaNumber, tenantSlug]);

  const hideUnavailable = cartaSettings?.hideUnavailable ?? false;

  // Filtro — con useMemo para evitar recalcular en cada render
  const filtered = useMemo<Category[]>(() => {
    const q = search.trim().toLowerCase();
    let base: Category[];
    if (q) {
      base = categories
        .map(c => ({
          ...c,
          products: c.products.filter(p =>
            p.name.toLowerCase().includes(q) ||
            (p.description ?? '').toLowerCase().includes(q)
          ),
        }))
        .filter(c => c.products.length > 0);
    } else {
      // Mostrar todas las categorías en scroll continuo (sin filtro por tab)
      base = categories;
    }
    if (hideUnavailable) {
      base = base
        .map(c => ({ ...c, products: c.products.filter(p => p.available !== false) }))
        .filter(c => c.products.length > 0);
    }
    if (activeTag) {
      base = base
        .map(c => ({ ...c, products: c.products.filter(p => p.tags?.includes(activeTag)) }))
        .filter(c => c.products.length > 0);
    }
    return base;
  }, [categories, activeTab, search, activeTag, hideUnavailable]);

  const filteredCount = filtered.reduce((s, c) => s + c.products.length, 0);

  // Tags disponibles en todo el menú
  const availableTags = useMemo(() => {
    const all = categories.flatMap(c => c.products.flatMap(p => p.tags ?? []));
    return [...new Set(all)] as string[];
  }, [categories]);

  if (loading) {
    return (
      <div className="min-h-screen text-white" style={{ backgroundColor: '#09090b' }}>
        <div className="sticky top-0 z-20" style={{ backgroundColor: 'rgba(9,9,11,0.97)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 pt-5 pb-3 max-w-xl mx-auto animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl shrink-0" style={{ backgroundColor: '#27272a' }} />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 rounded-lg w-1/3" style={{ backgroundColor: '#27272a' }} />
                <div className="h-3 rounded-lg w-1/4" style={{ backgroundColor: '#27272a' }} />
              </div>
            </div>
            <div className="h-9 rounded-xl mb-2" style={{ backgroundColor: '#27272a' }} />
            <SkeletonTabs />
          </div>
        </div>
        <div className="max-w-xl mx-auto px-4 py-4 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center" style={{ backgroundColor: '#09090b' }}>
        <ShoppingBag className="w-12 h-12 text-gray-600" />
        <p className="text-gray-400">{error}</p>
        <button
          onClick={() => { setRetryCount(0); }}
          className="px-4 py-2 bg-orange-500 text-white rounded-xl text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // Estado menú vacío
  if (!loading && !error && categories.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center" style={{ backgroundColor: '#09090b' }}>
        <span className="text-6xl">🍽️</span>
        <h3 className="font-semibold text-gray-300 text-lg">Menú no disponible</h3>
        <p className="text-sm text-gray-500">
          El menú aún no ha sido configurado.<br />Consulta con el personal del local.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#09090b' }}>

      {/* ── Header con Banner integrado ──────────── */}
      <CartaHero
        name={cartaSettings?.restaurantName ?? 'Carta Digital'}
        tagline={cartaSettings?.tagline ?? null}
        logo={cartaSettings?.logo ?? null}
        themeColor={themeColor}
        isOpen={isOpen}
        nextChange={nextChange}
        tableNumber={mesaNumber}
        bannerUrl={cartaSettings?.bannerUrl ?? null}
      />

      {/* ── Barra de información de contacto ── */}
      {(cartaSettings?.address || cartaSettings?.phone || cartaSettings?.email || isOpen !== null) && (
        <div className="relative z-10 -mt-6 mx-4 md:mx-8 lg:mx-auto lg:max-w-5xl bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 px-5 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-700">
            {cartaSettings?.address && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                <span>{cartaSettings.address}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
              <span>
              {isOpen !== null
                    ? (isOpen ? `Abierto · ${nextChange}` : `Cerrado · ${nextChange}`)
                    : 'Horario no disponible'}
              </span>
            </div>
            {cartaSettings?.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                <span>{cartaSettings.phone}</span>
              </div>
            )}
            {cartaSettings?.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: themeColor }} />
                <span>{cartaSettings.email}</span>
              </div>
            )}
          </div>
      )}

      {/* ── 3. Barra de búsqueda + Categorías (full-width sticky) */}
      <div className="sticky top-0 z-40 shadow-sm" style={{ backgroundColor: 'rgba(9,9,11,0.80)', backdropFilter: 'blur(24px) saturate(1.5)', WebkitBackdropFilter: 'blur(24px) saturate(1.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <CartaNavbar
          searchQuery={search}
          onSearchChange={setSearch}
          categories={categories}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          themeColor={themeColor}
        />
        {categories.length > 1 && (
          <div className="w-full px-6 py-3 overflow-x-auto scrollbar-hide scroll-smooth flex gap-2">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveTab(cat.id);
                  document.getElementById(`cat-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
                  activeTab === cat.id
                    ? 'text-white shadow-sm font-bold'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={activeTab === cat.id ? { backgroundColor: themeColor } : undefined}
              >
                {cat.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Banner negocio cerrado */}
      {isOpen === false && (
        <div
          className="px-4 py-3 flex items-center gap-3 max-w-xl mx-auto w-full"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', borderBottom: '1px solid rgba(239,68,68,0.15)', borderTop: '1px solid rgba(239,68,68,0.15)' }}
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ backgroundColor: 'rgba(239,68,68,0.15)' }}
          >
            <Clock className="w-4 h-4" style={{ color: '#f87171' }} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: '#fca5a5' }}>Negocio cerrado</p>
            {nextChange && (
              <p className="text-[11px] text-zinc-400">{nextChange}</p>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Split-view: Productos + Carrito ─────────── */}
      <div className="w-full flex flex-col lg:flex-row min-h-screen">

        {/* ── Columna izquierda: Productos ── */}
        <div className="w-full lg:w-[65%] xl:w-[70%] p-4 md:p-6 space-y-4 bg-gray-50">

        {/* Chips de filtro por etiqueta */}
        {availableTags.length > 0 && (
          <div className="space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              <button
                onClick={() => setActiveTag(null)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  !activeTag ? 'bg-gray-700 text-white ring-1 ring-gray-500' : 'bg-gray-800/80 text-gray-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              {availableTags.map(tag => {
                const cfg = TAG_CONFIG[tag];
                if (!cfg) return null;
                return (
                  <button
                    key={tag}
                    onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium
                      transition-all flex items-center gap-1 border active:scale-95
                      ${ activeTag === tag
                        ? `${cfg.bg} ${cfg.text} border-current`
                        : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white hover:border-gray-500'
                      }`}
                  >
                    {cfg.emoji} {cfg.label}
                  </button>
                );
              })}
            </div>
            {/* Contador de resultados cuando hay filtro activo */}
            {activeTag && (
              <p className="text-xs text-gray-500 px-1">
                {filteredCount === 0
                  ? 'Sin productos con este filtro'
                  : `${filteredCount} producto${filteredCount !== 1 ? 's' : ''} encontrado${filteredCount !== 1 ? 's' : ''}`
                }
              </p>
            )}
          </div>
        )}

        {filtered.map(cat => (
          <div key={cat.id} id={`cat-${cat.id}`} className="scroll-mt-28">
            <div className="mt-6 mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">{cat.name}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {cat.products.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  quantity={cartQtyMap[product.id] ?? 0}
                  themeColor={themeColor}
                  isBusinessOpen={isOpen}
                  onAdd={() => addToCart(product)}
                  onRemove={() => updateCartItem(product.id, -1)}
                  onClick={() => setSelected(product)}
                />
              ))}
            </div>
          </div>
        ))}

        {filtered.length === 0 && (search || activeTag) && (
          <p className="text-center text-gray-600 py-12">
            {search
              ? `Sin resultados para "${search}"`
              : `Sin productos con el filtro "${TAG_CONFIG[activeTag!]?.label ?? activeTag}"`
            }
          </p>
        )}
        </div>{/* ── fin columna izquierda ── */}

        {/* ── Columna derecha: Carrito desktop ── */}
        <div className="hidden lg:flex lg:w-[35%] xl:w-[30%] flex-col bg-gray-50 border-l border-gray-200 sticky top-0 h-screen">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 bg-white">
            <h3 className="font-bold text-xl text-gray-900 flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" style={{ color: themeColor }} />
              Mi Pedido
              {totalCartQty > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold text-white" style={{ backgroundColor: themeColor }}>
                  {totalCartQty}
                </span>
              )}
            </h3>
          </div>
          {/* Items (scrollable) */}
          <div className="flex-1 overflow-y-auto p-6">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-4">
              <ShoppingBag className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-gray-500 text-sm font-medium">Tu pedido está vacío</p>
              <p className="text-gray-400 text-xs mt-1">Agrega productos para comenzar</p>
            </div>
          ) : (
            <div className="space-y-0">
              {cart.map((item, idx) => (
                <div key={item.product.id} className={`flex items-center gap-3 py-3 ${idx < cart.length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="w-10 h-10 rounded-lg bg-gray-100 shrink-0 flex items-center justify-center overflow-hidden">
                    {item.product.image
                      ? <img src={item.product.image} alt="" className="w-full h-full object-cover" />
                      : <span className="text-lg">{item.product.emoji ?? '🍽️'}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.product.name}</p>
                    <p className="text-xs text-gray-500" style={{ color: themeColor }}>{fmtCLP(item.product.price)} c/u</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => updateCartItem(item.product.id, -1)}
                      className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors bg-white"
                    >
                      {item.quantity === 1
                        ? <Trash2 className="w-3.5 h-3.5 text-red-400" />
                        : <Minus className="w-3.5 h-3.5 text-gray-400" />
                      }
                    </button>
                    <span className="w-5 text-center font-bold text-sm text-gray-900">{item.quantity}</span>
                    <button
                      onClick={() => updateCartItem(item.product.id, +1)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-all active:scale-95 shadow-sm"
                      style={{ backgroundColor: themeColor }}
                    >
                      <Plus className="w-3.5 h-3.5 text-white" />
                    </button>
                  </div>
                  <span className="text-sm font-bold text-gray-900 shrink-0 w-16 text-right">
                    {fmtCLP(item.product.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          )}
          </div>
          {/* Footer fijo */}
          {cart.length > 0 && (
            <div className="p-6 bg-white border-t border-gray-200 mt-auto">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-xl font-extrabold" style={{ color: themeColor }}>{fmtCLP(totalCartAmt)}</span>
              </div>
              <button
                onClick={() => setShowCart(true)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-extrabold text-lg tracking-wide shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-200"
              >
                Ver mi pedido →
              </button>
            </div>
          )}
          {cart.length === 0 && (
            <div className="p-6 bg-white border-t border-gray-200 mt-auto">
              <button
                disabled
                className="w-full py-4 rounded-xl bg-gray-300 text-white font-extrabold text-lg tracking-wide cursor-not-allowed shadow-none transition-all duration-200"
              >
                Completar pedido →
              </button>
            </div>
          )}
        </div>
      </div>{/* ── fin split-view ── */}

      {/* Botón flotante del carrito (solo mobile) */}
      <div className="lg:hidden">
      {!showCart && (
        <CartaFloatingCart
          count={totalCartQty}
          total={totalCartAmt}
          themeColor={themeColor}
          onClick={() => setShowCart(true)}
        />
      )}
      </div>

      {/* Cart Sheet */}
      {showCart && (
        <CartSheet
          cart={cart}
          tableNumber={mesaNumber}
          tenantSlug={tenantSlug}
          themeColor={themeColor}
          paymentMethods={cartaSettings?.paymentMethods ?? FALLBACK_PAYMENT_METHODS}
          onClose={() => setShowCart(false)}
          onUpdate={updateCartItem}
          onOrderSuccess={() => setCart([])}
        />
      )}

      {/* Modal detalle producto — estilo premium Rappi/UberEats */}
      {selected && (() => {
        const resetAndClose = () => { setSelected(null); setModalQty(1); };
        return (
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end md:items-center justify-center"
            onClick={resetAndClose}
          >
            <div
              className="bg-white rounded-t-3xl md:rounded-3xl shadow-2xl w-full max-w-lg mx-auto overflow-hidden safe-area-bottom"
              onClick={e => e.stopPropagation()}
            >
              {/* ── Cabecera: Imagen o Emoji ── */}
              <div className="relative">
                {selected.image ? (
                  <img
                    src={selected.image}
                    alt={selected.name}
                    className="w-full h-64 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-full h-64 bg-gray-50 flex items-center justify-center text-8xl">
                    {selected.emoji ?? '🍽️'}
                  </div>
                )}
                {/* Botón cerrar flotante */}
                <button
                  onClick={resetAndClose}
                  className="absolute top-4 right-4 bg-black/30 backdrop-blur-sm text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* ── Info del producto ── */}
              <div className="p-6 pb-0">
                <h2 className="text-2xl font-extrabold text-gray-900">
                  {selected.name}
                </h2>
                {selected.description && (
                  <p className="text-gray-500 mt-2 leading-relaxed">{selected.description}</p>
                )}
                {selected.tags && selected.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {selected.tags.map((tag: string) => (
                      <ProductTag key={tag} tag={tag} />
                    ))}
                  </div>
                )}
                {selected.available === false && (
                  <span className="inline-block mt-3 text-xs font-medium text-gray-400 px-2 py-1 rounded-full bg-gray-100">
                    No disponible hoy
                  </span>
                )}
                <p
                  className={`text-3xl font-extrabold mt-4 ${selected.available === false ? 'text-gray-400 line-through' : ''}`}
                  style={selected.available !== false ? { color: themeColor } : undefined}
                >
                  {fmtCLP(selected.price)}
                </p>
              </div>

              {/* ── Barra de acción inferior ── */}
              <div className="p-6 mt-6 border-t border-gray-100">
                {selected.available !== false && isOpen !== false ? (
                  <div className="flex items-center gap-4">
                    {/* Stepper */}
                    <div className="flex items-center gap-3 bg-gray-100 rounded-full px-2 py-1">
                      <button
                        onClick={() => setModalQty(q => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-orange-600 font-bold text-lg hover:bg-gray-50 transition-colors"
                      >
                        <Minus className="w-5 h-5" />
                      </button>
                      <span className="font-bold text-gray-900 w-8 text-center text-lg">{modalQty}</span>
                      <button
                        onClick={() => setModalQty(q => q + 1)}
                        className="w-10 h-10 rounded-full bg-orange-500 shadow-sm flex items-center justify-center text-white font-bold text-lg hover:bg-orange-600 transition-colors"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                    {/* Botón Agregar */}
                    <button
                      onClick={() => {
                        for (let i = 0; i < modalQty; i++) addToCart(selected);
                        resetAndClose();
                      }}
                      className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-extrabold text-lg shadow-lg shadow-orange-500/30 hover:shadow-xl hover:shadow-orange-500/40 hover:scale-[1.02] transition-all duration-200"
                    >
                      Agregar {fmtCLP(selected.price * modalQty)}
                    </button>
                  </div>
                ) : isOpen === false ? (
                  <div
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
                    style={{ backgroundColor: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)' }}
                  >
                    <Clock className="w-4 h-4" />
                    {nextChange ? `Cerrado · ${nextChange}` : 'Negocio cerrado'}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

