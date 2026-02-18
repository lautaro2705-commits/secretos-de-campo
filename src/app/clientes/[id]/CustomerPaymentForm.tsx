"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  customerId: string;
  currentBalance: number;
  paymentMethods: { id: string; name: string }[];
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CustomerPaymentForm({
  customerId,
  currentBalance,
  paymentMethods,
}: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState(currentBalance.toString());
  const [paymentMethodId, setPaymentMethodId] = useState(
    paymentMethods[0]?.id || ""
  );
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numAmount = Number(amount);
    if (numAmount <= 0 || !paymentMethodId) return;

    setLoading(true);
    setError("");
    setSuccess(null);

    try {
      const res = await fetch(`/api/customers/${customerId}/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: numAmount,
          paymentMethodId,
          reference: reference || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSuccess(
        `Cobro registrado: ${formatMoney(data.amountApplied)}. Nuevo saldo: ${formatMoney(data.newBalance)}`
      );
      setAmount(data.newBalance.toString());
      setReference("");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border">
      <div className="p-6 border-b">
        <h2 className="font-semibold">💳 Registrar Cobro</h2>
      </div>
      <div className="p-6">
        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="w-40">
            <label className="block text-xs text-gray-500 mb-1">
              Monto ($)
            </label>
            <input
              type="number"
              min="1"
              max={currentBalance}
              step="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-0.5">
              Máx: {formatMoney(currentBalance)}
            </p>
          </div>
          <div className="w-48">
            <label className="block text-xs text-gray-500 mb-1">
              Método de pago
            </label>
            <select
              value={paymentMethodId}
              onChange={(e) => setPaymentMethodId(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {paymentMethods.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs text-gray-500 mb-1">
              Referencia (opcional)
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Nro. comprobante, etc."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading || Number(amount) <= 0}
            className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? "Procesando..." : "Registrar Cobro"}
          </button>
        </form>

        {error && (
          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
