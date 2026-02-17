"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function BulkPriceUpdate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const percentage = Number(form.get("percentage"));

    if (!percentage) return;
    if (!confirm(`¿Aplicar ${percentage > 0 ? "aumento" : "descuento"} del ${Math.abs(percentage)}% a TODOS los precios de venta?`)) return;

    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ percentage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ ${data.count} precios actualizados`);
      router.refresh();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Porcentaje (%)</label>
        <input
          type="number"
          name="percentage"
          step="0.1"
          required
          className="border rounded-lg px-3 py-2 text-sm w-40"
          placeholder="Ej: 15 o -5"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Aplicando..." : "Aplicar a todos"}
      </button>
      {msg && <p className="text-sm">{msg}</p>}
    </form>
  );
}
