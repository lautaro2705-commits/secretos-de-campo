"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Sale {
  id: string;
  saleNumber: number;
  total: number;
  status: string;
  saleDate: string;
  customer: { name: string } | null;
  payments: { amount: number; paymentMethod: { name: string } }[];
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  paymentMethod: { name: string } | null;
  createdAt: string;
}

interface Advance {
  id: string;
  amount: number;
  notes: string | null;
  employee: { name: string };
  paymentMethod: { name: string } | null;
  createdAt: string;
}

interface Employee {
  id: string;
  name: string;
  role: string | null;
  phone: string | null;
}

interface PaymentMethod {
  id: string;
  name: string;
  surchargePercentage: number;
}

interface ExistingClose {
  id: string;
  totalSales: number;
  totalCash: number;
  totalCard: number;
  difference: number;
  actualCash: number;
  posnetTotal: number;
  scaleReadings: any;
}

interface GeneralStockSummary {
  totalRemainingKg: number;
  activeTropas: { id: string; description: string; remainingKg: number }[];
}

interface Props {
  sales: Sale[];
  expenses: Expense[];
  advances: Advance[];
  employees: Employee[];
  paymentMethods: PaymentMethod[];
  existingClose: ExistingClose | null;
  generalStock?: GeneralStockSummary;
}

const EXPENSE_CATEGORIES = [
  "Servicios",
  "Insumos",
  "Limpieza",
  "Mantenimiento",
  "Transporte",
  "Otros",
];

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function CajaClient({
  sales: initialSales,
  expenses: initialExpenses,
  advances: initialAdvances,
  employees: initialEmployees,
  paymentMethods,
  existingClose,
  generalStock,
}: Props) {
  const router = useRouter();
  const [sales] = useState(initialSales);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [advances, setAdvances] = useState(initialAdvances);
  const [employeeList, setEmployeeList] = useState(initialEmployees);

  // Employee form
  const [showEmpForm, setShowEmpForm] = useState(false);
  const [empName, setEmpName] = useState("");
  const [empRole, setEmpRole] = useState("");
  const [empPhone, setEmpPhone] = useState("");
  const [empLoading, setEmpLoading] = useState(false);
  const [empDeleting, setEmpDeleting] = useState<string | null>(null);

  // Expense form
  const [expCategory, setExpCategory] = useState("Servicios");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [expLoading, setExpLoading] = useState(false);

  // Advance form
  const [advEmployeeId, setAdvEmployeeId] = useState("");
  const [advAmount, setAdvAmount] = useState("");
  const [advNotes, setAdvNotes] = useState("");
  const [advLoading, setAdvLoading] = useState(false);

  // Scale readings
  const [scaleReadings, setScaleReadings] = useState<
    { label: string; kgStart: string; kgEnd: string }[]
  >(
    existingClose?.scaleReadings || [
      { label: "Balanza 1", kgStart: "", kgEnd: "" },
      { label: "Balanza 2", kgStart: "", kgEnd: "" },
    ]
  );

  // Close form
  const [posnetTotal, setPosnetTotal] = useState(
    existingClose?.posnetTotal?.toString() || ""
  );
  const [actualCash, setActualCash] = useState(
    existingClose?.actualCash?.toString() || ""
  );
  const [closeNotes, setCloseNotes] = useState("");
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeResult, setCloseResult] = useState<any>(null);
  const [closeError, setCloseError] = useState("");

  // --- Cálculos ---
  const totalSales = sales.reduce((s, sale) => s + sale.total, 0);
  const salesCount = sales.length;

  // Desglose por método
  let cashFromSales = 0;
  let cardFromSales = 0;
  let transferFromSales = 0;
  let mpFromSales = 0;

  for (const sale of sales) {
    for (const p of sale.payments) {
      const name = p.paymentMethod.name.toLowerCase();
      if (name.includes("efectivo")) cashFromSales += p.amount;
      else if (name.includes("bit") || name.includes("dit") || name.includes("créd") || name.includes("cred"))
        cardFromSales += p.amount;
      else if (name.includes("transfer")) transferFromSales += p.amount;
      else if (name.includes("mercado") || name.includes("mp"))
        mpFromSales += p.amount;
      else cashFromSales += p.amount;
    }
  }

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalAdvances = advances.reduce((s, a) => s + a.amount, 0);
  const expectedCash = cashFromSales - totalExpenses - totalAdvances;

  // --- Handlers ---
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!expAmount || Number(expAmount) <= 0) return;
    setExpLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: expCategory,
          amount: Number(expAmount),
          description: expDesc || expCategory,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setExpenses((prev) => [data.expense, ...prev]);
      setExpAmount("");
      setExpDesc("");
      router.refresh();
    } catch {
    } finally {
      setExpLoading(false);
    }
  }

  async function handleAddAdvance(e: React.FormEvent) {
    e.preventDefault();
    if (!advEmployeeId || !advAmount || Number(advAmount) <= 0) return;
    setAdvLoading(true);
    try {
      const res = await fetch("/api/employee-advances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: advEmployeeId,
          amount: Number(advAmount),
          notes: advNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setAdvances((prev) => [data.advance, ...prev]);
      setAdvAmount("");
      setAdvNotes("");
      router.refresh();
    } catch {
    } finally {
      setAdvLoading(false);
    }
  }

  async function handleClose() {
    setCloseLoading(true);
    setCloseError("");
    setCloseResult(null);
    try {
      const res = await fetch("/api/daily-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          posnetTotal: Number(posnetTotal || 0),
          actualCash: Number(actualCash || 0),
          scaleReadings: scaleReadings.map((s) => ({
            label: s.label,
            kgStart: Number(s.kgStart || 0),
            kgEnd: Number(s.kgEnd || 0),
          })),
          notes: closeNotes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCloseResult(data.summary);
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      setCloseError(message);
    } finally {
      setCloseLoading(false);
    }
  }

  function addScale() {
    setScaleReadings((prev) => [
      ...prev,
      { label: `Balanza ${prev.length + 1}`, kgStart: "", kgEnd: "" },
    ]);
  }

  function updateScale(
    idx: number,
    field: "label" | "kgStart" | "kgEnd",
    value: string
  ) {
    setScaleReadings((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s))
    );
  }

  async function handleAddEmployee(e: React.FormEvent) {
    e.preventDefault();
    if (!empName.trim()) return;
    setEmpLoading(true);
    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: empName.trim(),
          role: empRole.trim() || null,
          phone: empPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployeeList((prev) => [...prev, data.employee].sort((a, b) => a.name.localeCompare(b.name)));
      setEmpName("");
      setEmpRole("");
      setEmpPhone("");
      setShowEmpForm(false);
      router.refresh();
    } catch {
    } finally {
      setEmpLoading(false);
    }
  }

  async function handleDeleteEmployee(id: string, name: string) {
    if (!confirm(`¿Desactivar a "${name}"? No aparecerá más en la lista pero se conserva su historial de adelantos.`)) return;
    setEmpDeleting(id);
    try {
      const res = await fetch(`/api/employees?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEmployeeList((prev) => prev.filter((emp) => emp.id !== id));
      if (advEmployeeId === id) setAdvEmployeeId("");
      router.refresh();
    } catch {
    } finally {
      setEmpDeleting(null);
    }
  }

  const diffValue = Number(actualCash || 0) - expectedCash;

  return (
    <div className="space-y-6">
      {/* SECCIÓN 1: Resumen Ventas */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">📊 Resumen de Ventas</h2>
          <span className="text-sm text-gray-500">
            {salesCount} transacción{salesCount !== 1 ? "es" : ""}
          </span>
        </div>
        <div className="p-6">
          {/* Totales */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">Total Ventas</p>
              <p className="text-xl font-bold text-green-700">
                {formatMoney(totalSales)}
              </p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">💵 Efectivo</p>
              <p className="text-lg font-semibold text-green-700">
                {formatMoney(cashFromSales)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">💳 Tarjeta</p>
              <p className="text-lg font-semibold text-blue-700">
                {formatMoney(cardFromSales)}
              </p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">🏦 Transferencia</p>
              <p className="text-lg font-semibold text-purple-700">
                {formatMoney(transferFromSales)}
              </p>
            </div>
            <div className="bg-cyan-50 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 mb-1">📱 MercadoPago</p>
              <p className="text-lg font-semibold text-cyan-700">
                {formatMoney(mpFromSales)}
              </p>
            </div>
          </div>

          {/* Tabla ventas del día */}
          {sales.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-brand-600 hover:text-brand-700 font-medium">
                Ver detalle de ventas ▸
              </summary>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3">#</th>
                      <th className="text-left p-3">Cliente</th>
                      <th className="text-right p-3">Total</th>
                      <th className="text-left p-3">Pago</th>
                      <th className="text-left p-3">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((sale) => (
                      <tr key={sale.id} className="border-b">
                        <td className="p-3 font-mono text-xs">
                          {sale.saleNumber}
                        </td>
                        <td className="p-3">
                          {sale.customer?.name || "Mostrador"}
                        </td>
                        <td className="p-3 text-right font-mono">
                          {formatMoney(sale.total)}
                        </td>
                        <td className="p-3 text-xs">
                          {sale.payments
                            .map((p) => p.paymentMethod.name)
                            .join(", ")}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs ${
                              sale.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {sale.status === "completed"
                              ? "Pagado"
                              : "Cta. Cte."}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
          {sales.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">
              No hay ventas registradas hoy
            </p>
          )}
        </div>
      </div>

      {/* SECCIÓN 2: Gastos del Día */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">💸 Gastos del Día</h2>
          <span className="text-sm font-semibold text-red-600">
            Total: {formatMoney(totalExpenses)}
          </span>
        </div>
        <div className="p-6">
          <form
            onSubmit={handleAddExpense}
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <div className="w-40">
              <label className="block text-xs text-gray-500 mb-1">
                Categoría
              </label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1">
                Monto ($)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                placeholder="5000"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">
                Descripción
              </label>
              <input
                type="text"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="Detalle del gasto"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={expLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              {expLoading ? "..." : "Registrar Gasto"}
            </button>
          </form>

          {expenses.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Categoría</th>
                    <th className="text-left p-3">Descripción</th>
                    <th className="text-right p-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} className="border-b">
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-gray-600">{exp.description}</td>
                      <td className="p-3 text-right font-mono text-red-600">
                        {formatMoney(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECCIÓN 3: Empleados + Adelantos */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">👷 Adelantos a Empleados</h2>
          <span className="text-sm font-semibold text-orange-600">
            Total: {formatMoney(totalAdvances)}
          </span>
        </div>
        <div className="p-6">
          {/* Gestión de empleados */}
          <details className="group mb-4">
            <summary className="cursor-pointer text-sm text-brand-600 hover:text-brand-700 font-medium">
              ⚙️ Gestionar empleados ({employeeList.length}) ▸
            </summary>
            <div className="mt-3 border rounded-lg p-4 bg-gray-50 space-y-3">
              {/* Lista de empleados con botón eliminar */}
              {employeeList.length > 0 ? (
                <div className="space-y-2">
                  {employeeList.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border">
                      <div>
                        <span className="font-medium text-sm">{emp.name}</span>
                        {emp.role && (
                          <span className="text-xs text-gray-500 ml-2">({emp.role})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteEmployee(emp.id, emp.name)}
                        disabled={empDeleting === emp.id}
                        className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                      >
                        {empDeleting === emp.id ? "..." : "✕ Quitar"}
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No hay empleados activos</p>
              )}

              {/* Botón / Form agregar */}
              {!showEmpForm ? (
                <button
                  type="button"
                  onClick={() => setShowEmpForm(true)}
                  className="text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  + Agregar empleado
                </button>
              ) : (
                <form onSubmit={handleAddEmployee} className="flex flex-wrap items-end gap-2 border-t pt-3">
                  <div className="w-40">
                    <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                    <input
                      type="text"
                      required
                      value={empName}
                      onChange={(e) => setEmpName(e.target.value)}
                      placeholder="Juan Pérez"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-xs text-gray-500 mb-1">Rol</label>
                    <input
                      type="text"
                      value={empRole}
                      onChange={(e) => setEmpRole(e.target.value)}
                      placeholder="Carnicero"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                    <input
                      type="text"
                      value={empPhone}
                      onChange={(e) => setEmpPhone(e.target.value)}
                      placeholder="11-2345-6789"
                      className="w-full border rounded-lg px-3 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={empLoading}
                    className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
                  >
                    {empLoading ? "..." : "Agregar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEmpForm(false); setEmpName(""); setEmpRole(""); setEmpPhone(""); }}
                    className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>
          </details>

          <form
            onSubmit={handleAddAdvance}
            className="flex flex-wrap items-end gap-3 mb-4"
          >
            <div className="w-48">
              <label className="block text-xs text-gray-500 mb-1">
                Empleado
              </label>
              <select
                value={advEmployeeId}
                onChange={(e) => setAdvEmployeeId(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Seleccionar...</option>
                {employeeList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="w-32">
              <label className="block text-xs text-gray-500 mb-1">
                Monto ($)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={advAmount}
                onChange={(e) => setAdvAmount(e.target.value)}
                placeholder="10000"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={advNotes}
                onChange={(e) => setAdvNotes(e.target.value)}
                placeholder="Motivo del adelanto"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={advLoading}
              className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
            >
              {advLoading ? "..." : "Registrar Adelanto"}
            </button>
          </form>

          {advances.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-3">Empleado</th>
                    <th className="text-left p-3">Notas</th>
                    <th className="text-right p-3">Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {advances.map((adv) => (
                    <tr key={adv.id} className="border-b">
                      <td className="p-3 font-medium">{adv.employee.name}</td>
                      <td className="p-3 text-gray-500 text-xs">
                        {adv.notes || "—"}
                      </td>
                      <td className="p-3 text-right font-mono text-orange-600">
                        {formatMoney(adv.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {advances.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-2">
              Sin adelantos hoy
            </p>
          )}
        </div>
      </div>

      {/* SECCIÓN 4: Cierre de Balanzas */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold text-lg">⚖️ Cierre de Balanzas</h2>
          <button
            type="button"
            onClick={addScale}
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            + Agregar Balanza
          </button>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            {scaleReadings.map((scale, idx) => (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-3 bg-gray-50 rounded-lg p-3"
              >
                <input
                  type="text"
                  value={scale.label}
                  onChange={(e) => updateScale(idx, "label", e.target.value)}
                  className="w-36 border rounded px-2 py-1 text-sm"
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Inicio (kg):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={scale.kgStart}
                    onChange={(e) =>
                      updateScale(idx, "kgStart", e.target.value)
                    }
                    className="w-28 border rounded px-2 py-1 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">Fin (kg):</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={scale.kgEnd}
                    onChange={(e) => updateScale(idx, "kgEnd", e.target.value)}
                    className="w-28 border rounded px-2 py-1 text-sm"
                    placeholder="0.00"
                  />
                </div>
                <span className="text-sm font-mono text-gray-600">
                  ={" "}
                  {(
                    Number(scale.kgEnd || 0) - Number(scale.kgStart || 0)
                  ).toFixed(2)}{" "}
                  kg
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-right text-sm text-gray-500">
            Total balanzas:{" "}
            <span className="font-semibold text-gray-700">
              {scaleReadings
                .reduce(
                  (s, sc) =>
                    s + (Number(sc.kgEnd || 0) - Number(sc.kgStart || 0)),
                  0
                )
                .toFixed(2)}{" "}
              kg
            </span>
          </div>
        </div>
      </div>

      {/* SECCIÓN 4b: Stock General — Descuento del día */}
      {generalStock && generalStock.activeTropas.length > 0 && (() => {
        const totalKgBalanzas = scaleReadings.reduce(
          (s, sc) => s + (Number(sc.kgEnd || 0) - Number(sc.kgStart || 0)),
          0
        );
        // Preview FIFO
        const preview: { description: string; kg: number }[] = [];
        let remaining = totalKgBalanzas;
        for (const tropa of generalStock.activeTropas) {
          if (remaining <= 0) break;
          const toDeduct = Math.min(remaining, tropa.remainingKg);
          if (toDeduct > 0) {
            preview.push({ description: tropa.description, kg: Math.round(toDeduct * 100) / 100 });
            remaining -= toDeduct;
          }
        }
        const unaccounted = Math.round(Math.max(0, remaining) * 100) / 100;

        return (
          <div className="bg-white rounded-xl shadow-sm border">
            <div className="p-6 border-b">
              <h2 className="font-semibold text-lg">🐄 Stock General — Descuento del día</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Stock disponible:</span>
                <span className="font-semibold">{generalStock.totalRemainingKg.toFixed(1)} kg</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Kg de balanzas a descontar:</span>
                <span className="font-semibold">{totalKgBalanzas.toFixed(2)} kg</span>
              </div>

              {totalKgBalanzas > 0 && preview.length > 0 && (
                <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm font-medium text-yellow-800 mb-2">
                    Preview descuento FIFO:
                  </p>
                  {preview.map((p, i) => (
                    <div key={i} className="flex justify-between text-sm text-yellow-700">
                      <span>{p.description}</span>
                      <span>−{p.kg.toFixed(2)} kg</span>
                    </div>
                  ))}
                  {unaccounted > 0 && (
                    <div className="flex justify-between text-sm text-red-600 mt-1 font-medium">
                      <span>⚠️ Sin stock para cubrir</span>
                      <span>{unaccounted.toFixed(2)} kg</span>
                    </div>
                  )}
                </div>
              )}

              {totalKgBalanzas === 0 && (
                <p className="text-sm text-gray-400">
                  Cargue lecturas de balanza para ver el preview de descuento
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* SECCIÓN 5: Cierre de Caja */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">🔒 Cierre de Caja</h2>
          {existingClose && (
            <p className="text-xs text-amber-600 mt-1">
              ⚠️ Ya existe un cierre para hoy — guardar lo va a actualizar
            </p>
          )}
        </div>
        <div className="p-6 space-y-6">
          {/* Resumen calculado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">Efectivo ventas</p>
              <p className="text-lg font-bold text-green-700">
                {formatMoney(cashFromSales)}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">− Gastos</p>
              <p className="text-lg font-bold text-red-600">
                {formatMoney(totalExpenses)}
              </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">− Adelantos</p>
              <p className="text-lg font-bold text-orange-600">
                {formatMoney(totalAdvances)}
              </p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-gray-500">= Efectivo esperado</p>
              <p className="text-lg font-bold text-blue-700">
                {formatMoney(expectedCash)}
              </p>
            </div>
          </div>

          {/* Inputs manuales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Posnet ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={posnetTotal}
                onChange={(e) => setPosnetTotal(e.target.value)}
                placeholder="Del terminal"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Efectivo real en caja ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={actualCash}
                onChange={(e) => setActualCash(e.target.value)}
                placeholder="Conteo de caja"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diferencia
              </label>
              <div
                className={`w-full border rounded-lg px-3 py-2 text-sm font-mono font-bold ${
                  !actualCash
                    ? "bg-gray-50 text-gray-400"
                    : Math.abs(diffValue) < 100
                      ? "bg-green-50 text-green-700 border-green-300"
                      : "bg-red-50 text-red-700 border-red-300"
                }`}
              >
                {actualCash
                  ? `${diffValue >= 0 ? "+" : ""}${formatMoney(diffValue)}`
                  : "—"}
              </div>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas del cierre
            </label>
            <textarea
              value={closeNotes}
              onChange={(e) => setCloseNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones sobre la caja del día..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {closeError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {closeError}
            </div>
          )}

          {closeResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800 text-sm">
              <p className="font-semibold mb-2">
                ✅ Caja cerrada correctamente
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <p>
                  Ventas: {closeResult.salesCount} (
                  {formatMoney(closeResult.totalSales)})
                </p>
                <p>Gastos: {formatMoney(closeResult.totalExpenses)}</p>
                <p>Adelantos: {formatMoney(closeResult.totalAdvances)}</p>
                <p>
                  Diferencia:{" "}
                  <span
                    className={
                      Math.abs(closeResult.difference) < 100
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    {formatMoney(closeResult.difference)}
                  </span>
                </p>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleClose}
              disabled={closeLoading}
              className="px-6 py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50"
            >
              {closeLoading
                ? "Procesando..."
                : existingClose
                  ? "🔄 Actualizar Cierre"
                  : "🔒 Cerrar Caja del Día"}
            </button>
            <Link
              href="/caja/historial"
              className="px-6 py-3 border border-gray-300 text-gray-600 rounded-lg font-medium hover:bg-gray-50"
            >
              📋 Ver Historial
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
