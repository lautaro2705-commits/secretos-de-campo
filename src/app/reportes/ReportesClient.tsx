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

type TabKey = "resumen" | "rentabilidad" | "stock" | "comparativa";

interface ProfitabilityData {
  tropas: {
    id: string; description: string; category: string; supplierName: string | null;
    entryDate: string; status: string; totalWeightKg: number; costPerKg: number | null;
    totalCost: number | null; soldKg: number; sellableKg: number;
    estimatedRevenue: number; margin: number | null; marginPct: number | null;
  }[];
  avgPricePerKg: number;
}

interface TimelineData {
  timeline: { date: string; deducted: number; entered: number }[];
}

interface ComparisonData {
  weekly: {
    current: { total: number; count: number }; previous: { total: number; count: number };
    totalDelta: number; countDelta: number; avgTicketCurrent: number; avgTicketPrevious: number;
  };
  monthly: {
    current: { total: number; count: number }; previous: { total: number; count: number };
    totalDelta: number; countDelta: number; avgTicketCurrent: number; avgTicketPrevious: number;
  };
}

export function ReportesClient() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

  const [activeTab, setActiveTab] = useState<TabKey>("resumen");
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [profitData, setProfitData] = useState<ProfitabilityData | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null);
  const [advLoading, setAdvLoading] = useState(false);

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

  async function fetchAdvanced(type: string) {
    setAdvLoading(true);
    try {
      const res = await fetch(`/api/reports/advanced?type=${type}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (type === "profitability") setProfitData(json);
      if (type === "stock-timeline") setTimelineData(json);
      if (type === "sales-comparison") setComparisonData(json);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setAdvLoading(false);
    }
  }

  function handleTabChange(tab: TabKey) {
    setActiveTab(tab);
    if (tab === "rentabilidad" && !profitData) fetchAdvanced("profitability");
    if (tab === "stock" && !timelineData) fetchAdvanced("stock-timeline");
    if (tab === "comparativa" && !comparisonData) fetchAdvanced("sales-comparison");
  }

  const maxDaily = data ? Math.max(...data.dailyData.map((d) => d.total), 1) : 1;
  const maxHourly = data ? Math.max(...data.hourlySales, 1) : 1;

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: "resumen", label: "Resumen", icon: "📊" },
    { key: "rentabilidad", label: "Rentabilidad", icon: "💰" },
    { key: "stock", label: "Stock", icon: "📦" },
    { key: "comparativa", label: "Comparativa", icon: "📈" },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-white shadow-sm text-brand-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Filtros (solo para Resumen) */}
      {activeTab === "resumen" && (
      <>
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
      </>
      )}

      {/* Tab: Rentabilidad */}
      {activeTab === "rentabilidad" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">💰 Rentabilidad por Tropa</h2>
            <button onClick={() => fetchAdvanced("profitability")} disabled={advLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {advLoading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          {profitData && (
            <>
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
                Precio promedio de venta: <strong>{formatMoney(profitData.avgPricePerKg)}/kg</strong> (basado en ventas recientes)
              </div>
              <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-3">Tropa</th>
                      <th className="text-right p-3">Peso</th>
                      <th className="text-right p-3">Costo/kg</th>
                      <th className="text-right p-3">Costo Total</th>
                      <th className="text-right p-3">Vendido</th>
                      <th className="text-right p-3">Ingreso Est.</th>
                      <th className="text-right p-3">Margen</th>
                      <th className="text-center p-3">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {profitData.tropas.map((t) => (
                      <tr key={t.id} className={`hover:bg-gray-50 ${t.status === "depleted" ? "text-gray-400" : ""}`}>
                        <td className="p-3">
                          <div className="font-medium">{t.description}</div>
                          <div className="text-xs text-gray-400">{t.entryDate} — {t.supplierName || t.category}</div>
                        </td>
                        <td className="p-3 text-right font-mono">{t.totalWeightKg.toFixed(0)} kg</td>
                        <td className="p-3 text-right font-mono">{t.costPerKg !== null ? formatMoney(t.costPerKg) : <span className="text-gray-300">—</span>}</td>
                        <td className="p-3 text-right font-mono">{t.totalCost !== null ? formatMoney(t.totalCost) : <span className="text-gray-300">—</span>}</td>
                        <td className="p-3 text-right font-mono">{t.soldKg.toFixed(1)} kg</td>
                        <td className="p-3 text-right font-mono text-green-700">{formatMoney(t.estimatedRevenue)}</td>
                        <td className="p-3 text-right font-mono font-semibold">
                          {t.margin !== null ? (
                            <span className={t.margin >= 0 ? "text-green-700" : "text-red-600"}>
                              {t.margin >= 0 ? "+" : ""}{formatMoney(t.margin)}
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="p-3 text-center">
                          {t.marginPct !== null ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                              t.marginPct > 30 ? "bg-green-100 text-green-800" :
                              t.marginPct > 15 ? "bg-yellow-100 text-yellow-800" :
                              "bg-red-100 text-red-800"
                            }`}>
                              {t.marginPct > 0 ? "+" : ""}{t.marginPct}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {profitData.tropas.filter((t) => t.costPerKg === null).length > 0 && (
                <p className="text-xs text-gray-400 text-center">
                  Las tropas sin costo/kg no muestran margen. Asigná el costo en Stock General.
                </p>
              )}
            </>
          )}
          {!profitData && !advLoading && (
            <div className="text-center text-gray-400 py-16">Cargando datos de rentabilidad...</div>
          )}
        </div>
      )}

      {/* Tab: Stock Timeline */}
      {activeTab === "stock" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">📦 Movimiento de Stock (30 días)</h2>
            <button onClick={() => fetchAdvanced("stock-timeline")} disabled={advLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {advLoading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          {timelineData && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex gap-4 mb-4 text-xs">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Ingresos</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-400 rounded" /> Consumo</span>
              </div>
              <div className="space-y-1">
                {(() => {
                  const maxVal = Math.max(...timelineData.timeline.map((d) => Math.max(d.entered, d.deducted)), 1);
                  return timelineData.timeline.map((d) => (
                    <div key={d.date} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400 w-16 shrink-0">
                        {new Date(d.date + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                      <div className="flex-1 flex gap-1">
                        {d.entered > 0 && (
                          <div className="bg-green-500 rounded h-4" style={{ width: `${(d.entered / maxVal) * 50}%` }}>
                            <span className="text-[9px] text-white px-1">{d.entered > 0 ? `+${d.entered}` : ""}</span>
                          </div>
                        )}
                        {d.deducted > 0 && (
                          <div className="bg-red-400 rounded h-4" style={{ width: `${(d.deducted / maxVal) * 50}%` }}>
                            <span className="text-[9px] text-white px-1">{d.deducted > 0 ? `-${d.deducted}` : ""}</span>
                          </div>
                        )}
                        {d.entered === 0 && d.deducted === 0 && (
                          <span className="text-[10px] text-gray-300">—</span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          )}
          {!timelineData && !advLoading && (
            <div className="text-center text-gray-400 py-16">Cargando timeline...</div>
          )}
        </div>
      )}

      {/* Tab: Comparativa */}
      {activeTab === "comparativa" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">📈 Comparativa de Ventas</h2>
            <button onClick={() => fetchAdvanced("sales-comparison")} disabled={advLoading}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50">
              {advLoading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          {comparisonData && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Weekly */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Esta semana vs Anterior</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ComparisonCard label="Ventas" current={formatMoney(comparisonData.weekly.current.total)} previous={formatMoney(comparisonData.weekly.previous.total)} delta={comparisonData.weekly.totalDelta} />
                  <ComparisonCard label="Transacciones" current={comparisonData.weekly.current.count.toString()} previous={comparisonData.weekly.previous.count.toString()} delta={comparisonData.weekly.countDelta} />
                  <ComparisonCard label="Ticket Prom." current={formatMoney(Math.round(comparisonData.weekly.avgTicketCurrent))} previous={formatMoney(Math.round(comparisonData.weekly.avgTicketPrevious))} delta={comparisonData.weekly.avgTicketPrevious > 0 ? ((comparisonData.weekly.avgTicketCurrent - comparisonData.weekly.avgTicketPrevious) / comparisonData.weekly.avgTicketPrevious) * 100 : 0} />
                </div>
              </div>
              {/* Monthly */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold mb-4">Este mes vs Anterior</h3>
                <div className="grid grid-cols-2 gap-4">
                  <ComparisonCard label="Ventas" current={formatMoney(comparisonData.monthly.current.total)} previous={formatMoney(comparisonData.monthly.previous.total)} delta={comparisonData.monthly.totalDelta} />
                  <ComparisonCard label="Transacciones" current={comparisonData.monthly.current.count.toString()} previous={comparisonData.monthly.previous.count.toString()} delta={comparisonData.monthly.countDelta} />
                  <ComparisonCard label="Ticket Prom." current={formatMoney(Math.round(comparisonData.monthly.avgTicketCurrent))} previous={formatMoney(Math.round(comparisonData.monthly.avgTicketPrevious))} delta={comparisonData.monthly.avgTicketPrevious > 0 ? ((comparisonData.monthly.avgTicketCurrent - comparisonData.monthly.avgTicketPrevious) / comparisonData.monthly.avgTicketPrevious) * 100 : 0} />
                </div>
              </div>
            </div>
          )}
          {!comparisonData && !advLoading && (
            <div className="text-center text-gray-400 py-16">Cargando comparativa...</div>
          )}
        </div>
      )}
    </div>
  );
}

function ComparisonCard({ label, current, previous, delta }: { label: string; current: string; previous: string; delta: number }) {
  const isPositive = delta > 0;
  return (
    <div className="bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-lg font-bold">{current}</p>
      <div className="flex items-center gap-1 mt-1">
        <span className={`text-xs font-semibold ${isPositive ? "text-green-600" : delta < 0 ? "text-red-600" : "text-gray-400"}`}>
          {isPositive ? "+" : ""}{delta.toFixed(1)}%
        </span>
        <span className="text-xs text-gray-400">vs {previous}</span>
      </div>
    </div>
  );
}
