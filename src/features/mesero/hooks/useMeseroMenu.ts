// ═══════════════════════════════════════════════════════════════
// HOOK: useMeseroMenu — carga y caché del menú (resiste WiFi inestable)
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { meseroService } from '../meseroService';

const CACHE_KEY = 'mesero_menu_cache';
const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

export function useMeseroMenu() {
  const [categories,       setCategories]       = useState<any[]>([]);
  const [products,         setProducts]         = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading,          setLoading]          = useState(true);

  useEffect(() => {
    const loadMenu = async () => {
      // Intentar usar caché primero (para WiFi inestable)
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < CACHE_TTL) {
            setCategories(data.categories);
            setProducts(data.products);
            setSelectedCategory(data.categories[0]?.id ?? null);
            setLoading(false);
            return; // usar caché, no llamar API
          }
        }
      } catch {
        // caché corrupta → ignorar
      }

      // Llamar API
      try {
        const [cats, prods] = await Promise.all([
          meseroService.getCategories(),
          meseroService.getProducts(),
        ]);

        const activeCategories = cats.filter((c: any) => c.active !== false);
        const activeProducts   = prods.filter((p: any) => p.active !== false);

        setCategories(activeCategories);
        setProducts(activeProducts);
        setSelectedCategory(activeCategories[0]?.id ?? null);

        // Guardar en caché
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data:      { categories: activeCategories, products: activeProducts },
          timestamp: Date.now(),
        }));
      } catch {
        // API falló → intentar caché aunque esté vencida
        try {
          const cached = localStorage.getItem(CACHE_KEY);
          if (cached) {
            const { data } = JSON.parse(cached);
            setCategories(data.categories);
            setProducts(data.products);
            setSelectedCategory(data.categories[0]?.id ?? null);
          }
        } catch { /* sin datos */ }
      } finally {
        setLoading(false);
      }
    };

    loadMenu();
  }, []);

  const productsByCategory = selectedCategory
    ? products.filter(p => p.categoryId === selectedCategory)
    : products;

  return {
    categories,
    products,
    productsByCategory,
    selectedCategory,
    setSelectedCategory,
    loading,
  };
}
