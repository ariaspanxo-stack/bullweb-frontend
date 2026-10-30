// HOTFIX 300: pagina de inicio segun permisos. El Repartidor (delivery.own sin acceso al POS) entra a sus repartos;
// el resto sigue entrando a /restaurant.
export function homePathFor(permissions: string[] | undefined | null): string {
  const p = permissions ?? [];
  if (!p.includes('ALL_PERMISSIONS') && !p.includes('pos.access') && p.includes('delivery.own')) return '/delivery';
  return '/restaurant';
}
