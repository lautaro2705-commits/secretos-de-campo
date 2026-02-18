"use client";

import { useState, useCallback } from "react";

type Stock = {
  id: string;
  batchDescription: string;
  entryDate: string;
  animalCategory: string;
  unitCount: number;
  totalWeightKg: number;
  bonePercent: number;
  fatPercent: number;
  mermaPercent: number;
  sellableKg: number;
  soldKg: number;
  remainingKg: number;
  status: string;
  supplierName: string | null;
  notes: string | null;
};

type Category = { id: string; name: string };
type Supplier = { id: string; name: string };

type Props = {
  stocks: Stock[];
  categories: Category[];
  suppliers: Supplier[];
  inventoryKg: number;
};

const emptyForm = {
  batchDescription: "",
  animalCategory: "",
  categoryId: "",
  unitCount: "",
  totalWeightKg: "",
  bonePercent: "",
  fatPercent: "",
  mermaPercent: "5",
  supplierId: "",
  notes: "",
  entryDate: new Date().toISOString().split("T")[0],
};

export function StockGeneralClient({ stocks: initial, categories, suppliers, inventoryKg }: Props) {
  const [stocks, setStocks] = useState<Stock[]>(initial);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [estimateMsg, setEstimateMsg] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showQuickForm, setShowQuickForm] = useState(false);
  const [quickDesc, setQuickDesc] = useState("");
  const [quickKg, setQuickKg] = useState("");
  const [quickSupplier, setQuickSupplier] = useState("");
  const [quickNotes, setQuickNotes] = useState("");

  const active = stocks.filter((s) => s.status === "active");
  const depleted = stocks.filter((s) => s.status === "depleted");
  const totalRemaining = active.reduce((s, t) => s + t.remainingKg, 0);

  // Calculate sellable kg in real-time
  const calcSellable = useCallback(() => {
    const total = Number(form.totalWeightKg) || 0;
    const bone = Number(form.bonePercent) || 0;
    const fat = Number(form.fatPercent) || 0;
    const merma = Number(form.mermaPercent) || 0;
    return total > 0 ? Math.round(total * (1 - (bone + fat + merma) / 100) * 100) / 100 : 0;
  }, [form.totalWeightKg, form.bonePercent, form.fatPercent, form.mermaPercent]);

  // Fetch yield estimate when category/weight/units change
  const fetchEstimate = useCallback(
    async (categoryId: string, totalWeightKg: string, unitCount: string) => {
      if (!categoryId || !totalWeightKg || !unitCount) return;
      try {
        const params = new URLSearchParams({
          categoryId,
          totalWeightKg,
          unitCount,
          mermaPercent: form.mermaPercent || "5",
        });
        const res = await fetch(`/api/general-stock/yield-estimate?${params}`);
        const data = await res.json();
        if (data.found) {
          setForm((prev) => ({
            ...prev,
            bonePercent: String(data.bonePercent),
            fatPercent: String(data.fatPercent),
          }));
          setEstimateMsg(
            `Estimado automático: hueso ${data.bonePercent}%, grasa ${data.fatPercent}% (basado en plantilla EMA)`
          );
        } else {
          setEstimateMsg(data.message || "Sin plantilla. Ingrese % manualmente.");
        }
      } catch {
        setEstimateMsg("Error al obtener estimación");
      }
    },
    [form.mermaPercent]
  );

  const handleCategoryChange = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    setForm((prev) => ({
      ...prev,
      categoryId,
      animalCategory: cat?.name || prev.animalCategory,
    }));
    fetchEstimate(categoryId, form.totalWeightKg, form.unitCount);
  };

  const handleWeightOrUnitsChange = (field: string, value: string) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };
      if (updated.categoryId && updated.totalWeightKg && updated.unitCount) {
        fetchEstimate(updated.categoryId, updated.totalWeightKg, updated.unitCount);
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.batchDescription || !form.animalCategory || !form.unitCount || !form.totalWeightKg) {
      setError("Complete todos los campos obligatorios");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/general-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          bonePercent: form.bonePercent ? Number(form.bonePercent) : undefined,
          fatPercent: form.fatPercent ? Number(form.fatPercent) : undefined,
          mermaPercent: Number(form.mermaPercent) || 5,
          unitCount: Number(form.unitCount),
          totalWeightKg: Number(form.totalWeightKg),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Refresh list
      const listRes = await fetch("/api/general-stock");
      const list = await listRes.json();
      setStocks(list);
      setForm(emptyForm);
      setEstimateMsg("");
      setShowForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleQuickSubmit = async () => {
    if (!quickDesc || !quickKg) {
      setError("Ingrese descripción y kg");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/general-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchDescription: quickDesc,
          animalCategory: "Corte suelto",
          unitCount: 1,
          totalWeightKg: Number(quickKg),
          bonePercent: 0,
          fatPercent: 0,
          mermaPercent: 0,
          supplierId: quickSupplier || undefined,
          notes: quickNotes || undefined,
          entryDate: new Date().toISOString().split("T")[0],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const listRes = await fetch("/api/general-stock");
      const list = await listRes.json();
      setStocks(list);
      setQuickDesc("");
      setQuickKg("");
      setQuickSupplier("");
      setQuickNotes("");
      setShowQuickForm(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner resumen */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-green-700 font-medium">Stock total disponible</p>
            <p className="text-4xl font-bold text-green-800">
              {(inventoryKg + totalRemaining).toFixed(1)} kg
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => { setShowQuickForm(!showQuickForm); setShowForm(false); }}
              className="bg-blue-600 text-white px-5 py-3 rounded-lg hover:bg-blue-700 transition font-medium text-sm"
            >
              {showQuickForm ? "Cancelar" : "+ Ingreso Rápido"}
            </button>
            <button
              onClick={() => { setShowForm(!showForm); setShowQuickForm(false); }}
              className="bg-green-600 text-white px-5 py-3 rounded-lg hover:bg-green-700 transition font-medium text-sm"
            >
              {showForm ? "Cancelar" : "+ Nueva Tropa"}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-gray-500">Inventario por cortes</p>
            <p className="text-lg font-bold text-blue-700">{inventoryKg.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-gray-500">Tropas pendientes de venta</p>
            <p className="text-lg font-bold text-green-700">{totalRemaining.toFixed(1)} kg</p>
          </div>
          <div className="bg-white rounded-lg p-3 border">
            <p className="text-xs text-gray-500">Tropas activas</p>
            <p className="text-lg font-bold text-gray-700">
              {active.length} tropa{active.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Form ingreso rápido */}
      {showQuickForm && (
        <div className="bg-white border border-blue-200 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">📦 Ingreso Rápido de kg</h2>
          <p className="text-sm text-gray-500">
            Para cajas de cortes, piernas, francés u otros cortes sueltos. Los kg van directo al stock sin descuento de hueso/grasa.
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <input
                type="text"
                placeholder="Ej: Caja de vacío, Pierna, Francés"
                value={quickDesc}
                onChange={(e) => setQuickDesc(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kg *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                placeholder="Ej: 25"
                value={quickKg}
                onChange={(e) => setQuickKg(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select
                value={quickSupplier}
                onChange={(e) => setQuickSupplier(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <input
                type="text"
                placeholder="Opcional"
                value={quickNotes}
                onChange={(e) => setQuickNotes(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          <button
            onClick={handleQuickSubmit}
            disabled={saving}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-medium"
          >
            {saving ? "Guardando..." : "Guardar Ingreso"}
          </button>
        </div>
      )}

      {/* Form nueva tropa */}
      {showForm && (
        <div className="bg-white border rounded-xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Cargar nueva tropa</h2>

          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <input
                type="text"
                placeholder="Ej: 4 novillos - Don Pedro"
                value={form.batchDescription}
                onChange={(e) => setForm({ ...form, batchDescription: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría animal *
              </label>
              {categories.length > 0 ? (
                <select
                  value={form.categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Seleccionar...</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej: Novillo"
                  value={form.animalCategory}
                  onChange={(e) => setForm({ ...form, animalCategory: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha ingreso
              </label>
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unidades (medias reses) *
              </label>
              <input
                type="number"
                min="1"
                value={form.unitCount}
                onChange={(e) => handleWeightOrUnitsChange("unitCount", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Peso total (kg) *
              </label>
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.totalWeightKg}
                onChange={(e) => handleWeightOrUnitsChange("totalWeightKg", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor
              </label>
              <select
                value={form.supplierId}
                onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Porcentajes */}
          {estimateMsg && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm">
              {estimateMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hueso %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.bonePercent}
                onChange={(e) => setForm({ ...form, bonePercent: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Auto o manual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Grasa %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.fatPercent}
                onChange={(e) => setForm({ ...form, fatPercent: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Auto o manual"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Merma %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.mermaPercent}
                onChange={(e) => setForm({ ...form, mermaPercent: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kg vendibles
              </label>
              <div className="w-full border rounded-lg px-3 py-2 text-sm bg-green-50 font-bold text-green-800">
                {calcSellable()} kg
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving}
            className="bg-brand-600 text-white px-6 py-3 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition font-medium"
          >
            {saving ? "Guardando..." : "Guardar Tropa"}
          </button>
        </div>
      )}

      {/* Tropas activas */}
      <div className="bg-white border rounded-xl overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-semibold">Tropas activas</h2>
        </div>
        {active.length === 0 ? (
          <p className="p-6 text-gray-400 text-center">No hay tropas activas</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="text-left px-4 py-3">Fecha</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-right px-4 py-3">Peso Total</th>
                  <th className="text-right px-4 py-3">Vendible</th>
                  <th className="text-right px-4 py-3">Vendido</th>
                  <th className="text-right px-4 py-3">Restante</th>
                  <th className="px-4 py-3">Avance</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {active.map((s) => {
                  const pct = s.sellableKg > 0 ? (s.soldKg / s.sellableKg) * 100 : 0;
                  return (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500">{s.entryDate}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{s.batchDescription}</div>
                        <div className="text-xs text-gray-400">
                          {s.animalCategory} — {s.unitCount} u
                          {s.supplierName && ` — ${s.supplierName}`}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">{s.totalWeightKg.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{s.sellableKg.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right">{s.soldKg.toFixed(1)}</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">
                        {s.remainingKg.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 rounded-full h-2 transition-all"
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historial (tropas agotadas) */}
      {depleted.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-500">
              Historial — Tropas agotadas ({depleted.length})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3">Fecha ingreso</th>
                  <th className="text-left px-4 py-3">Descripción</th>
                  <th className="text-right px-4 py-3">Peso Total</th>
                  <th className="text-right px-4 py-3">Vendible</th>
                  <th className="text-right px-4 py-3">Vendido</th>
                  <th className="text-left px-4 py-3">Proveedor</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {depleted.slice(0, 20).map((s) => (
                  <tr key={s.id} className="text-gray-400">
                    <td className="px-4 py-3">{s.entryDate}</td>
                    <td className="px-4 py-3">{s.batchDescription}</td>
                    <td className="px-4 py-3 text-right">{s.totalWeightKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{s.sellableKg.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right">{s.soldKg.toFixed(1)}</td>
                    <td className="px-4 py-3">{s.supplierName || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
