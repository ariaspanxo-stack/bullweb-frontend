// Tipo de tag de cliente (coherente con backend segment)
export type CustomerTag = 'new' | 'frequent' | 'vip' | 'inactive';

// Nivel de fidelización (loyalty_tiers en backend)
export interface Tier {
  id: string;
  name: string;
  color?: string | null;
  benefitText?: string | null;
  minSpent?: number | string;
  order?: number;
  isActive?: boolean;
}

// Tipo canonical unificado — usado en TODOS los componentes de clientes
export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  rut?: string | null;
  address?: string | null;
  addressNumber?: string | null;
  sector?: string | null;
  city?: string | null;
  notes?: string | null;
  // Hotfix #119: fecha de nacimiento (alimenta el cron de cumpleaños #102)
  birthdate?: string | null;
  // Tags computados en frontend desde totalOrders/totalSpent/lastVisit
  tags: CustomerTag[];
  totalOrders: number;
  totalSpent: number;
  averageTicket: number;
  lastOrderAt?: string | null;
  lastVisit?: string | null;
  favoriteProducts: Array<{
    productId: number;
    productName: string;
    quantity: number;
  }>;
  loyaltyPoints?: number;
  points?: number;
  // Nivel de fidelización actual
  currentTierId?: string | null;
  tier?: Tier | null;
  tierAtRisk?: boolean | null;
  tierDowngradedAt?: string | null;
  // Segmento calculado por el backend (VIP/FREQUENT/REGULAR/NEW/INACTIVE/AT_RISK)
  segment?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  tenantId?: string | null;
  orders?: any[];
}

export interface CustomerFormData {
  name: string;
  email?: string;
  phone?: string;
  rut?: string;
  address?: string;
  addressNumber?: string;
  sector?: string;
  city?: string;
  notes?: string;
  tags?: CustomerTag[];
}

export interface CustomerStats {
  totalCustomers: number;
  newThisMonth: number;
  topCustomer?: {
    name: string;
    totalSpent: number;
    totalOrders: number;
  };
  averageTicket: number;
}
