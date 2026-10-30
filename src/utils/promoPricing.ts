// ═══════════════════════════════════════════════════════════════
// HOTFIX 299: precio del carrito con promociones ANTES de cobrar.
//
// Replica PURA (sin React, sin red) de la regla del backend
// bullweb-backend/src/modules/pos/pos.helpers.ts: buildPromoMap,
// getPackGroupSize, applyGroupedPromotionToItems, applyPromotionToItem,
// computeGroupedPromoResults. El backend sigue siendo el que cobra: esto
// solo se usa para MOSTRAR el total y la etiqueta por linea.
//
// Reglas:
// - lista de productos vacia = todo el menu; la promo especifica gana.
// - PACK_PRICE con 2+ productos = 1 unidad de cada producto por pack
//   (packs = minimo entre productos, en orden del carrito; cobro =
//   min(valor, suma de precios base) repartido entero en proporcion).
// - PACK_PRICE con 1 producto = buyQuantity (>= 2) unidades por pack.
// - X_FOR_Y agrupado; PERCENTAGE y FIXED_PRICE por item.
// - B1-05: los modificadores con precio se suman APARTE del pack.
// ═══════════════════════════════════════════════════════════════

export type PromoType = 'PERCENTAGE' | 'FIXED_PRICE' | 'X_FOR_Y' | 'PACK_PRICE';

export interface PromoLike {
  id: string;
  productIds?: string[] | null;
  type: PromoType | string;
  value: number | string;
  buyQuantity?: number | null;
  getQuantity?: number | null;
}

/** Linea del carrito, independiente del store/modal que la origina. */
export interface PromoCartLine {
  productId: string;
  name?: string;
  /** Precio del producto SIN modificadores. */
  productPrice: number;
  /** Suma de modificadores con precio, por unidad. */
  modifierUnit: number;
  quantity: number;
}

export interface PromoLineResult {
  /** Subtotal de la linea con promociones. */
  subtotal: number;
  /** subtotal / quantity. */
  unitPrice: number;
  /** Subtotal de la linea a precio de lista (producto + modificadores). */
  listSubtotal: number;
  /** listSubtotal - subtotal (>= 0). */
  discount: number;
  /** Etiqueta corta de la promo aplicada, o null si no hay ahorro. */
  promoLabel: string | null;
}

export interface PromoCartResult {
  lines: PromoLineResult[];
  /** Total con promociones. */
  total: number;
  /** Total a precio de lista. */
  listTotal: number;
  /** listTotal - total. */
  discount: number;
}

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/** HOTFIX 299: productos distintos de la promo (0 = lista vacia). */
export function packDistinctProducts(promo: PromoLike | null | undefined): number {
  return Array.isArray(promo?.productIds) ? new Set(promo!.productIds).size : 0;
}

/** HOTFIX 299: tamano de grupo efectivo de un PACK_PRICE (0 = no aplica). */
export function getPackGroupSize(promo: PromoLike | null | undefined): number {
  if (!promo) return 0;
  const distinct = packDistinctProducts(promo);
  if (distinct >= 2) return distinct;
  const buy = num(promo.buyQuantity);
  return distinct === 1 && buy >= 2 ? Math.floor(buy) : 0;
}

/** HOTFIX 299: mapa productId -> promo vigente (misma regla que buildPromoMap del backend). */
export function buildPromoMap(
  activePromotions: PromoLike[] | null | undefined,
  orderProductIds: string[],
): Map<string, PromoLike> {
  const promoMap = new Map<string, PromoLike>();
  const globals: PromoLike[] = [];
  (activePromotions ?? []).forEach((p) => {
    const ids: string[] = Array.isArray(p?.productIds) ? (p.productIds as string[]) : [];
    if (ids.length === 0) globals.push(p);
    else ids.forEach((pid) => promoMap.set(pid, p));
  });
  if (globals.length > 0) {
    const global = globals[globals.length - 1];
    (orderProductIds ?? []).forEach((pid) => {
      if (pid && !promoMap.has(pid)) promoMap.set(pid, global);
    });
  }
  return promoMap;
}

const isGroupedPromo = (p: PromoLike | undefined): boolean =>
  !!p && (p.type === 'PACK_PRICE' || p.type === 'X_FOR_Y');

/** Promo PACK que efectivamente arma packs (si no, cobro normal). */
const isActivePack = (p: PromoLike | undefined): boolean =>
  !!p && p.type === 'PACK_PRICE' && getPackGroupSize(p) >= 2;

/** Item por item: PERCENTAGE y FIXED_PRICE (y fallback). basePrice incluye modificadores. */
function applyPromotionToItem(
  basePrice: number,
  quantity: number,
  promo: PromoLike | undefined,
  modifierUnit: number,
): number {
  let sub = basePrice * quantity;
  if (promo) {
    const value = num(promo.value);
    if (promo.type === 'PERCENTAGE') {
      sub = basePrice * (1 - value / 100) * quantity;
    } else if (promo.type === 'FIXED_PRICE') {
      sub = (value + modifierUnit) * quantity;
    }
  }
  return Math.max(0, sub);
}

/** Grupo de lineas que comparten una promo agrupada. Devuelve subtotal por linea. */
function applyGroupedPromotion(lines: PromoCartLine[], promo: PromoLike): number[] {
  const subs = new Array(lines.length).fill(0);
  const value = num(promo.value);
  const totalQty = lines.reduce((s, l) => s + l.quantity, 0);

  if (promo.type === 'PACK_PRICE' && packDistinctProducts(promo) >= 2) {
    // 1 unidad de cada producto por pack; B1-05: el pack se arma con el precio del producto
    // y los modificadores con precio se cobran aparte.
    const pids = Array.from(new Set(promo.productIds as string[]));
    const qtyOf = (pid: string) => lines.reduce((s, l) => s + (l.productId === pid ? l.quantity : 0), 0);
    const totalPacks = Math.min(...pids.map(qtyOf));
    const left = lines.map((l) => l.quantity);
    for (let k = 0; k < totalPacks; k++) {
      const chosen = pids.map((pid) => {
        const i = lines.findIndex((l, idx) => l.productId === pid && left[idx] > 0);
        left[i] -= 1;
        return i;
      });
      const baseSum = chosen.reduce((s, i) => s + lines[i].productPrice, 0);
      const charge = Math.min(value, baseSum);
      let asignado = 0;
      chosen.forEach((i, c) => {
        const parte = c === chosen.length - 1
          ? charge - asignado
          : (baseSum > 0 ? Math.floor((charge * lines[i].productPrice) / baseSum) : 0);
        asignado += parte;
        subs[i] += parte;
      });
    }
    lines.forEach((l, i) => { subs[i] += left[i] * l.productPrice + l.quantity * l.modifierUnit; });
    return subs;
  }

  if (promo.type === 'PACK_PRICE' && getPackGroupSize(promo) >= 2) {
    // Pack de N unidades del mismo producto; modificadores aparte (B1-05).
    const N = getPackGroupSize(promo);
    const totalPacks = Math.floor(totalQty / N);
    const unitOwner: number[] = [];
    lines.forEach((l, i) => { for (let u = 0; u < l.quantity; u++) unitOwner.push(i); });
    for (let k = 0; k < totalPacks; k++) {
      const packUnits = unitOwner.slice(k * N, (k + 1) * N);
      const baseSum = packUnits.reduce((s, i) => s + lines[i].productPrice, 0);
      if (value <= baseSum) packUnits.forEach((i) => { subs[i] += value / N; });
      else packUnits.forEach((i) => { subs[i] += lines[i].productPrice; });
    }
    unitOwner.slice(totalPacks * N).forEach((i) => { subs[i] += lines[i].productPrice; });
    lines.forEach((l, i) => { subs[i] += l.quantity * l.modifierUnit; });
    return subs;
  }

  const B = num(promo.buyQuantity);
  if (promo.type === 'X_FOR_Y' && B > 0) {
    const G = num(promo.getQuantity) > 0 ? num(promo.getQuantity) : 0;
    const setSize = B + G;
    const unitsInSets = setSize > 0 ? Math.floor(totalQty / setSize) * setSize : 0;
    let g = 0;
    lines.forEach((l, i) => {
      const base = l.productPrice + l.modifierUnit;
      let free = 0;
      for (let u = 0; u < l.quantity; u++) {
        if (g < unitsInSets && g % setSize >= B) free++;
        g++;
      }
      subs[i] = (l.quantity - free) * base;
    });
    return subs;
  }

  lines.forEach((l, i) => { subs[i] = (l.productPrice + l.modifierUnit) * l.quantity; });
  return subs;
}

/**
 * HOTFIX 299: adaptador para los carritos de /restaurant (CartItem de restaurant.types).
 * productPrice = precio de la carta; modifierUnit = unitPrice - productPrice (lo que el
 * carrito ya suma por modificadores). Sin el producto en la carta: unitPrice - modifiersPrice.
 */
export function restaurantCartToPromoLines(
  cart: { productId: string; productName?: string; quantity: number; unitPrice: number; modifiersPrice?: number }[],
  products: { id: string; price: number }[],
): PromoCartLine[] {
  return cart.map((i) => {
    const unit = num(i.unitPrice);
    const prod = products.find((p) => p.id === i.productId);
    const productPrice = prod ? Math.min(num(prod.price), unit) : Math.max(0, unit - num(i.modifiersPrice));
    return {
      productId: i.productId,
      name: i.productName,
      productPrice,
      modifierUnit: Math.max(0, unit - productPrice),
      quantity: num(i.quantity),
    };
  });
}

const fmtCLP = (n: number) => Math.round(n).toLocaleString('es-CL');

function labelFor(promo: PromoLike, lines: PromoCartLine[], line: PromoCartLine): string {
  if (promo.type === 'PACK_PRICE') {
    if (packDistinctProducts(promo) >= 2) {
      const names = Array.from(new Set(promo.productIds as string[]))
        .map((pid) => lines.find((l) => l.productId === pid)?.name)
        .filter((n): n is string => !!n);
      return `Pack ${names.join(' + ')}`;
    }
    return `Pack ${getPackGroupSize(promo)}x ${line.name ?? ''}`.trim();
  }
  if (promo.type === 'X_FOR_Y') {
    const B = num(promo.buyQuantity);
    const G = num(promo.getQuantity);
    return `Promo ${B + G}x${B}`;
  }
  if (promo.type === 'PERCENTAGE') return `Promo ${num(promo.value)}% dcto`;
  if (promo.type === 'FIXED_PRICE') return `Precio promo $${fmtCLP(num(promo.value))}`;
  return 'Promo';
}

/**
 * HOTFIX 299: precio del carrito completo con las promociones vigentes.
 * Agrupadas (PACK_PRICE / X_FOR_Y) primero por promo.id, luego item por item.
 */
export function priceCartWithPromotions(
  lines: PromoCartLine[],
  activePromotions: PromoLike[] | null | undefined,
): PromoCartResult {
  const safe = lines.map((l) => ({
    ...l,
    productPrice: num(l.productPrice),
    modifierUnit: num(l.modifierUnit),
    quantity: num(l.quantity),
  }));
  const promoMap = buildPromoMap(activePromotions, safe.map((l) => l.productId));
  const subs: (number | undefined)[] = new Array(safe.length).fill(undefined);

  const groups = new Map<string, number[]>();
  safe.forEach((l, i) => {
    const promo = promoMap.get(l.productId);
    if (isGroupedPromo(promo)) {
      const key = promo!.id;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    }
  });
  groups.forEach((indices) => {
    const promo = promoMap.get(safe[indices[0]].productId)!;
    const res = applyGroupedPromotion(indices.map((i) => safe[i]), promo);
    indices.forEach((idx, k) => { subs[idx] = Math.max(0, res[k]); });
  });

  const out: PromoLineResult[] = safe.map((l, i) => {
    const promo = promoMap.get(l.productId);
    const base = l.productPrice + l.modifierUnit;
    const listSubtotal = base * l.quantity;
    const subtotal = subs[i] ?? applyPromotionToItem(base, l.quantity, promo, l.modifierUnit);
    const discount = Math.max(0, listSubtotal - subtotal);
    const promoLabel = promo && discount >= 0.5
      && (promo.type !== 'PACK_PRICE' || isActivePack(promo))
      ? labelFor(promo, safe, l)
      : null;
    return {
      subtotal,
      unitPrice: l.quantity > 0 ? subtotal / l.quantity : base,
      listSubtotal,
      discount,
      promoLabel,
    };
  });

  const total = out.reduce((s, r) => s + r.subtotal, 0);
  const listTotal = out.reduce((s, r) => s + r.listSubtotal, 0);
  return { lines: out, total, listTotal, discount: Math.max(0, listTotal - total) };
}
