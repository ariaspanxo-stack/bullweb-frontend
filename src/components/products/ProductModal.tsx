import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Image,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Loader2,
  Info,
} from 'lucide-react';
import type { Product, ProductFormData, ProductFormErrors } from '../../types/product.types';
import { calculateProductMetrics, formatMetric, metricDescriptions } from '../../utils/metricsCalculator';
import { formatCurrency } from '../../lib/utils';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (product: Product) => Promise<void> | void;
  product?: Product | null;
  existingSkus?: string[];
  recipes?: any[];
  categories?: Array<{ id: string; name: string; [key: string]: any }>; // Categorías reales del API
  stations?: Array<{ id: string; name: string; [key: string]: any }>;  // Estaciones de cocina
}

// Categorías vacías por defecto - se cargan desde la API
const CATEGORIES: Array<{ id: string; name: string }> = [];

const initialFormData: ProductFormData = {
  name: '',
  sku: '',
  category: '',
  stationId: '',
  price: '',
  cost: '',
  stock: '',
  image: '',
  description: '',
  status: 'active',
  isPopular: false,
};

const AVAILABLE_TAGS = [
  { key: 'vegano',      label: 'Vegano',      emoji: '🌱' },
  { key: 'vegetariano', label: 'Vegetariano', emoji: '🥦' },
  { key: 'sin_gluten',  label: 'Sin gluten',  emoji: '🌾' },
  { key: 'picante',     label: 'Picante',     emoji: '🌶️' },
  { key: 'popular',     label: 'Popular',     emoji: '⭐' },
  { key: 'nuevo',       label: 'Nuevo',       emoji: '🆕' },
  { key: 'oferta',      label: 'Oferta',      emoji: '🏷️' },
];

export const ProductModal: React.FC<ProductModalProps> = ({
  isOpen,
  onClose,
  onSave,
  product,
  existingSkus = [],
  recipes = [],
  categories: categoriesProp = [],
  stations: stationsProp = [],
}) => {
  const stations = stationsProp;
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imgError, setImgError] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const isEditMode = !!product;

  // Cargar datos del producto en modo edición
  useEffect(() => {
    if (product && isOpen) {
      const imageVal = product.imageUrl || (product as any).image || '';
      setFormData({
        name:        product.name,
        sku:         product.sku || '',
        category:    product.categoryId,
        stationId:   product.stationId ?? '',
        price:       product.price.toString(),
        cost:        (product.cost || 0).toString(),
        stock:       (product.currentStock || 0).toString(),
        image:       imageVal,
        description: product.description || '',
        status:      product.available ? 'active' : 'inactive',
        isPopular:   product.popular || false,
      });
      setImagePreview(imageVal);
      setSelectedTags(product.tags ?? []);
    } else if (isOpen) {
      setFormData({ ...initialFormData });
      setImagePreview('');
      setSelectedTags([]);
    }
    setErrors({});
    setImgError(false);
    setShowSuccessMessage(false);
    setSaveError('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, isOpen]);

  // Reset imgError cuando cambia la URL de imagen
  useEffect(() => { setImgError(false); }, [formData.image]);

  // Validaciones
  const validateForm = (): boolean => {
    const newErrors: ProductFormErrors = {};

    // Nombre
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido';
    } else if (formData.name.length < 3) {
      newErrors.name = 'El nombre debe tener al menos 3 caracteres';
    }

    // SKU (opcional)
    if (
      formData.sku.trim() &&
      existingSkus.includes(formData.sku) &&
      formData.sku !== product?.sku
    ) {
      newErrors.sku = 'Este SKU ya existe';
    }

    // Categoría
    if (!formData.category) {
      newErrors.category = 'Selecciona una categoría';
    }

    // Precio
    const price = parseFloat(formData.price);
    if (!formData.price || isNaN(price)) {
      newErrors.price = 'El precio es requerido';
    } else if (price <= 0) {
      newErrors.price = 'El precio debe ser mayor a 0';
    }

    // Costo (opcional)
    const cost = parseFloat(formData.cost);
    if (formData.cost && !isNaN(cost)) {
      if (cost < 0) {
        newErrors.cost = 'El costo no puede ser negativo';
      } else if (cost > price) {
        newErrors.cost = 'El costo no puede ser mayor al precio';
      }
    }

    // Stock (opcional)
    const stock = parseInt(formData.stock);
    if (formData.stock && !isNaN(stock) && stock < 0) {
      newErrors.stock = 'El stock no puede ser negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const metrics = useMemo(() => {
    return calculateProductMetrics(
      parseFloat(formData.price) || 0,
      parseFloat(formData.cost) || 0
    );
  }, [formData.price, formData.cost]);

  // Manejar cambios en inputs
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }

    // Limpiar error del campo al escribir
    if (errors[name as keyof ProductFormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Manejar cambio de imagen (URL manual)
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData((prev) => ({ ...prev, image: value }));
    setImagePreview(value);
  };

  // Subir imagen al servidor
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Imagen máxima: 5MB');
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      const fd = new FormData();
      fd.append('logo', file);

      const token = localStorage.getItem('bullweb_token') ?? '';
      const baseUrl = import.meta.env.VITE_API_URL ?? '';

      const res = await fetch(`${baseUrl}/menu/upload-logo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();

      if (data.success && data.url) {
        setFormData((prev) => ({ ...prev, image: data.url }));
        setImagePreview(data.url);
        setUploadError('');
      } else {
        throw new Error('Respuesta inesperada del servidor');
      }
    } catch {
      setUploadError('Error al subir imagen. Intenta de nuevo.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // Generar nuevo SKU — M-2: usar crypto.randomUUID() sin colisiones
  const generateNewSku = () => {
    const prefix = formData.name
      ? formData.name.slice(0, 3).toUpperCase().replace(/\s/g, '_')
      : 'PRD';
    const suffix = crypto.randomUUID().split('-')[0].toUpperCase();
    const randomSku = `${prefix}-${suffix}`;
    setFormData((prev) => ({ ...prev, sku: randomSku }));
    if (errors.sku) {
      setErrors((prev) => ({ ...prev, sku: undefined }));
    }
  };

  // Enviar formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSaveError('');

    const productData: Product = {
      id: product?.id || crypto.randomUUID(),
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      categoryId: formData.category,
      stationId: formData.stationId,
      price: parseFloat(formData.price),
      cost: formData.cost.trim() ? parseFloat(formData.cost) : undefined,
      currentStock: formData.stock.trim() ? parseInt(formData.stock) : undefined,
      imageUrl: formData.image?.trim() || undefined,
      description: formData.description?.trim() || undefined,
      active: formData.status === 'active',
      available: formData.status === 'active',
      popular: formData.isPopular,
      tags: selectedTags,
      createdAt: product?.createdAt,
      updatedAt: new Date(),
    };

    try {
      await onSave(productData);
      setShowSuccessMessage(true);
      // Cerrar modal después de mostrar mensaje
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: any) {
      setSaveError(
        err?.response?.data?.message
          ?? err?.message
          ?? 'Error al guardar. Intenta de nuevo.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData(initialFormData);
    setErrors({});
    setImagePreview('');
    setShowSuccessMessage(false);
    setSaveError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="relative bg-gray-900 border border-white/10 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gray-900 border-b border-white/10 px-6 py-4 flex items-center justify-between z-10">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {isEditMode ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {isEditMode
                  ? 'Modifica los datos del producto'
                  : 'Completa los datos para crear un nuevo producto'}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Error inline al guardar */}
          {saveError && (
            <div className="mx-6 mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-300">⚠️ {saveError}</p>
            </div>
          )}

          {/* Success Message */}
          {showSuccessMessage && (
            <div className="mx-6 mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <p className="text-sm text-green-300 font-medium">
                {isEditMode
                  ? '¡Producto actualizado exitosamente!'
                  : '¡Producto creado exitosamente!'}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
            <div className="space-y-6">
              {/* Nombre y SKU */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nombre del Producto *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-white/10'
                    }`}
                    placeholder="Ej: Cuarto de Libra Clásica"
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    SKU
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="sku"
                      value={formData.sku}
                      onChange={handleChange}
                      className={`flex-1 px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                        errors.sku ? 'border-red-500' : 'border-white/10'
                      }`}
                      placeholder="Ej: HAMB-001"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={generateNewSku}
                      className="px-3 py-2 bg-white/10 text-gray-300 rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                      disabled={isSubmitting}
                    >
                      Generar
                    </button>
                  </div>
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.sku}
                    </p>
                  )}
                </div>
              </div>

              {/* Categoría */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white [color-scheme:dark] focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.category ? 'border-red-500' : 'border-white/10'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">Selecciona una categoría</option>
                  {categoriesProp.length === 0 && (
                    <option value="" disabled>— Cargando categorías... —</option>
                  )}
                  {categoriesProp.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.category && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.category}
                  </p>
                )}
              </div>

              {/* Estación de cocina */}
              <div className="border border-brand-500/20 rounded-xl p-4 bg-brand-500/5">
                {/* Header con badge */}
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-semibold text-white">
                    Estación de Cocina <span className="text-xs font-normal text-gray-400">(opcional)</span>
                  </label>
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-400 bg-brand-500/10 border border-brand-500/30 px-2 py-0.5 rounded-full">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                    Enruta comandas
                  </span>
                </div>

                {/* Info box */}
                <div className="flex items-start gap-2 mb-3 p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-200">
                  <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span>La estación seleccionada determina a qué <strong>impresora</strong> se enviará la comanda al momento de tomar el pedido.</span>
                </div>

                {/* Selección rápida (botones) */}
                {stations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {stations.map((station) => (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, stationId: station.id }))}
                        disabled={isSubmitting}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                          formData.stationId === station.id
                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-gray-300 hover:border-brand-500/50 hover:text-brand-400'
                        }`}
                      >
                        {station.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Dropdown (fallback / selección completa) */}
                <select
                  name="stationId"
                  value={formData.stationId}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white [color-scheme:dark] focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm ${
                    errors.stationId ? 'border-red-500' : 'border-white/10'
                  }`}
                  disabled={isSubmitting}
                >
                  <option value="">— Selecciona una estación —</option>
                  {stations.map((station) => (
                    <option key={station.id} value={station.id}>
                      {station.name}
                    </option>
                  ))}
                </select>
                {errors.stationId && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.stationId}
                  </p>
                )}
              </div>

              {/* Precio y Costo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Precio de Venta *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                        errors.price ? 'border-red-500' : 'border-white/10'
                      }`}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Costo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      $
                    </span>
                    <input
                      type="number"
                      name="cost"
                      value={formData.cost}
                      onChange={handleChange}
                      className={`w-full pl-8 pr-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                        errors.cost ? 'border-red-500' : 'border-white/10'
                      }`}
                      placeholder="0"
                      step="1"
                      min="0"
                      disabled={isSubmitting}
                    />
                  </div>
                  {errors.cost && (
                    <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.cost}
                    </p>
                  )}
                </div>
              </div>

              {/* Panel de Métricas Financieras */}
              {formData.price && formData.cost && !errors.price && !errors.cost && (
                <div className="bg-gradient-to-br from-brand-500/10 to-brand-500/5 rounded-lg p-4 border border-brand-500/20">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    📊 Métricas Financieras
                  </h4>
                   
                  <div className="grid grid-cols-2 gap-3">
                    {/* Margen $ */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Margen $</span>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-500 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-950 text-white text-xs rounded-lg shadow-lg border border-white/10 z-10">
                            {metricDescriptions.marginAmount}
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-white">
                        {formatMetric(metrics.marginAmount, 'currency')}
                      </p>
                    </div>

                    {/* Margen % */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Margen %</span>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-500 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-950 text-white text-xs rounded-lg shadow-lg border border-white/10 z-10">
                            {metricDescriptions.marginPercent}
                          </div>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${
                        metrics.marginPercent >= 40 ? 'text-green-400' :
                        metrics.marginPercent >= 20 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {metrics.marginPercent}%
                      </p>
                    </div>

                    {/* Markup % */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Markup %</span>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-500 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-950 text-white text-xs rounded-lg shadow-lg border border-white/10 z-10">
                            {metricDescriptions.markupPercent}
                          </div>
                        </div>
                      </div>
                      <p className={`text-lg font-bold ${
                        metrics.markupPercent >= 67 ? 'text-green-400' :
                        metrics.markupPercent >= 25 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {metrics.markupPercent}%
                      </p>
                    </div>

                    {/* ROI */}
                    <div className="bg-white/5 rounded-lg p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">ROI</span>
                        <div className="group relative">
                          <Info className="w-4 h-4 text-gray-500 cursor-help" />
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-48 p-2 bg-gray-950 text-white text-xs rounded-lg shadow-lg border border-white/10 z-10">
                            {metricDescriptions.roi}
                          </div>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-brand-400">
                        {metrics.roi}%
                      </p>
                    </div>
                  </div>

                  {/* Indicador de Ficha Técnica */}
                  {(() => {
                    const recipe = recipes?.find((r: any) => r.productId === (product?.id || ''));
                    if (recipe) {
                      return (
                        <div className="mt-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="text-green-400">✅</span>
                            <div>
                              <p className="text-sm font-semibold text-green-300">
                                Tiene Ficha Técnica
                              </p>
                              <p className="text-xs text-green-400/80">
                                Costo real calculado: {formatCurrency(recipe.totalCost)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Semáforo visual */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">Estado:</span>
                      <span className={`font-semibold ${
                        metrics.marginPercent >= 40 ? 'text-green-400' :
                        metrics.marginPercent >= 20 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {metrics.marginPercent >= 40 ? '🟢 Excelente' : 
                         metrics.marginPercent >= 20 ? '🟡 Bueno' : 
                         '🔴 Mejorar precio'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Stock */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Stock Inicial
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-lg bg-white/5 !text-white placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent ${
                    errors.stock ? 'border-red-500' : 'border-white/10'
                  }`}
                  placeholder="0"
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                />
                {errors.stock && (
                  <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    {errors.stock}
                  </p>
                )}
              </div>

              {/* Imagen */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Imagen del Producto
                </label>
                <div className="space-y-2">

                  {/* Preview */}
                  {imagePreview && !imgError ? (
                    <div className="relative w-full h-40 bg-gray-800 rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-contain"
                        onError={() => setImgError(true)}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({ ...prev, image: '' }));
                          setImagePreview('');
                        }}
                        className="absolute top-2 right-2 bg-gray-950/80 hover:bg-gray-950 rounded-full w-6 h-6 flex items-center justify-center text-gray-300 hover:text-red-400 shadow-sm transition-colors text-xs font-bold"
                      >
                        ✕
                      </button>
                      <span className="absolute top-2 left-2 bg-green-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        ✓ Imagen válida
                      </span>
                    </div>
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl flex items-center justify-center border border-white/10">
                      <div className="text-center text-gray-500">
                        <Image className="w-12 h-12 mx-auto mb-1" />
                        {imgError ? (
                          <p className="text-xs text-red-400">URL inválida o imagen no accesible</p>
                        ) : (
                          <p className="text-xs">Sin imagen</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* URL manual + botón subir */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="image"
                      value={formData.image}
                      onChange={handleImageChange}
                      className="flex-1 px-4 py-2 border border-white/10 bg-white/5 !text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
                      placeholder="https://... o sube un archivo"
                      disabled={isSubmitting || uploading}
                    />

                    {/* Botón subir archivo */}
                    <label
                      className={`flex items-center gap-1.5 cursor-pointer border rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                        uploading || isSubmitting
                          ? 'border-white/10 text-gray-500 cursor-wait'
                          : 'border-brand-500/30 text-brand-400 hover:bg-brand-500/10'
                      }`}
                    >
                      {uploading ? (
                        <>
                          <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Subiendo...
                        </>
                      ) : (
                        <>📎 Subir</>
                      )}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading || isSubmitting}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Error de upload */}
                  {uploadError && (
                    <p className="text-xs text-red-400 flex items-center gap-1">
                      ⚠️ {uploadError}
                    </p>
                  )}

                  {/* Hint */}
                  <p className="text-xs text-gray-500">
                    JPG, PNG, WebP — máximo 5MB
                  </p>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descripción
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-white/10 bg-white/5 !text-white placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                  placeholder="Ej: Medallón de carne 180g, cheddar, lechuga y salsa casa"
                  disabled={isSubmitting}
                />
              </div>

              {/* Estado y Popular */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estado
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-white/10 bg-white/5 !text-white [color-scheme:dark] rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    disabled={isSubmitting}
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isPopular"
                      checked={formData.isPopular}
                      onChange={handleChange}
                      className="w-5 h-5 text-brand-600 border-white/10 rounded focus:ring-2 focus:ring-brand-500"
                      disabled={isSubmitting}
                    />
                    <span className="text-sm font-medium text-gray-300 flex items-center gap-1">
                      <Sparkles className="w-4 h-4 text-yellow-500" />
                      Marcar como Popular
                    </span>
                  </label>
                </div>
              </div>

              {/* Etiquetas / Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Etiquetas
                  {selectedTags.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-brand-400">({selectedTags.length} seleccionadas)</span>
                  )}
                </label>
                <div className="flex flex-wrap gap-2">
                  {AVAILABLE_TAGS.map((tag) => {
                    const active = selectedTags.includes(tag.key);
                    return (
                      <button
                        key={tag.key}
                        type="button"
                        disabled={isSubmitting}
                        onClick={() =>
                          setSelectedTags((prev) =>
                            active ? prev.filter((t) => t !== tag.key) : [...prev, tag.key]
                          )
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                          active
                            ? 'bg-brand-500 border-brand-500 text-white shadow-sm'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-brand-500/50 hover:text-brand-400'
                        }`}
                      >
                        <span>{tag.emoji}</span>
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </form>

          {/* Footer con botones */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-white/10 px-6 py-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-6 py-2 border border-white/10 text-gray-300 font-medium rounded-lg hover:bg-white/10 transition-colors"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-6 py-2 bg-brand-500 text-white font-medium rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Guardando...
                </>
              ) : (
                <>{isEditMode ? 'Actualizar Producto' : 'Crear Producto'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;
