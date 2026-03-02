import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    inventoryItems,
    lowStock,
    totalSalesCount,
    pendingInvoices,
    salesToday,
    expensesToday,
    advancesToday,
    customersWithDebt,
    todayClose,
    lastClose,
    generalStockActive,
    paymentBreakdown,
  ] = await Promise.all([
    prisma.inventory.findMany({
      include: { cut: true },
      orderBy: { cut: { displayOrder: "asc" } },
    }),
    prisma.inventory.count({
      where: {
        currentQty: { lte: prisma.inventory.fields.minStockAlert },
        minStockAlert: { gt: 0 },
      },
    }),
    prisma.sale.count({ where: { status: "completed" } }),
    prisma.supplierInvoice.count({ where: { status: { in: ["pending", "partial"] } } }),
    prisma.sale.findMany({
      where: { saleDate: { gte: today, lt: tomorrow }, status: { not: "cancelled" } },
      select: { total: true },
    }),
    prisma.expense.aggregate({
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    }),
    prisma.employeeAdvance.aggregate({
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    }),
    prisma.customer.count({ where: { balance: { gt: 0 } } }),
    prisma.dailyCashClose.findFirst({
      where: { closeDate: { gte: today, lt: tomorrow } },
    }),
    prisma.dailyCashClose.findFirst({ orderBy: { closeDate: "desc" } }),
    prisma.generalStock.findMany({
      where: { status: "active" },
      orderBy: { entryDate: "asc" },
    }),
    // Payment breakdown: today's sales with payment method info
    prisma.salePayment.findMany({
      where: {
        sale: { saleDate: { gte: today, lt: tomorrow }, status: { not: "cancelled" } },
      },
      include: { paymentMethod: true },
    }),
  ]);

  const totalKg = inventoryItems.reduce(
    (sum, i) => sum + Number(i.currentQty), 0
  );

  const salesTodayTotal = salesToday.reduce((s, sale) => s + Number(sale.total), 0);
  const expensesTodayTotal = Number(expensesToday._sum.amount || 0);
  const advancesTodayTotal = Number(advancesToday._sum.amount || 0);

  // Group payments by type
  const paymentsByType: Record<string, number> = {};
  for (const p of paymentBreakdown) {
    const type = p.paymentMethod.type || "cash";
    const label =
      type === "cash" ? "Efectivo" :
      type === "card" ? "Tarjeta" :
      type === "transfer" ? "Transferencia" :
      type === "digital" ? "Digital" : type;
    paymentsByType[label] = (paymentsByType[label] || 0) + Number(p.amount);
  }

  // General stock summary
  const generalStockSummary = generalStockActive.map((t) => ({
    id: t.id,
    description: t.batchDescription,
    entryDate: t.entryDate,
    availableKg: Math.round((Number(t.sellableKg) - Number(t.soldKg)) * 100) / 100,
    totalKg: Number(t.totalWeightKg),
  }));

  return {
    inventoryItems,
    lowStock,
    totalSalesCount,
    pendingInvoices,
    totalKg,
    salesTodayTotal,
    salesTodayCount: salesToday.length,
    expensesTodayTotal,
    advancesTodayTotal,
    customersWithDebt,
    todayClosed: !!todayClose,
    lastCloseDate: lastClose?.closeDate || null,
    generalStockKg: generalStockActive.reduce(
      (s, t) => s + (Number(t.sellableKg) - Number(t.soldKg)),
      0
    ),
    generalStockSummary,
    paymentsByType,
  };
}

export default async function Dashboard() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Secretos De Campo</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-semibold text-yellow-800">Base de datos no conectada</h2>
          <p className="text-yellow-700 text-sm mt-2">
            Configura la variable <code className="bg-yellow-100 px-1 rounded">DATABASE_URL</code> y
            ejecuta <code className="bg-yellow-100 px-1 rounded">npx prisma db push && npm run db:seed</code>
          </p>
        </div>
      </div>
    );
  }

  function formatMoney(n: number) {
    return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const profitEstimate = stats.salesTodayTotal - stats.expensesTodayTotal - stats.advancesTodayTotal;

  return (
    <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-gray-500 text-sm">
            {new Date().toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/pos" className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition">
            Ir al POS
          </Link>
          <Link href="/caja" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition">
            Cierre de Caja
          </Link>
        </div>
      </div>

      {/* Close pending alert */}
      {!stats.todayClosed && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-amber-600 text-lg">&#9888;</span>
            <div>
              <p className="font-medium text-amber-800 text-sm">Cierre de caja pendiente</p>
              <p className="text-amber-600 text-xs">
                {stats.lastCloseDate
                  ? `Ultimo cierre: ${new Date(stats.lastCloseDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}`
                  : "Nunca se realizo un cierre"}
              </p>
            </div>
          </div>
          <Link href="/caja" className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition">
            Cerrar caja
          </Link>
        </div>
      )}

      {/* Main KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500 mb-1">Ventas Hoy</p>
          <p className="text-2xl font-bold text-green-700">{formatMoney(stats.salesTodayTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.salesTodayCount} operaciones</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500 mb-1">Gastos + Adelantos</p>
          <p className="text-2xl font-bold text-red-600">{formatMoney(stats.expensesTodayTotal + stats.advancesTodayTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">
            Gastos {formatMoney(stats.expensesTodayTotal)} / Adel. {formatMoney(stats.advancesTodayTotal)}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500 mb-1">Resultado Estimado</p>
          <p className={`text-2xl font-bold ${profitEstimate >= 0 ? "text-emerald-700" : "text-red-700"}`}>
            {formatMoney(profitEstimate)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Ventas - gastos - adelantos</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-5">
          <p className="text-xs text-gray-500 mb-1">Stock Cortes</p>
          <p className="text-2xl font-bold text-blue-700">{stats.totalKg.toFixed(1)} kg</p>
          <p className="text-xs text-gray-400 mt-1">
            {stats.lowStock > 0 ? `${stats.lowStock} alertas` : "Todo OK"}
          </p>
        </div>
      </div>

      {/* Secondary metrics row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <span className="bg-purple-100 text-purple-600 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold">
            {stats.totalSalesCount}
          </span>
          <div>
            <p className="text-xs text-gray-500">Ventas Totales</p>
            <p className="text-sm font-semibold">historicas</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <span className="bg-orange-100 text-orange-600 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold">
            {stats.customersWithDebt}
          </span>
          <div>
            <p className="text-xs text-gray-500">Clientes</p>
            <p className="text-sm font-semibold">con saldo</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <span className="bg-pink-100 text-pink-600 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold">
            {stats.pendingInvoices}
          </span>
          <div>
            <p className="text-xs text-gray-500">Facturas</p>
            <p className="text-sm font-semibold">pendientes</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-3">
          <span className="bg-emerald-100 text-emerald-600 w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold">
            {stats.generalStockSummary.length}
          </span>
          <div>
            <p className="text-xs text-gray-500">Tropas Activas</p>
            <p className="text-sm font-semibold">{stats.generalStockKg.toFixed(0)} kg</p>
          </div>
        </div>
      </div>

      {/* Middle row: Payment breakdown + Active tropas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Payment breakdown */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b">
            <h2 className="font-semibold text-sm">Cobros del Dia por Metodo</h2>
          </div>
          <div className="p-5">
            {Object.keys(stats.paymentsByType).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin ventas hoy</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.paymentsByType)
                  .sort(([, a], [, b]) => b - a)
                  .map(([label, amount]) => {
                    const pct = stats.salesTodayTotal > 0 ? (amount / stats.salesTodayTotal) * 100 : 0;
                    const color =
                      label === "Efectivo" ? "bg-green-500" :
                      label === "Tarjeta" ? "bg-blue-500" :
                      label === "Transferencia" ? "bg-purple-500" :
                      "bg-teal-500";
                    return (
                      <div key={label}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{label}</span>
                          <span className="font-medium">{formatMoney(amount)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`${color} h-2 rounded-full transition-all`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        {/* Active tropas */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-5 border-b flex justify-between items-center">
            <h2 className="font-semibold text-sm">Tropas Activas (Stock General)</h2>
            <Link href="/stock-general" className="text-xs text-brand-600 hover:text-brand-700">
              Ver detalle
            </Link>
          </div>
          <div className="p-5">
            {stats.generalStockSummary.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-4">Sin tropas activas</p>
            ) : (
              <div className="space-y-3">
                {stats.generalStockSummary.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-gray-400">
                        Ingreso: {new Date(t.entryDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        {" - "}Total: {t.totalKg.toFixed(0)} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-700">{t.availableKg.toFixed(1)} kg</p>
                      <p className="text-xs text-gray-400">disponible</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-5 border-b flex justify-between items-center">
          <h2 className="font-semibold text-sm">Stock Actual por Corte</h2>
          <Link
            href="/inventario"
            className="text-xs text-brand-600 hover:text-brand-700"
          >
            Ver detalle
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3">Corte</th>
                <th className="text-left p-3">Categoria</th>
                <th className="text-right p-3">Stock (kg)</th>
                <th className="text-right p-3">Alerta</th>
                <th className="text-center p-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.inventoryItems.map((item) => {
                const qty = Number(item.currentQty);
                const alert = Number(item.minStockAlert);
                const isLow = alert > 0 && qty <= alert;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{item.cut.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        item.cut.cutCategory === "premium" ? "bg-purple-100 text-purple-700" :
                        item.cut.cutCategory === "parrilla" ? "bg-orange-100 text-orange-700" :
                        item.cut.cutCategory === "guiso" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {item.cut.cutCategory}
                      </span>
                    </td>
                    <td className={`p-3 text-right font-mono ${qty < 0 ? "text-red-600" : ""}`}>{qty.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-gray-400">{alert.toFixed(2)}</td>
                    <td className="p-3 text-center">
                      {isLow ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700">Bajo</span>
                      ) : qty <= 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">Sin stock</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
