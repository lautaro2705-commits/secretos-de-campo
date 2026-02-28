"use client";

import { useState } from "react";

interface Supplier {
  id: string;
  name: string;
  razonSocial: string | null;
  cuit: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  balance: number;
  isActive: boolean;
  _count: { supplierInvoices: number; generalStocks: number };
}

interface Invoice {
  id: string;
  supplierId: string;
  invoiceNumber: string | null;
  invoiceDate: string;
  dueDate: string | null;
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  status: string;
  notes: string | null;
  supplier: { name: string };
  payments: { id: string; amount: number; paymentDate: string; paymentMethod: { name: string }; reference: string | null }[];
}

interface PaymentMethod {
  id: string;
  name: string;
}

interface Movement {
  type: "invoice" | "payment";
  id: string;
  date: string;
  description: string;
  amount: number;
}

interface Props {
  initialSuppliers: Supplier[];
  initialInvoices: Invoice[];
  paymentMethods: PaymentMethod[];
}

type Tab = "lista" | "facturas" | "cuenta";

export function ProveedoresClient({ initialSuppliers, initialInvoices, paymentMethods }: Props) {
  const [suppliers, setSuppliers] = useState(initialSuppliers);
  const [invoices, setInvoices] = useState(initialInvoices);
  const [tab, setTab] = useState<Tab>("lista");
  const [loading, setLoading] = useState(false);

  // Supplier form
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formRazon, setFormRazon] = useState("");
  const [formCuit, setFormCuit] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Invoice form
  const [showInvForm, setShowInvForm] = useState(false);
  const [invSupplierId, setInvSupplierId] = useState("");
  const [invNumber, setInvNumber] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().split("T")[0]);
  const [invDueDate, setInvDueDate] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invNotes, setInvNotes] = useState("");

  // Payment form
  const [payInvoiceId, setPayInvoiceId] = useState<string | null>(null);
  const [payMethodId, setPayMethodId] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(new Date().toISOString().split("T")[0]);
  const [payRef, setPayRef] = useState("");

  // Account view
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);

  const totalDeuda = suppliers.filter((s) => s.isActive).reduce((sum, s) => sum + s.balance, 0);

  // ── Refresh data ──
  async function refreshData() {
    const [suppRes, invRes] = await Promise.all([
      fetch("/api/suppliers"),
      fetch("/api/supplier-invoices"),
    ]);
    if (suppRes.ok) setSuppliers(await suppRes.json());
    if (invRes.ok) setInvoices(await invRes.json());
  }

  // ── Supplier CRUD ──
  function startEdit(s: Supplier) {
    setEditId(s.id);
    setFormName(s.name);
    setFormRazon(s.razonSocial || "");
    setFormCuit(s.cuit || "");
    setFormPhone(s.phone || "");
    setFormEmail(s.email || "");
    setFormAddress(s.address || "");
    setFormNotes(s.notes || "");
    setShowForm(true);
  }

  function resetForm() {
    setEditId(null);
    setFormName("");
    setFormRazon("");
    setFormCuit("");
    setFormPhone("");
    setFormEmail("");
    setFormAddress("");
    setFormNotes("");
    setShowForm(false);
  }

  async function handleSupplierSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...(editId && { id: editId }),
        name: formName,
        razonSocial: formRazon,
        cuit: formCuit,
        phone: formPhone,
        email: formEmail,
        address: formAddress,
        notes: formNotes,
      };

      const res = await fetch("/api/suppliers", {
        method: editId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshData();
      resetForm();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(s: Supplier) {
    try {
      const res = await fetch("/api/suppliers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, isActive: !s.isActive }),
      });
      if (res.ok) await refreshData();
    } catch {}
  }

  // ── Invoice ──
  async function handleInvoiceSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/supplier-invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId: invSupplierId,
          invoiceNumber: invNumber,
          invoiceDate: invDate,
          dueDate: invDueDate || null,
          totalAmount: parseFloat(invAmount),
          notes: invNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshData();
      setShowInvForm(false);
      setInvNumber("");
      setInvAmount("");
      setInvDueDate("");
      setInvNotes("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al crear factura");
    } finally {
      setLoading(false);
    }
  }

  // ── Payment ──
  async function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/supplier-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: payInvoiceId,
          paymentMethodId: payMethodId,
          amount: parseFloat(payAmount),
          paymentDate: payDate,
          reference: payRef,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await refreshData();
      setPayInvoiceId(null);
      setPayAmount("");
      setPayRef("");
      // Refresh account if viewing one
      if (selectedSupplier) loadAccount(selectedSupplier);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al registrar pago");
    } finally {
      setLoading(false);
    }
  }

  // ── Account ──
  async function loadAccount(supplierId: string) {
    setSelectedSupplier(supplierId);
    setTab("cuenta");
    try {
      const res = await fetch(`/api/supplier-payments?supplierId=${supplierId}`);
      if (res.ok) {
        const data = await res.json();
        setMovements(data.movements);
      }
    } catch {}
  }

  const selectedSupplierData = suppliers.find((s) => s.id === selectedSupplier);
  const activeSuppliers = suppliers.filter((s) => s.isActive);

  // Facturas con vencimiento próximo (próximos 7 días)
  const today = new Date();
  const upcomingDue = invoices.filter((inv) => {
    if (inv.status === "paid" || !inv.dueDate) return false;
    const due = new Date(inv.dueDate);
    const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= -30;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-sm text-red-600">Deuda Total</p>
          <p className="text-3xl font-bold text-red-700">
            ${totalDeuda.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-sm text-blue-600">Proveedores Activos</p>
          <p className="text-3xl font-bold text-blue-700">{activeSuppliers.length}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <p className="text-sm text-yellow-600">Facturas por Vencer</p>
          <p className="text-3xl font-bold text-yellow-700">{upcomingDue.length}</p>
        </div>
      </div>

      {/* Alertas de vencimiento */}
      {upcomingDue.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Facturas por vencer / vencidas</h3>
          <div className="space-y-1">
            {upcomingDue.map((inv) => {
              const due = new Date(inv.dueDate!);
              const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = diff < 0;
              return (
                <div key={inv.id} className="flex justify-between text-sm">
                  <span>
                    <span className={isOverdue ? "text-red-700 font-semibold" : "text-yellow-800"}>
                      {isOverdue ? "VENCIDA" : `Vence en ${diff} día${diff !== 1 ? "s" : ""}`}
                    </span>
                    {" — "}{inv.supplier.name} — Fact. {inv.invoiceNumber || "S/N"}
                  </span>
                  <span className="font-mono text-red-600">
                    ${inv.pendingAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {([["lista", "Proveedores"], ["facturas", "Facturas"], ["cuenta", "Cuenta Corriente"]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-white border border-b-0 text-brand-700" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════ TAB: LISTA ═══════════════════════ */}
      {tab === "lista" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Proveedores</h2>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
            >
              + Nuevo Proveedor
            </button>
          </div>

          {/* Form */}
          {showForm && (
            <form onSubmit={handleSupplierSubmit} className="bg-white border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold">{editId ? "Editar" : "Nuevo"} Proveedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nombre *</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Razón Social</label>
                  <input value={formRazon} onChange={(e) => setFormRazon(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">CUIT</label>
                  <input value={formCuit} onChange={(e) => setFormCuit(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="XX-XXXXXXXX-X" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Teléfono</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Email</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Dirección</label>
                  <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notas</label>
                <textarea value={formNotes} onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" rows={2} />
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
                  {loading ? "Guardando..." : editId ? "Actualizar" : "Crear"}
                </button>
                <button type="button" onClick={resetForm}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm hover:bg-gray-200">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((s) => (
              <div key={s.id} className={`bg-white rounded-xl shadow-sm border p-6 ${!s.isActive ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">{s.name}</h3>
                    {s.razonSocial && <p className="text-sm text-gray-500">{s.razonSocial}</p>}
                    <p className="text-xs text-gray-400 mt-1">CUIT: {s.cuit ?? "Sin registrar"}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {s.isActive ? "Activo" : "Inactivo"}
                  </span>
                </div>

                <div className="mt-3 flex gap-4 text-xs text-gray-400">
                  <span>{s._count.supplierInvoices} fact.</span>
                  <span>{s._count.generalStocks} tropas</span>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">{s.phone ?? "-"}</span>
                    <span className={`font-mono text-lg font-bold ${s.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${s.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button onClick={() => startEdit(s)}
                    className="text-xs bg-gray-100 px-3 py-1 rounded hover:bg-gray-200">
                    Editar
                  </button>
                  <button onClick={() => loadAccount(s.id)}
                    className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200">
                    Cuenta
                  </button>
                  <button onClick={() => toggleActive(s)}
                    className={`text-xs px-3 py-1 rounded ${s.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"}`}>
                    {s.isActive ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════ TAB: FACTURAS ═══════════════════════ */}
      {tab === "facturas" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-lg">Facturas</h2>
            <button
              onClick={() => { setShowInvForm(!showInvForm); if (!invSupplierId && activeSuppliers.length) setInvSupplierId(activeSuppliers[0].id); }}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-green-700"
            >
              + Nueva Factura
            </button>
          </div>

          {/* Invoice Form */}
          {showInvForm && (
            <form onSubmit={handleInvoiceSubmit} className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-green-800">Nueva Factura de Proveedor</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Proveedor *</label>
                  <select value={invSupplierId} onChange={(e) => setInvSupplierId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Seleccionar...</option>
                    {activeSuppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Nº Factura</label>
                  <input value={invNumber} onChange={(e) => setInvNumber(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="A-0001-00001234" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monto Total *</label>
                  <input type="number" step="0.01" min="0.01" value={invAmount} onChange={(e) => setInvAmount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha Factura</label>
                  <input type="date" value={invDate} onChange={(e) => setInvDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha Vencimiento</label>
                  <input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Notas</label>
                  <input value={invNotes} onChange={(e) => setInvNotes(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={loading}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                  {loading ? "Guardando..." : "Registrar Factura"}
                </button>
                <button type="button" onClick={() => setShowInvForm(false)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Invoice Table */}
          <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4">Nº Factura</th>
                  <th className="text-left p-4">Proveedor</th>
                  <th className="text-left p-4">Fecha</th>
                  <th className="text-left p-4">Vencimiento</th>
                  <th className="text-right p-4">Total</th>
                  <th className="text-right p-4">Pagado</th>
                  <th className="text-right p-4">Pendiente</th>
                  <th className="text-center p-4">Estado</th>
                  <th className="text-center p-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan={9} className="p-8 text-center text-gray-400">Sin facturas registradas</td></tr>
                ) : invoices.map((inv) => {
                  const isOverdue = inv.dueDate && inv.status !== "paid" && new Date(inv.dueDate) < today;
                  return (
                    <tr key={inv.id} className={`border-b hover:bg-gray-50 ${isOverdue ? "bg-red-50" : ""}`}>
                      <td className="p-4 font-mono">{inv.invoiceNumber ?? "-"}</td>
                      <td className="p-4">{inv.supplier.name}</td>
                      <td className="p-4">{new Date(inv.invoiceDate).toLocaleDateString("es-AR")}</td>
                      <td className={`p-4 ${isOverdue ? "text-red-600 font-semibold" : ""}`}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString("es-AR") : "-"}
                        {isOverdue && " ⚠️"}
                      </td>
                      <td className="p-4 text-right font-mono">
                        ${inv.totalAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono text-green-600">
                        ${inv.paidAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-right font-mono text-red-600">
                        ${inv.pendingAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          inv.status === "paid" ? "bg-green-100 text-green-700" :
                          inv.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {inv.status === "paid" ? "Pagada" : inv.status === "partial" ? "Parcial" : "Pendiente"}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {inv.status !== "paid" && (
                          <button
                            onClick={() => {
                              setPayInvoiceId(inv.id);
                              setPayAmount(inv.pendingAmount.toString());
                              if (paymentMethods.length) setPayMethodId(paymentMethods[0].id);
                            }}
                            className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200"
                          >
                            Pagar
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Payment Modal */}
          {payInvoiceId && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <form onSubmit={handlePaymentSubmit}
                className="bg-white rounded-xl p-6 w-full max-w-md space-y-4 shadow-xl">
                <h3 className="font-semibold text-lg">Registrar Pago</h3>
                {(() => {
                  const inv = invoices.find((i) => i.id === payInvoiceId);
                  if (!inv) return null;
                  return (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <p><strong>{inv.supplier.name}</strong> — Fact. {inv.invoiceNumber || "S/N"}</p>
                      <p className="text-red-600">Pendiente: ${inv.pendingAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                    </div>
                  );
                })()}
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Método de Pago *</label>
                  <select value={payMethodId} onChange={(e) => setPayMethodId(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" required>
                    <option value="">Seleccionar...</option>
                    {paymentMethods.map((pm) => (
                      <option key={pm.id} value={pm.id}>{pm.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Monto *</label>
                  <input type="number" step="0.01" min="0.01" value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" required />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Referencia / Nº comprobante</label>
                  <input value={payRef} onChange={(e) => setPayRef(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nº transferencia, cheque, etc." />
                </div>
                <div className="flex gap-2">
                  <button type="submit" disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-green-700 disabled:opacity-50">
                    {loading ? "Procesando..." : "Confirmar Pago"}
                  </button>
                  <button type="button" onClick={() => setPayInvoiceId(null)}
                    className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm">
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════ TAB: CUENTA CORRIENTE ═══════════════════════ */}
      {tab === "cuenta" && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg">Cuenta Corriente</h2>
            <select
              value={selectedSupplier || ""}
              onChange={(e) => { if (e.target.value) loadAccount(e.target.value); }}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Seleccionar proveedor...</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>{s.name} (${s.balance.toLocaleString("es-AR")})</option>
              ))}
            </select>
          </div>

          {selectedSupplierData && (
            <>
              {/* Resumen */}
              <div className="bg-white border rounded-xl p-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{selectedSupplierData.name}</h3>
                    {selectedSupplierData.razonSocial && (
                      <p className="text-gray-500">{selectedSupplierData.razonSocial}</p>
                    )}
                    <p className="text-sm text-gray-400">CUIT: {selectedSupplierData.cuit || "-"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Saldo</p>
                    <p className={`text-3xl font-bold ${selectedSupplierData.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                      ${selectedSupplierData.balance.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Movimientos */}
              <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <div className="p-4 border-b">
                  <h3 className="font-semibold">Movimientos</h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-4">Fecha</th>
                      <th className="text-left p-4">Descripción</th>
                      <th className="text-right p-4">Debe</th>
                      <th className="text-right p-4">Haber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.length === 0 ? (
                      <tr><td colSpan={4} className="p-8 text-center text-gray-400">Sin movimientos</td></tr>
                    ) : movements.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">{new Date(m.date).toLocaleDateString("es-AR")}</td>
                        <td className="p-4">{m.description}</td>
                        <td className="p-4 text-right font-mono text-red-600">
                          {m.amount > 0 ? `$${m.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                        </td>
                        <td className="p-4 text-right font-mono text-green-600">
                          {m.amount < 0 ? `$${Math.abs(m.amount).toLocaleString("es-AR", { minimumFractionDigits: 2 })}` : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {!selectedSupplier && (
            <p className="text-gray-400 text-center py-12">Seleccioná un proveedor para ver su cuenta corriente</p>
          )}
        </div>
      )}
    </div>
  );
}
