"use client";

import { useState, useEffect, useCallback } from "react";

interface SaleItem {
  cut: { name: string };
  quantityKg: number;
  pricePerKg: number;
}

interface SaleProduct {
  product: { name: string };
  quantity: number;
  pricePerUnit: number;
}

interface Sale {
  id: string;
  saleNumber: number;
  saleDate: string;
  subtotal: number;
  surchargeAmount: number;
  total: number;
  status: string;
  notes: string | null;
  customer: { name: string } | null;
  items: SaleItem[];
  itemProducts: SaleProduct[];
  payments: { amount: number; paymentMethod: { name: string } }[];
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function VentasClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchSales = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?page=${p}&limit=20`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSales(data.sales);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSales(page); }, [page, fetchSales]);

  async function handleCancel(saleId: string, saleNumber: number) {
    const reason = prompt(`Motivo de anulación para Venta #${saleNumber}:`);
    if (reason === null) return; // User pressed Cancel
    setCancelling(saleId);
    try {
      const res = await fetch("/api/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saleId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      // Refresh list
      fetchSales(page);
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
        <span className="text-sm text-gray-500">{total} ventas totales</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            ← Anterior
          </button>
          <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-gray-400">No hay ventas registradas</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left p-3">#</th>
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Cliente</th>
                <th className="text-left p-3">Items</th>
                <th className="text-left p-3">Pago</th>
                <th className="text-right p-3">Total</th>
                <th className="text-center p-3">Estado</th>
                <th className="text-center p-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <>
                  <tr
                    key={sale.id}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${sale.status === "cancelled" ? "opacity-50" : ""}`}
                    onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}
                  >
                    <td className="p-3 font-mono text-xs">{sale.saleNumber}</td>
                    <td className="p-3 text-xs">
                      {new Date(sale.saleDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      {" "}
                      <span className="text-gray-400">
                        {new Date(sale.saleDate).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="p-3">{sale.customer?.name || "Mostrador"}</td>
                    <td className="p-3 text-xs text-gray-500">
                      {sale.items.length + sale.itemProducts.length} item{sale.items.length + sale.itemProducts.length !== 1 ? "s" : ""}
                    </td>
                    <td className="p-3 text-xs">
                      {sale.payments.map((p) => p.paymentMethod.name).join(", ")}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold">{formatMoney(sale.total)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        sale.status === "completed" ? "bg-green-100 text-green-700" :
                        sale.status === "cancelled" ? "bg-red-100 text-red-700" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>
                        {sale.status === "completed" ? "Pagada" : sale.status === "cancelled" ? "Anulada" : "Cta.Cte."}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      {sale.status !== "cancelled" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancel(sale.id, sale.saleNumber);
                          }}
                          disabled={cancelling === sale.id}
                          className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                        >
                          {cancelling === sale.id ? "..." : "Anular"}
                        </button>
                      )}
                    </td>
                  </tr>
                  {/* Expanded detail */}
                  {expandedId === sale.id && (
                    <tr key={`${sale.id}-detail`}>
                      <td colSpan={8} className="bg-gray-50 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          <div>
                            <p className="font-semibold mb-2">Detalle de Items:</p>
                            {sale.items.map((item, i) => (
                              <p key={i} className="text-gray-600">
                                {item.cut.name} — {item.quantityKg.toFixed(2)} kg × ${item.pricePerKg.toLocaleString("es-AR")}/kg = {formatMoney(item.quantityKg * item.pricePerKg)}
                              </p>
                            ))}
                            {sale.itemProducts.map((item, i) => (
                              <p key={`p-${i}`} className="text-gray-600">
                                {item.product.name} — {item.quantity} × ${item.pricePerUnit.toLocaleString("es-AR")} = {formatMoney(item.quantity * item.pricePerUnit)}
                              </p>
                            ))}
                          </div>
                          <div>
                            <p className="font-semibold mb-2">Pagos:</p>
                            {sale.payments.map((p, i) => (
                              <p key={i} className="text-gray-600">{p.paymentMethod.name}: {formatMoney(p.amount)}</p>
                            ))}
                            {sale.surchargeAmount > 0 && (
                              <p className="text-amber-600 mt-1">Recargo: {formatMoney(sale.surchargeAmount)}</p>
                            )}
                            {sale.notes && <p className="mt-2 text-gray-400 italic">{sale.notes}</p>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-1">
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 rounded text-sm ${page === p ? "bg-brand-600 text-white" : "border hover:bg-gray-50 text-gray-600"}`}
              >
                {p}
              </button>
            );
          })}
          {totalPages > 10 && <span className="text-gray-400 px-2">...</span>}
        </div>
      )}
    </div>
  );
}
