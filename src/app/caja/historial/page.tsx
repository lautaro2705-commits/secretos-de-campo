import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function HistorialCajaPage() {
  const closes = await prisma.dailyCashClose.findMany({
    orderBy: { closeDate: "desc" },
    take: 60,
  });

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">📋 Historial de Cierres</h1>
          <p className="text-gray-500 text-sm">
            Últimos {closes.length} cierres de caja
          </p>
        </div>
        <Link
          href="/caja"
          className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
        >
          ← Volver a Caja
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left p-4">Fecha</th>
              <th className="text-right p-4">Ventas</th>
              <th className="text-right p-4">Efectivo</th>
              <th className="text-right p-4">Tarjeta</th>
              <th className="text-right p-4">Gastos</th>
              <th className="text-right p-4">Adelantos</th>
              <th className="text-right p-4">Esperado</th>
              <th className="text-right p-4">Real</th>
              <th className="text-right p-4">Diferencia</th>
            </tr>
          </thead>
          <tbody>
            {closes.map((c) => {
              const diff = Number(c.difference);
              return (
                <tr key={c.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-medium">
                    {new Date(c.closeDate).toLocaleDateString("es-AR", {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                    })}
                  </td>
                  <td className="p-4 text-right font-mono">
                    {formatMoney(Number(c.totalSales))}
                  </td>
                  <td className="p-4 text-right font-mono text-green-700">
                    {formatMoney(Number(c.totalCash))}
                  </td>
                  <td className="p-4 text-right font-mono text-blue-700">
                    {formatMoney(Number(c.totalCard))}
                  </td>
                  <td className="p-4 text-right font-mono text-red-600">
                    {formatMoney(Number(c.totalExpenses))}
                  </td>
                  <td className="p-4 text-right font-mono text-orange-600">
                    {formatMoney(Number(c.totalAdvances))}
                  </td>
                  <td className="p-4 text-right font-mono">
                    {formatMoney(Number(c.expectedCash))}
                  </td>
                  <td className="p-4 text-right font-mono">
                    {formatMoney(Number(c.actualCash))}
                  </td>
                  <td className="p-4 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-xs font-mono ${
                        Math.abs(diff) < 100
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {diff >= 0 ? "+" : ""}
                      {formatMoney(diff)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {closes.length === 0 && (
          <div className="p-8 text-center text-gray-400 text-sm">
            No hay cierres registrados todavía
          </div>
        )}
      </div>
    </div>
  );
}
