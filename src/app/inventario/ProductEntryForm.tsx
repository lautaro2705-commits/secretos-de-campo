"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductItem {
  id: string;
  name: string;
  unit: string;
}

interface ProductType {
  id: string;
  name: string;
  icon: string | null;
  products: ProductItem[];
}

interface Props {
  productTypes: ProductType[];
}

export function ProductEntryForm({ productTypes: initialTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  // Mantenemos copia local de los tipos para poder agregar productos sin esperar refresh
  const [productTypes, setProductTypes] = useState<ProductType[]>(initialTypes);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  // Estado para crear nuevo producto
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("kg");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [createError, setCreateError] = useState("");

  const selectedType = productTypes.find((t) => t.id === selectedTypeId);
  const selectedProduct = selectedType?.products.find(
    (p) => p.id === selectedProductId
  );

  const totalCost =
    quantity && costPerUnit
      ? (parseFloat(quantity) * parseFloat(costPerUnit)).toFixed(2)
      : "";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: selectedProductId,
          quantity: Number(quantity),
          costPerUnit: Number(costPerUnit),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");

      setSuccess(
        `✅ Ingresados ${data.entry.quantity} ${selectedProduct?.unit || "kg"} de ${data.entry.product} — Total: $${Number(data.entry.totalCost).toLocaleString("es-AR")}`
      );
      setQuantity("");
      setCostPerUnit("");
      setSelectedProductId("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct() {
    if (!newName.trim() || !selectedTypeId) return;

    setCreatingProduct(true);
    setCreateError("");

    try {
      const res = await fetch("/api/products/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          productTypeId: selectedTypeId,
          unit: newUnit,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear producto");

      // Agregar el producto nuevo a la lista local inmediatamente
      const newProduct: ProductItem = {
        id: data.product.id,
        name: data.product.name,
        unit: data.product.unit,
      };

      setProductTypes((prev) =>
        prev.map((type) =>
          type.id === selectedTypeId
            ? { ...type, products: [...type.products, newProduct] }
            : type
        )
      );

      // Auto-seleccionar el producto recién creado
      setSelectedProductId(data.product.id);

      // Limpiar y cerrar form de creación
      setNewName("");
      setNewUnit("kg");
      setShowNewForm(false);

      // Refresh del server component para sincronizar
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      setCreateError(message);
    } finally {
      setCreatingProduct(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tipo de producto - chips */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Producto
          </label>
          <div className="flex flex-wrap gap-2">
            {productTypes.map((type) => (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  setSelectedTypeId(type.id);
                  setSelectedProductId("");
                  setShowNewForm(false);
                  setCreateError("");
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedTypeId === type.id
                    ? "bg-brand-600 text-white shadow-sm"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {type.icon} {type.name}
              </button>
            ))}
          </div>
        </div>

        {/* Producto + Datos */}
        {selectedType && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Selector de producto + botón nuevo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Producto
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    required
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    {selectedType.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(!showNewForm);
                      setCreateError("");
                    }}
                    className={`shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      showNewForm
                        ? "bg-gray-200 text-gray-600"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                    title={showNewForm ? "Cancelar" : "Crear nuevo producto"}
                  >
                    {showNewForm ? "✕" : "+ Nuevo"}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad ({selectedProduct?.unit || "kg"})
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="10"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo por {selectedProduct?.unit || "kg"} ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="5000"
                  value={costPerUnit}
                  onChange={(e) => setCostPerUnit(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Costo Total ($)
                </label>
                <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 font-mono">
                  {totalCost
                    ? `$${Number(totalCost).toLocaleString("es-AR")}`
                    : "—"}
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={loading || !selectedProductId || !totalCost}
                  className="w-full bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? "Procesando..." : "📥 Ingresar"}
                </button>
              </div>
            </div>

            {/* Form inline para crear nuevo producto */}
            {showNewForm && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="text-sm font-medium text-emerald-800 mb-3">
                  Nuevo producto en {selectedType.icon} {selectedType.name}
                </p>
                <div className="flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs text-emerald-700 mb-1">
                      Nombre del producto
                    </label>
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder={`Ej: ${selectedType.name} Especial`}
                      className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreateProduct();
                        }
                        if (e.key === "Escape") {
                          setShowNewForm(false);
                        }
                      }}
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-emerald-700 mb-1">
                      Unidad
                    </label>
                    <select
                      value={newUnit}
                      onChange={(e) => setNewUnit(e.target.value)}
                      className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm"
                    >
                      <option value="kg">kg</option>
                      <option value="unidad">unidad</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateProduct}
                    disabled={creatingProduct || !newName.trim()}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                  >
                    {creatingProduct ? "Creando..." : "✓ Crear"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewForm(false);
                      setNewName("");
                      setCreateError("");
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
                {createError && (
                  <p className="mt-2 text-sm text-red-600">{createError}</p>
                )}
              </div>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4 text-green-700 text-sm">
          {success}
        </div>
      )}
    </div>
  );
}
