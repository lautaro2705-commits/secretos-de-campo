"use client";

import { useState } from "react";

interface ReportData {
  totalSales: number;
  totalTransactions: number;
  avgTicket: number;
  totalExpenses: number;
  totalAdvances: number;
  netIncome: number;
  byPaymentMethod: Record<string, number>;
  topCuts: { name: string; kg: number; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
  dailyData: { date: string; total: number; count: number }[];
  hourlySales: number[];
  closesCount: number;
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getPresetDates(preset: string): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);

  switch (preset) {
    case "today": {
      return { from: to, to };
    }
    case "week": {
      const d = new Date(today);
      d.setDate(d.getDate() - 7);
      return { from: d.toISOString().slice(0, 10), to };
    }
    case "month": {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: d.toISOString().slice(0, 10), to };
    }
    case "last-month": {
      const first = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const last = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: first.toISOString().slice(0, 10), to: last.toISOString().slice(0, 10) };
    }
    default:
      return { from: to, to };
  }
}

const PAYMENT_COLORS: Record<string, string> = {
  "Efectivo": "bg-green-500",
  "Tarjeta Débito": "bg-blue-500",
  "Tarjeta Crédito": "bg-purple-500",
  "Transferencia": "bg-cyan-500",
  "MercadoPago": "bg-sky-500",
};

export function ReportesClient() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function fetchReport(fromDate?: string, toDate?: string) {
    const f = fromDate || from;
    const t = toDate || to;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/reports?from=${f}&to=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(preset: string) {
    const { from: f, to: t } = getPresetDates(preset);
    setFrom(f);
    setTo(t);
    fetchReport(f, t);
  }

  const maxDaily = data ? Math.max(...data.dailyData.map((d) => d.total), 1) : 1;
  const maxHourly = data ? Math.max(...data.hourlySales, 1) : 1;

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Desde</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Hasta</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button onClick={() => fetchReport()} disabled={loading} className="px-5 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? "Cargando..." : "Generar Reporte"}
          </button>
          <div className="flex gap-2 ml-auto">
            {[
              { key: "today", label: "Hoy" },
              { key: "week", label: "Última semana" },
              { key: "month", label: "Este mes" },
              { key: "last-month", label: "Mes anterior" },
            ].map((p) => (
              <button key={p.key} onClick={() => applyPreset(p.key)} className="px-3 py-2 border rounded-lg text-xs hover:bg-gray-50 text-gray-600">
                {p.label}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="mt-3 text-red-600 text-sm">{error}</p>}
      </div>

      {!data && !loading && (
        <div className="text-center text-gray-400 py-16">
          Seleccioná un rango de fechas y hacé clic en &quot;Generar Reporte&quot;
        </div>
      )}

      {data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Ventas Totales", value: formatMoney(data.totalSales), color: "text-green-700", bg: "bg-green-50" },
              { label: "Transacciones", value: data.totalTransactions.toString(), color: "text-blue-700", bg: "bg-blue-50" },
              { label: "Ticket Promedio", value: formatMoney(data.avgTicket), color: "text-purple-700", bg: "bg-purple-50" },
              { label: "Gastos", value: formatMoney(data.totalExpenses), color: "text-red-700", bg: "bg-red-50" },
              { label: "Adelantos", value: formatMoney(data.totalAdvances), color: "text-orange-700", bg: "bg-orange-50" },
              { label: "Ingreso Neto", value: formatMoney(data.netIncome), color: data.netIncome >= 0 ? "text-green-700" : "text-red-700", bg: data.netIncome >= 0 ? "bg-green-50" : "bg-red-50" },
            ].map((kpi) => (
              <div key={kpi.label} className={`${kpi.bg} rounded-xl p-4`}>
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Ventas por día */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">📊 Ventas por Día</h3>
              {data.dailyData.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-2">
                  {data.dailyData.map((d) => (
                    <div key={d.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20 shrink-0">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short", weekday: "short" })}
                      </span>
                      <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-brand-500 h-full rounded-full transition-all"
                          style={{ width: `${(d.total / maxDaily) * 100}%` }}
                        />
                        <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                          {formatMoney(d.total)} ({d.count})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Métodos de pago */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">💳 Por Método de Pago</h3>
              {Object.keys(data.byPaymentMethod).length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin datos</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(data.byPaymentMethod)
                    .sort(([, a], [, b]) => b - a)
                    .map(([name, amount]) => {
                      const pct = data.totalSales > 0 ? (amount / data.totalSales) * 100 : 0;
                      return (
                        <div key={name}>
                          <div className="flex justify-between text-sm mb-1">
                            <span>{name}</span>
                            <span className="font-mono font-medium">{formatMoney(amount)} <span className="text-gray-400">({pct.toFixed(1)}%)</span></span>
                          </div>
                          <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                            <div className={`${PAYMENT_COLORS[name] || "bg-gray-500"} h-full rounded-full`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Top cortes */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">🥩 Top Cortes Vendidos</h3>
              {data.topCuts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin ventas de cortes</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Corte</th>
                        <th className="text-right p-2">Kg</th>
                        <th className="text-right p-2">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topCuts.map((cut, i) => (
                        <tr key={cut.name} className="border-b">
                          <td className="p-2 text-gray-400">{i + 1}</td>
                          <td className="p-2 font-medium">{cut.name}</td>
                          <td className="p-2 text-right font-mono">{cut.kg.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono text-green-700">{formatMoney(Math.round(cut.revenue))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Top productos */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold mb-4">📦 Top Productos Vendidos</h3>
              {data.topProducts.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">Sin ventas de productos</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-2">#</th>
                        <th className="text-left p-2">Producto</th>
                        <th className="text-right p-2">Cant.</th>
                        <th className="text-right p-2">Ingresos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topProducts.map((prod, i) => (
                        <tr key={prod.name} className="border-b">
                          <td className="p-2 text-gray-400">{i + 1}</td>
                          <td className="p-2 font-medium">{prod.name}</td>
                          <td className="p-2 text-right font-mono">{prod.qty.toFixed(1)}</td>
                          <td className="p-2 text-right font-mono text-green-700">{formatMoney(Math.round(prod.revenue))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Ventas por hora */}
            <div className="bg-white rounded-xl shadow-sm border p-6 lg:col-span-2">
              <h3 className="font-semibold mb-4">🕐 Distribución por Hora</h3>
              <div className="flex items-end gap-1 h-40">
                {data.hourlySales.map((amount, hour) => (
                  <div key={hour} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end" style={{ height: "120px" }}>
                      <div
                        className={`w-full rounded-t ${amount > 0 ? "bg-brand-400" : "bg-gray-100"} transition-all`}
                        style={{ height: `${maxHourly > 0 ? (amount / maxHourly) * 100 : 0}%`, minHeight: amount > 0 ? "4px" : "2px" }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400">{hour}h</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
