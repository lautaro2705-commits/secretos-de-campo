"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  dni: string | null;
  balance: number;
  creditLimit: number;
  isActive: boolean;
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
  const [editId, setEditId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "withDebt" | "overLimit">("all");

  // Form fields
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formDni, setFormDni] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCreditLimit, setFormCreditLimit] = useState("");

  const activeCustomers = customers.filter((c) => c.isActive);
  const totalDebt = activeCustomers.reduce((s, c) => s + c.balance, 0);
  const withDebt = activeCustomers.filter((c) => c.balance > 0).length;
  const overLimit = activeCustomers.filter((c) => c.creditLimit > 0 && c.balance > c.creditLimit).length;

  const filtered = customers.filter((c) => {
    if (filter === "withDebt") return c.balance > 0;
    if (filter === "overLimit") return c.creditLimit > 0 && c.balance > c.creditLimit;
    return true;
  });

  function resetForm() {
    setEditId(null);
    setFormName("");
    setFormPhone("");
    setFormEmail("");
    setFormDni("");
    setFormAddress("");
    setFormCreditLimit("");
    setShowForm(false);
    setError("");
  }

  function startEdit(c: Customer) {
    setEditId(c.id);
    setFormName(c.name);
    setFormPhone(c.phone || "");
    setFormEmail(c.email || "");
    setFormDni(c.dni || "");
    setFormAddress(c.address || "");
    setFormCreditLimit(c.creditLimit > 0 ? c.creditLimit.toString() : "");
    setShowForm(true);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const payload = {
        ...(editId && { id: editId }),
        name: formName.trim(),
        phone: formPhone.trim() || null,
        email: formEmail.trim() || null,
        dni: formDni.trim() || null,
        address: formAddress.trim() || null,
        creditLimit: Number(formCreditLimit || 0),
      };

      const res = await fetch("/api/customers", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (editId) {
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editId
              ? { ...c, ...payload, creditLimit: Number(formCreditLimit || 0) }
              : c
          )
        );
      } else {
        setCustomers((prev) => [
          ...prev,
          { ...data.customer, balance: 0, creditLimit: Number(formCreditLimit || 0), isActive: true, _count: { sales: 0, payments: 0 } },
        ]);
      }
      resetForm();
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(c: Customer) {
    try {
      const res = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: c.id, isActive: !c.isActive }),
      });
      if (res.ok) {
        setCustomers((prev) => prev.map((x) => x.id === c.id ? { ...x, isActive: !x.isActive } : x));
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-brand-300"
          onClick={() => setFilter("all")}>
          <p className="text-sm text-gray-500">Total Clientes</p>
          <p className="text-2xl font-bold">{activeCustomers.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-red-300"
          onClick={() => setFilter("withDebt")}>
          <p className="text-sm text-gray-500">Con Saldo Pendiente</p>
          <p className="text-2xl font-bold text-red-600">{withDebt}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <p className="text-sm text-gray-500">Deuda Total</p>
          <p className="text-2xl font-bold text-red-600">{formatMoney(totalDebt)}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-6 cursor-pointer hover:border-orange-300"
          onClick={() => setFilter("overLimit")}>
          <p className="text-sm text-orange-600">Exceden Límite</p>
          <p className="text-2xl font-bold text-orange-600">{overLimit}</p>
        </div>
      </div>

      {/* Filter indicator */}
      {filter !== "all" && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">
            Filtro: {filter === "withDebt" ? "Con saldo pendiente" : "Exceden límite de crédito"}
          </span>
          <button onClick={() => setFilter("all")} className="text-brand-600 hover:underline">
            Limpiar filtro
          </button>
        </div>
      )}

      {/* Create/edit form */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold">Lista de Clientes</h2>
          <button
            onClick={() => { if (showForm) resetForm(); else { resetForm(); setShowForm(true); } }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showForm ? "bg-gray-200 text-gray-600" : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            {showForm ? "Cancelar" : "+ Nuevo Cliente"}
          </button>
        </div>

        {showForm && (
          <div className="p-6 border-b bg-gray-50">
            <h3 className="font-semibold mb-3">{editId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                  <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                    required autoFocus placeholder="Nombre del cliente"
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                  <input type="text" value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="351-555-1234" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">DNI</label>
                  <input type="text" value={formDni} onChange={(e) => setFormDni(e.target.value)}
                    placeholder="12345678" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                  <input type="text" value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Límite Crédito ($)</label>
                  <input type="number" min="0" step="1" value={formCreditLimit}
                    onChange={(e) => setFormCreditLimit(e.target.value)}
                    placeholder="0 = sin límite" className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="px-6 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                  {loading ? "Guardando..." : editId ? "Actualizar" : "Crear Cliente"}
                </button>
                <button type="button" onClick={resetForm}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
            </form>
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
                <th className="text-center p-4">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => {
                const overCredit = c.creditLimit > 0 && c.balance > c.creditLimit;
                return (
                  <tr key={c.id} className={`border-b hover:bg-gray-50 ${!c.isActive ? "opacity-50" : ""} ${overCredit ? "bg-orange-50" : ""}`}>
                    <td className="p-4">
                      <span className="font-medium">{c.name}</span>
                      {c.dni && <span className="text-xs text-gray-400 ml-2">DNI: {c.dni}</span>}
                      {overCredit && <span className="ml-2 text-xs bg-orange-200 text-orange-800 px-1.5 py-0.5 rounded">Excede límite</span>}
                    </td>
                    <td className="p-4 text-gray-500 text-xs">{c.phone || "—"}</td>
                    <td className="p-4 text-right">
                      <span className={`font-mono font-semibold ${c.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                        {c.balance > 0 ? formatMoney(c.balance) : "Al día"}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-400">
                      {c.creditLimit > 0 ? formatMoney(c.creditLimit) : "Sin límite"}
                    </td>
                    <td className="p-4 text-center text-gray-500">{c._count.sales}</td>
                    <td className="p-4 text-center text-gray-500">{c._count.payments}</td>
                    <td className="p-4 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => startEdit(c)}
                          className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200">
                          Editar
                        </button>
                        <Link href={`/clientes/${c.id}`}
                          className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
                          Cuenta
                        </Link>
                        <button onClick={() => toggleActive(c)}
                          className={`text-xs px-2 py-1 rounded ${c.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                          {c.isActive ? "Desact." : "Activar"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              {filter !== "all" ? "No hay clientes con este filtro" : "No hay clientes registrados"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
