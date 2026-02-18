"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  balance: number;
  creditLimit: number;
  _count: { sales: number; payments: number };
}

interface Props {
  customers: Customer[];
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ClientesList({ customers: initialCustomers }: Props) {
  const router = useRouter();
  const [customers, setCustomers] = useState(initialCustomers);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const totalDebt = customers.reduce((s, c) => s + c.balance, 0);
  const withDebt = customers.filter((c) => c.balance > 0).length;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          creditLimit: Number(creditLimit || 0),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCustomers((prev) => [
        ...prev,
        { ...data.customer, balance: 0, creditLimit: Number(creditLimit || 0), _count: { sales: 0, payments: 0 } },
      ]);
      setName("");
      setPhone("");
      setCreditLimit("");
      setShowForm(false);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">Total Clientes</p>
          <p className="text-2xl font-bold">{customers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">Con Saldo Pendiente</p>
          <p className="text-2xl font-bold text-red-600">{withDebt}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">Deuda Total</p>
          <p className="text-2xl font-bold text-red-600">
            {formatMoney(totalDebt)}
          </p>
        </div>
      </div>

      {/* Create button & form */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold">Lista de Clientes</h2>
          <button
            onClick={() => {
              setShowForm(!showForm);
              setError("");
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showForm
                ? "bg-gray-200 text-gray-600"
                : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {showForm ? "✕ Cancelar" : "+ Nuevo Cliente"}
          </button>
        </div>

        {showForm && (
          <div className="p-6 border-b bg-gray-50">
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs text-gray-500 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoFocus
                  placeholder="Nombre del cliente"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="w-40">
                <label className="block text-xs text-gray-500 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="351-555-1234"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="w-36">
                <label className="block text-xs text-gray-500 mb-1">
                  Límite crédito ($)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  placeholder="50000"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Cliente"}
              </button>
            </form>
            {error && (
              <p className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
        )}

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Cliente</th>
                <th className="text-left p-4">Teléfono</th>
                <th className="text-right p-4">Saldo</th>
                <th className="text-right p-4">Límite</th>
                <th className="text-center p-4">Ventas</th>
                <th className="text-center p-4">Pagos</th>
                <th className="text-center p-4"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">{c.name}</td>
                  <td className="p-4 text-gray-500 text-xs">
                    {c.phone || "—"}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`font-mono font-semibold ${
                        c.balance > 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      {c.balance > 0
                        ? formatMoney(c.balance)
                        : "Al día"}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono text-gray-400">
                    {c.creditLimit > 0 ? formatMoney(c.creditLimit) : "—"}
                  </td>
                  <td className="p-4 text-center text-gray-500">
                    {c._count.sales}
                  </td>
                  <td className="p-4 text-center text-gray-500">
                    {c._count.payments}
                  </td>
                  <td className="p-4 text-center">
                    <Link
                      href={`/clientes/${c.id}`}
                      className="text-brand-600 hover:text-brand-700 text-xs font-medium"
                    >
                      Ver detalle →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {customers.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No hay clientes registrados
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
