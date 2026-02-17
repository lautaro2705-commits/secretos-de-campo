import { prisma } from "@/lib/prisma";
import { BulkPriceUpdate } from "./BulkPriceUpdate";

export const dynamic = "force-dynamic";

export default async function PreciosPage() {
  const priceList = await prisma.priceList.findFirst({
    where: { isActive: true },
    include: {
      prices: {
        include: { cut: true },
        orderBy: { cut: { displayOrder: "asc" } },
      },
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Precios</h1>
        <p className="text-gray-500 text-sm">
          Lista activa: {priceList?.name ?? "Sin lista"} — {priceList?.prices.length ?? 0} cortes
        </p>
      </div>

      {/* Actualización masiva */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📈 Actualización Masiva</h2>
          <p className="text-gray-500 text-sm mt-1">Aplicar aumento/descuento porcentual a todos los precios de venta</p>
        </div>
        <div className="p-6">
          <BulkPriceUpdate />
        </div>
      </div>

      {/* Tabla de precios */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">💰 Lista de Precios</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Corte</th>
                <th className="text-left p-4">Categoría</th>
                <th className="text-right p-4">Costo/kg</th>
                <th className="text-right p-4">Venta/kg</th>
                <th className="text-right p-4">Margen</th>
              </tr>
            </thead>
            <tbody>
              {priceList?.prices.map((price) => {
                const cost = Number(price.costPerKg);
                const sell = Number(price.sellPricePerKg);
                const margin = cost > 0 ? ((sell - cost) / cost * 100).toFixed(1) : "∞";
                return (
                  <tr key={price.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-medium">{price.cut.name}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        price.cut.cutCategory === "premium" ? "bg-purple-100 text-purple-700" :
                        price.cut.cutCategory === "parrilla" ? "bg-orange-100 text-orange-700" :
                        price.cut.cutCategory === "guiso" ? "bg-blue-100 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>{price.cut.cutCategory}</span>
                    </td>
                    <td className="p-4 text-right font-mono text-gray-500">${cost.toLocaleString("es-AR")}</td>
                    <td className="p-4 text-right font-mono font-semibold">${sell.toLocaleString("es-AR")}</td>
                    <td className="p-4 text-right">
                      <span className={`font-mono text-xs px-2 py-1 rounded ${
                        Number(margin) > 50 ? "bg-green-100 text-green-700" :
                        Number(margin) > 30 ? "bg-yellow-100 text-yellow-700" :
                        "bg-red-100 text-red-700"
                      }`}>{margin}%</span>
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
