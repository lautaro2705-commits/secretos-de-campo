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

function fmtDec(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export function VentasClient() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const buildQuery = useCallback((p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (statusFilter !== "all") params.set("status", statusFilter);
    return params.toString();
  }, [search, dateFrom, dateTo, statusFilter]);

  const fetchSales = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sales?${buildQuery(p)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSales(data.sales);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch {
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => { fetchSales(page); }, [page, fetchSales]);

  function applyFilters() {
    setPage(1);
    fetchSales(1);
  }

  function clearFilters() {
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setStatusFilter("all");
    setPage(1);
  }

  const hasActiveFilters = search || dateFrom || dateTo || statusFilter !== "all";

  async function handleCancel(saleId: string, saleNumber: number) {
    const reason = prompt(`Motivo de anulacion para Venta #${saleNumber}:`);
    if (reason === null) return;
    setCancelling(saleId);
    try {
      const res = await fetch("/api/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: saleId, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchSales(page);
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setCancelling(null);
    }
  }

  function printReceipt(sale: Sale) {
    const printWin = window.open("", "_blank", "width=400,height=600");
    if (!printWin) return;

    const doc = printWin.document;
    const style = doc.createElement("style");
    style.textContent = `
      body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}
      table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:2px 0}
      .r{text-align:right}.c{text-align:center}.b{font-weight:bold}
      .sep{border-top:1px dashed #ccc;margin:8px 0;padding-top:8px}
      .row{display:flex;justify-content:space-between}
      .total-row{display:flex;justify-content:space-between;font-size:16px;font-weight:bold;border-top:1px solid #000;margin-top:4px;padding-top:4px}
      @media print{body{margin:0;padding:5px}}
    `;
    doc.head.appendChild(style);
    doc.title = `Ticket #${sale.saleNumber}`;

    const body = doc.body;
    const el = (tag: string, cls?: string, text?: string) => {
      const e = doc.createElement(tag);
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    };

    // Header
    const header = el("div", "c");
    header.appendChild(el("strong", undefined, "Secretos De Campo"));
    header.appendChild(doc.createElement("br"));
    header.appendChild(el("small", undefined, "Comprobante de Venta"));
    body.appendChild(header);

    // Sale info
    const info = el("div", "sep row");
    const left = el("div");
    const saleNum = el("strong", undefined, `Venta #${sale.saleNumber}`);
    left.appendChild(saleNum);
    if (sale.customer) {
      left.appendChild(doc.createElement("br"));
      left.appendChild(doc.createTextNode(sale.customer.name));
    }
    info.appendChild(left);
    const right = el("div", "r");
    const dateSmall = el("small", undefined,
      `${new Date(sale.saleDate).toLocaleDateString("es-AR")} ${new Date(sale.saleDate).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
    );
    right.appendChild(dateSmall);
    info.appendChild(right);
    body.appendChild(info);

    // Items table
    const table = el("table", "sep");
    const thead = doc.createElement("thead");
    const headRow = doc.createElement("tr");
    for (const h of ["Prod.", "Cant.", "P/U", "Total"]) {
      const th = el("th", h !== "Prod." ? "r" : undefined, h);
      headRow.appendChild(th);
    }
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = doc.createElement("tbody");
    for (const item of sale.items) {
      const tr = doc.createElement("tr");
      tr.appendChild(el("td", undefined, item.cut.name));
      tr.appendChild(el("td", "r", `${item.quantityKg.toFixed(2)} kg`));
      tr.appendChild(el("td", "r", fmtDec(item.pricePerKg)));
      tr.appendChild(el("td", "r", fmtDec(item.quantityKg * item.pricePerKg)));
      tbody.appendChild(tr);
    }
    for (const p of sale.itemProducts) {
      const tr = doc.createElement("tr");
      tr.appendChild(el("td", undefined, p.product.name));
      tr.appendChild(el("td", "r", String(p.quantity)));
      tr.appendChild(el("td", "r", fmtDec(p.pricePerUnit)));
      tr.appendChild(el("td", "r", fmtDec(p.quantity * p.pricePerUnit)));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    body.appendChild(table);

    // Totals
    const totals = el("div", "sep");
    const subtotalRow = el("div", "row");
    subtotalRow.appendChild(el("span", undefined, "Subtotal"));
    subtotalRow.appendChild(el("span", undefined, fmtDec(sale.subtotal)));
    totals.appendChild(subtotalRow);
    if (sale.surchargeAmount > 0) {
      const surRow = el("div", "row");
      surRow.style.color = "#b45309";
      surRow.appendChild(el("span", undefined, "Recargo"));
      surRow.appendChild(el("span", undefined, fmtDec(sale.surchargeAmount)));
      totals.appendChild(surRow);
    }
    const totalRow = el("div", "total-row");
    totalRow.appendChild(el("span", undefined, "TOTAL"));
    totalRow.appendChild(el("span", undefined, fmtDec(sale.total)));
    totals.appendChild(totalRow);
    body.appendChild(totals);

    // Payment
    const payDiv = el("div", "sep");
    const payText = sale.payments.map((p) => `${p.paymentMethod.name} ${fmtDec(p.amount)}`).join(", ");
    payDiv.appendChild(el("small", undefined, `Pago: ${payText}`));
    body.appendChild(payDiv);

    // Footer
    const footer = el("div", "c");
    footer.style.cssText = "margin-top:12px;color:#999";
    footer.textContent = "Gracias por su compra!";
    body.appendChild(footer);

    printWin.print();
  }

  function exportCSV() {
    if (sales.length === 0) return;
    const header = ["#Venta", "Fecha", "Cliente", "Items", "Metodo Pago", "Subtotal", "Recargo", "Total", "Estado"];
    const rows = sales.map((s) => [
      s.saleNumber,
      new Date(s.saleDate).toLocaleString("es-AR"),
      s.customer?.name || "Mostrador",
      s.items.map((i) => `${i.cut.name} ${i.quantityKg}kg`).concat(s.itemProducts.map((p) => `${p.product.name} x${p.quantity}`)).join("; "),
      s.payments.map((p) => `${p.paymentMethod.name} ${fmtDec(p.amount)}`).join("; "),
      s.subtotal,
      s.surchargeAmount,
      s.total,
      s.status === "completed" ? "Pagada" : s.status === "cancelled" ? "Anulada" : "Cta.Cte.",
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ventas-${dateFrom || "todas"}-${dateTo || "hoy"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Calculate totals for filtered results on this page
  const filteredTotal = sales.reduce((s, sale) => sale.status !== "cancelled" ? s + sale.total : s, 0);

  return (
    <div className="space-y-4">
      {/* Search bar + filter toggle */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex gap-3 items-center">
          <div className="flex-1 relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              placeholder="Buscar por cliente o # de venta..."
              className="w-full border rounded-lg pl-9 pr-3 py-2 text-sm"
            />
            <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`px-3 py-2 border rounded-lg text-sm flex items-center gap-1.5 transition ${filtersOpen ? "bg-brand-50 border-brand-300 text-brand-700" : "hover:bg-gray-50"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {hasActiveFilters && <span className="w-2 h-2 bg-brand-500 rounded-full" />}
          </button>
          <button onClick={applyFilters} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700">
            Buscar
          </button>
        </div>

        {/* Expanded filters */}
        {filtersOpen && (
          <div className="mt-3 pt-3 border-t flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Estado</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm">
                <option value="all">Todos</option>
                <option value="completed">Pagadas</option>
                <option value="cuenta_corriente">Cta. Corriente</option>
                <option value="cancelled">Anuladas</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Summary + pagination */}
      <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">{total} ventas</span>
          {sales.length > 0 && (
            <span className="text-sm font-medium text-green-700">
              Total pagina: {formatMoney(filteredTotal)}
            </span>
          )}
          {sales.length > 0 && (
            <button onClick={exportCSV} className="text-xs text-gray-500 hover:text-brand-700 hover:bg-brand-50 px-2 py-1 rounded transition">
              CSV
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            &larr;
          </button>
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-3 py-1 border rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50"
          >
            &rarr;
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando...</div>
        ) : sales.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            {hasActiveFilters ? "No hay ventas con estos filtros" : "No hay ventas registradas"}
          </div>
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
                      <div className="flex gap-1 justify-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => printReceipt(sale)}
                          className="text-xs text-brand-600 hover:text-brand-800 hover:bg-brand-50 px-2 py-1 rounded"
                          title="Reimprimir ticket"
                        >
                          Ticket
                        </button>
                        {sale.status !== "cancelled" && (
                          <button
                            onClick={() => handleCancel(sale.id, sale.saleNumber)}
                            disabled={cancelling === sale.id}
                            className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          >
                            {cancelling === sale.id ? "..." : "Anular"}
                          </button>
                        )}
                      </div>
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
                                {item.cut.name} — {item.quantityKg.toFixed(2)} kg x ${item.pricePerKg.toLocaleString("es-AR")}/kg = {formatMoney(item.quantityKg * item.pricePerKg)}
                              </p>
                            ))}
                            {sale.itemProducts.map((item, i) => (
                              <p key={`p-${i}`} className="text-gray-600">
                                {item.product.name} — {item.quantity} x ${item.pricePerUnit.toLocaleString("es-AR")} = {formatMoney(item.quantity * item.pricePerUnit)}
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
