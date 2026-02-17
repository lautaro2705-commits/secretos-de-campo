"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CutInfo {
  id: string;
  name: string;
  cutCategory: string;
  isSellable: boolean;
}

interface Props {
  categories: { id: string; name: string }[];
  cuts: CutInfo[];
}

const categoryLabels: Record<string, string> = {
  premium: "🥩 Premium",
  parrilla: "🔥 Parrilla",
  guiso: "🍲 Guiso / Horno",
  subproducto: "🦴 Subproductos",
};

const categoryOrder = ["premium", "parrilla", "guiso", "subproducto"];

export function DesposteForm({ categories, cuts }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [cutWeights, setCutWeights] = useState<Record<string, string>>({});
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  // Group cuts by category
  const cutsByCategory = categoryOrder.map((cat) => ({
    category: cat,
    label: categoryLabels[cat] || cat,
    cuts: cuts.filter((c) => c.cutCategory === cat),
  })).filter((g) => g.cuts.length > 0);

  // Calculate totals
  const totalKgEntered = Object.values(cutWeights).reduce(
    (sum, val) => sum + (parseFloat(val) || 0),
    0
  );
  const totalWeightNum = parseFloat(totalWeight) || 0;
  const difference = totalWeightNum - totalKgEntered;
  const differencePercent = totalWeightNum > 0 ? (difference / totalWeightNum) * 100 : 0;

  function handleCutChange(cutId: string, value: string) {
    setCutWeights((prev) => ({ ...prev, [cutId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    const items = Object.entries(cutWeights)
      .filter(([, val]) => parseFloat(val) > 0)
      .map(([cutId, val]) => ({ cutId, actualKg: parseFloat(val) }));

    if (items.length === 0) {
      setError("Ingresá al menos un corte con kg > 0");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/desposte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, totalWeight: totalWeightNum, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al procesar");
      setResult(data);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        {/* Header fields */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso Total Media Res (kg)</label>
            <input
              type="number"
              step="0.01"
              min="1"
              required
              value={totalWeight}
              onChange={(e) => setTotalWeight(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="128.5"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resumen</label>
            <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500">Kg ingresados:</span>
                <span className="font-mono font-medium">{totalKgEntered.toFixed(2)} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diferencia:</span>
                <span className={`font-mono font-medium ${Math.abs(difference) > 0.5 ? "text-amber-600" : "text-green-600"}`}>
                  {difference >= 0 ? "+" : ""}{difference.toFixed(2)} kg ({differencePercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cut weight inputs grouped by category */}
        <div className="space-y-6 mb-6">
          {cutsByCategory.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {group.cuts.map((cut) => {
                  const val = parseFloat(cutWeights[cut.id] || "0") || 0;
                  const pct = totalWeightNum > 0 ? (val / totalWeightNum) * 100 : 0;
                  return (
                    <div key={cut.id} className="border rounded-lg p-3 bg-gray-50 hover:bg-white transition-colors">
                      <label className="block text-xs font-medium text-gray-700 mb-1 truncate" title={cut.name}>
                        {cut.name}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cutWeights[cut.id] || ""}
                        onChange={(e) => handleCutChange(cut.id, e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm font-mono"
                        placeholder="0.00"
                      />
                      {val > 0 && (
                        <p className="text-xs text-gray-400 mt-1 font-mono">{pct.toFixed(2)}%</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !categoryId || !totalWeight}
          className="bg-brand-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors text-sm"
        >
          {loading ? "Procesando..." : "📥 Registrar Desposte"}
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 space-y-4">
          {/* Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              ✅ Desposte #{result.realYield.yieldNumber} registrado
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className="text-gray-500">Peso media res:</span>
                <p className="font-mono font-medium">{result.realYield.totalWeight} kg</p>
              </div>
              <div>
                <span className="text-gray-500">Total cortes:</span>
                <p className="font-mono font-medium">{result.realYield.totalKgRegistered} kg</p>
              </div>
              <div>
                <span className="text-gray-500">Merma/Varianza:</span>
                <p className={`font-mono font-medium ${Math.abs(result.realYield.variance) > 1 ? "text-amber-600" : "text-green-600"}`}>
                  {result.realYield.variance} kg ({result.realYield.variancePercent}%)
                </p>
              </div>
              <div>
                <span className="text-gray-500">Aprendizaje:</span>
                <p className={`font-mono font-medium ${result.learning.applied ? "text-blue-600" : "text-gray-400"}`}>
                  {result.learning.applied ? `α = ${(result.learning.learningRate * 100).toFixed(1)}%` : "No aplicado"}
                </p>
              </div>
            </div>
          </div>

          {/* Learning message */}
          {result.learning.applied && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
              🧠 {result.learning.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
