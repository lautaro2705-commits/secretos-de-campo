"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  categories: { id: string; name: string }[];
  ranges: { id: string; label: string; minWeight: number; maxWeight: number }[];
}

export function BatchEntryForm({ categories, ranges }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | { cuts: { cutName: string; estimatedKg: number; percentageYield: number }[]; totalProjected: number }>(null);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const form = new FormData(e.currentTarget);
    const body = {
      categoryId: form.get("categoryId") as string,
      unitCount: Number(form.get("unitCount")),
      totalWeight: Number(form.get("totalWeight")),
      totalCost: Number(form.get("totalCost")),
    };

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");
      setResult(data.projection);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select name="categoryId" required className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad (medias reses)</label>
          <input type="number" name="unitCount" min="1" required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="5" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Peso Total (kg)</label>
          <input type="number" name="totalWeight" min="1" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="520" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Costo Total ($)</label>
          <input type="number" name="totalCost" min="0" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="1820000" />
        </div>
        <div className="lg:col-span-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {loading ? "Procesando..." : "📥 Ingresar Mercadería"}
          </button>
        </div>
      </form>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-semibold text-green-800 mb-3">✅ Proyección generada — {result.totalProjected.toFixed(2)} kg totales</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            {result.cuts.map(cut => (
              <div key={cut.cutName} className="bg-white rounded-lg p-3 text-sm">
                <p className="font-medium">{cut.cutName}</p>
                <p className="text-green-700 font-mono">{cut.estimatedKg.toFixed(2)} kg</p>
                <p className="text-gray-400 text-xs">{cut.percentageYield}%</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
