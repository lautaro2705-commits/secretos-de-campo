"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProductType {
  id: string;
  name: string;
  icon: string | null;
  products: { id: string; name: string; unit: string }[];
}

interface Props {
  productTypes: ProductType[];
}

export function ProductEntryForm({ productTypes }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [costPerUnit, setCostPerUnit] = useState("");

  const selectedType = productTypes.find((t) => t.id === selectedTypeId);
  const selectedProduct = selectedType?.products.find((p) => p.id === selectedProductId);

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto
              </label>
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
