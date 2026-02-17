"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  inventory: { cutId: string; cutName: string; currentQty: number }[];
}

const reasons = [
  { value: "merma", label: "Merma" },
  { value: "sobrante", label: "Sobrante" },
  { value: "conteo_fisico", label: "Conteo Físico" },
  { value: "error_carga", label: "Error de Carga" },
  { value: "otro", label: "Otro" },
];

export function AdjustmentForm({ inventory }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    const form = new FormData(e.currentTarget);
    const body = {
      cutId: form.get("cutId") as string,
      newQty: Number(form.get("newQty")),
      reason: form.get("reason") as string,
      notes: form.get("notes") as string,
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg(`✅ Stock de ${data.cutName} ajustado: ${data.previousQty} → ${data.newQty} kg`);
      router.refresh();
    } catch (err: any) {
      setMsg(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Corte</label>
        <select name="cutId" required className="w-full border rounded-lg px-3 py-2 text-sm">
          <option value="">Seleccionar...</option>
          {inventory.map(i => (
            <option key={i.cutId} value={i.cutId}>{i.cutName} ({i.currentQty} kg)</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Stock (kg)</label>
        <input type="number" name="newQty" min="0" step="0.01" required className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
        <select name="reason" required className="w-full border rounded-lg px-3 py-2 text-sm">
          {reasons.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
        <input type="text" name="notes" className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Opcional" />
      </div>
      <div className="flex items-end">
        <button type="submit" disabled={loading} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-gray-900 disabled:opacity-50 w-full">
          {loading ? "..." : "Ajustar"}
        </button>
      </div>
      {msg && <p className="lg:col-span-5 text-sm">{msg}</p>}
    </form>
  );
}
