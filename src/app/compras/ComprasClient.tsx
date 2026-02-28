"use client";

import { useState, useEffect } from "react";

interface PlanningData {
  totalStockKg: number;
  inventoryKg: number;
  totalAvailableKg: number;
  avgDailyKg: number;
  daysRemaining: number;
  totalDeductedKg: number;
  uniqueDays: number;
  weeklyTrend: { week: string; kg: number }[];
}

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function ComprasClient() {
  const [data, setData] = useState<PlanningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadTime, setLeadTime] = useState(3);
  const [costPerKg, setCostPerKg] = useState("2500");

  useEffect(() => {
    fetch("/api/purchase-planning")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-center text-gray-400 py-16">Cargando datos de planificación...</div>;
  }

  if (!data) {
    return <div className="text-center text-red-500 py-16">Error al cargar datos</div>;
  }

  const urgency: "critical" | "warning" | "ok" =
    data.daysRemaining <= leadTime ? "critical" :
    data.daysRemaining <= leadTime * 2 ? "warning" : "ok";

  const orderDate = new Date();
  orderDate.setDate(orderDate.getDate() + Math.max(0, Math.floor(data.daysRemaining - leadTime)));

  const suggestedKg = Math.round(data.avgDailyKg * 7); // A week's worth
  const estimatedCost = suggestedKg * Number(costPerKg || 0);

  const maxWeekly = Math.max(...data.weeklyTrend.map((w) => w.kg), 1);

  return (
    <div className="space-y-6">
      {/* Semáforo grande + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semáforo */}
        <div className={`rounded-xl p-8 text-center ${
          urgency === "critical" ? "bg-red-50 border-2 border-red-300" :
          urgency === "warning" ? "bg-yellow-50 border-2 border-yellow-300" :
          "bg-green-50 border-2 border-green-300"
        }`}>
          <div className="text-6xl mb-3">
            {urgency === "critical" ? "🔴" : urgency === "warning" ? "🟡" : "🟢"}
          </div>
          <p className={`text-2xl font-bold ${
            urgency === "critical" ? "text-red-700" :
            urgency === "warning" ? "text-yellow-700" :
            "text-green-700"
          }`}>
            {data.daysRemaining > 999 ? "Sin datos" : `${data.daysRemaining} días`}
          </p>
          <p className="text-sm text-gray-500 mt-1">de stock restante</p>
          {urgency === "critical" && (
            <p className="text-red-600 font-semibold mt-3 text-sm">
              Hacer pedido AHORA — stock para {data.daysRemaining.toFixed(0)} días
            </p>
          )}
          {urgency === "warning" && (
            <p className="text-yellow-700 font-medium mt-3 text-sm">
              Planificar pedido antes del {orderDate.toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
            </p>
          )}
          {urgency === "ok" && (
            <p className="text-green-600 text-sm mt-3">Stock suficiente por ahora</p>
          )}
        </div>

        {/* KPIs */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-xs text-gray-500 mb-1">Stock Total</p>
            <p className="text-2xl font-bold text-blue-700">{data.totalAvailableKg} kg</p>
            <p className="text-xs text-gray-400 mt-1">
              Tropas: {data.totalStockKg} + Inv: {data.inventoryKg}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-xs text-gray-500 mb-1">Consumo Diario</p>
            <p className="text-2xl font-bold text-orange-600">{data.avgDailyKg} kg/día</p>
            <p className="text-xs text-gray-400 mt-1">
              Promedio {data.uniqueDays} días
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-xs text-gray-500 mb-1">Consumo Mensual</p>
            <p className="text-2xl font-bold text-purple-700">{(data.avgDailyKg * 30).toFixed(0)} kg</p>
            <p className="text-xs text-gray-400 mt-1">Proyección 30 días</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <p className="text-xs text-gray-500 mb-1">Deducido (30d)</p>
            <p className="text-2xl font-bold text-gray-700">{data.totalDeductedKg} kg</p>
            <p className="text-xs text-gray-400 mt-1">Últimos 30 días</p>
          </div>
        </div>
      </div>

      {/* Tendencia semanal */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-4">📊 Consumo Semanal (últimas 4 semanas)</h3>
        <div className="space-y-3">
          {data.weeklyTrend.map((w) => (
            <div key={w.week} className="flex items-center gap-3">
              <span className="text-sm text-gray-500 w-16 shrink-0">{w.week}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-8 relative overflow-hidden">
                <div
                  className="bg-brand-500 h-full rounded-full transition-all"
                  style={{ width: `${(w.kg / maxWeekly) * 100}%` }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                  {w.kg} kg
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calculadora de pedido */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <h3 className="font-semibold mb-4">🧮 Calculadora de Pedido</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Lead time (días de entrega)</label>
            <input type="number" min="1" max="30" value={leadTime}
              onChange={(e) => setLeadTime(Number(e.target.value) || 3)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Costo estimado por kg ($)</label>
            <input type="number" min="0" step="100" value={costPerKg}
              onChange={(e) => setCostPerKg(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sugerido (1 semana)</label>
            <div className="border rounded-lg px-3 py-2 text-sm bg-blue-50 font-bold text-blue-800">
              {suggestedKg} kg — {formatMoney(estimatedCost)}
            </div>
          </div>
        </div>
        <div className={`rounded-lg p-4 text-sm ${
          urgency === "critical" ? "bg-red-50 text-red-700 border border-red-200" :
          urgency === "warning" ? "bg-yellow-50 text-yellow-700 border border-yellow-200" :
          "bg-green-50 text-green-700 border border-green-200"
        }`}>
          {urgency === "critical" ? (
            <p><strong>Pedido urgente:</strong> Con {data.daysRemaining.toFixed(0)} días de stock y {leadTime} días de entrega, necesitás hacer el pedido hoy. Sugerimos al menos {suggestedKg} kg.</p>
          ) : urgency === "warning" ? (
            <p><strong>Planificar pedido:</strong> Hacer pedido antes del {orderDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })} para no quedarte sin stock. Sugerimos {suggestedKg} kg.</p>
          ) : (
            <p><strong>Stock OK:</strong> Tenés stock para ~{data.daysRemaining.toFixed(0)} días. Próximo pedido estimado: {orderDate.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}.</p>
          )}
        </div>
      </div>
    </div>
  );
}
