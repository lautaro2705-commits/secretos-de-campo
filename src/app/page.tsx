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
    customersWithDebt,
    lastClose,
    generalStockActive,
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
    prisma.customer.count({ where: { balance: { gt: 0 } } }),
    prisma.dailyCashClose.findFirst({ orderBy: { closeDate: "desc" } }),
    prisma.generalStock.findMany({ where: { status: "active" } }),
  ]);

  const totalKg = inventoryItems.reduce(
    (sum, i) => sum + Number(i.currentQty), 0
  );

  const salesTodayTotal = salesToday.reduce((s, sale) => s + Number(sale.total), 0);
  const expensesTodayTotal = Number(expensesToday._sum.amount || 0);

  return {
    inventoryItems,
    lowStock,
    totalSalesCount,
    pendingInvoices,
    totalKg,
    salesTodayTotal,
    salesTodayCount: salesToday.length,
    expensesTodayTotal,
    customersWithDebt,
    lastCloseDate: lastClose?.closeDate || null,
    generalStockKg: totalKg + generalStockActive.reduce(
      (s, t) => s + (Number(t.sellableKg) - Number(t.soldKg)),
      0
    ),
  };
}

export default async function Dashboard() {
  let stats;
  try {
    stats = await getStats();
  } catch {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">🥩 Secretos De Campo</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="font-semibold text-yellow-800">Base de datos no conectada</h2>
          <p className="text-yellow-700 text-sm mt-2">
            Configurá la variable <code className="bg-yellow-100 px-1 rounded">DATABASE_URL</code> y
            ejecutá <code className="bg-yellow-100 px-1 rounded">npx prisma db push && npm run db:seed</code>
          </p>
        </div>
      </div>
    );
  }

  function formatMoney(n: number) {
    return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  const cards = [
    { label: "Ventas Hoy", value: `${formatMoney(stats.salesTodayTotal)} (${stats.salesTodayCount})`, icon: "🛒", color: "bg-green-500" },
    { label: "Gastos Hoy", value: formatMoney(stats.expensesTodayTotal), icon: "💸", color: "bg-red-500" },
    { label: "Stock Total", value: `${stats.totalKg.toFixed(1)} kg`, icon: "📦", color: "bg-blue-500" },
    { label: "Stock General", value: `${stats.generalStockKg.toFixed(1)} kg`, icon: "🐄", color: "bg-emerald-500" },
    { label: "Alertas Stock Bajo", value: stats.lowStock, icon: "⚠️", color: "bg-amber-500" },
    { label: "Clientes con Saldo", value: stats.customersWithDebt, icon: "👥", color: "bg-orange-500" },
    {
      label: "Último Cierre",
      value: stats.lastCloseDate
        ? new Date(stats.lastCloseDate).toLocaleDateString("es-AR", { day: "numeric", month: "short" })
        : "Pendiente",
      icon: "🔒",
      color: stats.lastCloseDate ? "bg-brand-500" : "bg-gray-400",
    },
    { label: "Ventas Totales", value: stats.totalSalesCount, icon: "📊", color: "bg-purple-500" },
    { label: "Facturas Pend.", value: stats.pendingInvoices, icon: "📋", color: "bg-pink-500" },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-gray-500 text-sm">Resumen general de la carnicería</p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{card.label}</span>
              <span className={`${card.color} text-white w-8 h-8 rounded-lg flex items-center justify-center text-sm`}>
                {card.icon}
              </span>
            </div>
            <p className="text-2xl font-bold">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Stock table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="font-semibold">Stock Actual por Corte</h2>
          <Link
            href="/inventario"
            className="text-sm text-brand-600 hover:text-brand-700"
          >
            Ver detalle →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Corte</th>
                <th className="text-left p-4">Categoría</th>
                <th className="text-right p-4">Stock (kg)</th>
                <th className="text-right p-4">Alerta</th>
                <th className="text-center p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {stats.inventoryItems.map((item) => {
                const qty = Number(item.currentQty);
                const alert = Number(item.minStockAlert);
                const isLow = alert > 0 && qty <= alert;
                return (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{item.cut.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        item.cut.cutCategory === "premium" ? "bg-purple-100 text-purple-700" :
                        item.cut.cutCategory === "parrilla" ? "bg-orange-100 text-orange-700" :
                        item.cut.cutCategory === "guiso" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {item.cut.cutCategory}
                      </span>
                    </td>
                    <td className="p-4 text-right font-mono">{qty.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono text-gray-400">{alert.toFixed(2)}</td>
                    <td className="p-4 text-center">
                      {isLow ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">⚠️ Bajo</span>
                      ) : qty === 0 ? (
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-500">Sin stock</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">OK</span>
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
