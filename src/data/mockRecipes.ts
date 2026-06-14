import type { Recipe } from '../types/recipe.types';

export const mockRecipes: Recipe[] = [
  {
    id: 'rec-001',
    productId: '1', // Laptop HP Pavilion (del mockProducts)
    name: 'Ficha Técnica: Pizza Margarita',
    description: 'Pizza clásica italiana con ingredientes frescos',
    ingredients: [
      {
        ingredientId: 'ing-1708279200001', // Harina
        quantity: 0.3, // 300g
        unit: 'kg',
        cost: 360, // Será calculado
        notes: 'Harina 000',
      },
      {
        ingredientId: 'ing-1708279200002', // Queso Mozzarella
        quantity: 0.2, // 200g
        unit: 'kg',
        cost: 1700,
        notes: 'Bien rallado',
      },
      {
        ingredientId: 'ing-1708279200003', // Tomate
        quantity: 0.15, // 150g
        unit: 'kg',
        cost: 345,
      },
      {
        ingredientId: 'ing-1708279200004', // Aceite
        quantity: 0.02, // 20ml
        unit: 'L',
        cost: 240,
      },
      {
        ingredientId: 'ing-1708279200007', // Sal
        quantity: 0.005, // 5g
        unit: 'kg',
        cost: 2.5,
      },
    ],
    totalCost: 2647.5,
    servings: 1,
    costPerServing: 2647.5,
    prepTime: 20,
    cookTime: 15,
    instructions: `
1. Preparar la masa con harina, agua, sal y aceite
2. Dejar reposar 30 minutos
3. Extender la masa en forma circular
4. Agregar salsa de tomate
5. Cubrir con queso mozzarella
6. Hornear a 220°C por 15 minutos
7. Servir caliente
    `.trim(),
    notes: 'Pizza individual de 30cm de diámetro',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-15T14:00:00Z',
  },
  {
    id: 'rec-002',
    productId: '2', // iPhone 14 Pro Max
    name: 'Ficha Técnica: Hamburguesa Clásica',
    description: 'Hamburguesa de carne con queso y vegetales',
    ingredients: [
      {
        ingredientId: 'ing-1708279200005', // Carne
        quantity: 0.15, // 150g
        unit: 'kg',
        cost: 975,
      },
      {
        ingredientId: 'ing-1708279200002', // Queso
        quantity: 0.03, // 30g
        unit: 'kg',
        cost: 255,
      },
      {
        ingredientId: 'ing-1708279200006', // Lechuga
        quantity: 1, // 1 unidad
        unit: 'unit',
        cost: 800,
      },
      {
        ingredientId: 'ing-1708279200003', // Tomate
        quantity: 0.05, // 50g
        unit: 'kg',
        cost: 115,
      },
    ],
    totalCost: 2145,
    servings: 1,
    costPerServing: 2145,
    prepTime: 10,
    cookTime: 8,
    instructions: `
1. Formar medallón con la carne
2. Cocinar a la parrilla 4 min por lado
3. Agregar queso 1 min antes de terminar
4. Armar hamburguesa con pan, lechuga, tomate
5. Servir caliente
    `.trim(),
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-15T14:00:00Z',
  },
];
