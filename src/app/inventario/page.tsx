import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { BatchEntryForm } from "./BatchEntryForm";
import { AdjustmentForm } from "./AdjustmentForm";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const [categories, ranges, inventory, batches] = await Promise.all([
    prisma.animalCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.weightRange.findMany({ orderBy: { minWeight: "asc" } }),
    prisma.inventory.findMany({
      include: { cut: true },
      orderBy: { cut: { displayOrder: "asc" } },
    }),
    prisma.stockBatch.findMany({
      include: { category: true, range: true, supplier: true, projections: { include: { cut: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-gray-500 text-sm">Ingreso de mercadería y control de stock</p>
      </div>

      {/* Ingreso de Mercadería */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📥 Ingreso de Media Res</h2>
          <p className="text-gray-500 text-sm mt-1">El sistema proyecta automáticamente los cortes usando la plantilla</p>
        </div>
        <div className="p-6">
          <BatchEntryForm
            categories={categories.map(c => ({ id: c.id, name: c.name }))}
            ranges={ranges.map(r => ({ id: r.id, label: r.label, minWeight: Number(r.minWeight), maxWeight: Number(r.maxWeight) }))}
          />
        </div>
      </div>

      {/* Ajuste Manual */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">🔧 Ajuste de Stock</h2>
          <p className="text-gray-500 text-sm mt-1">Corrección manual cuando la realidad difiere de la proyección</p>
        </div>
        <div className="p-6">
          <AdjustmentForm
            inventory={inventory.map(i => ({
              cutId: i.cutId,
              cutName: i.cut.name,
              currentQty: Number(i.currentQty),
            }))}
          />
        </div>
      </div>

      {/* Últimos Ingresos */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📋 Últimos Ingresos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Fecha</th>
                <th className="text-left p-4">Categoría</th>
                <th className="text-left p-4">Rango</th>
                <th className="text-right p-4">Unidades</th>
                <th className="text-right p-4">Peso Total</th>
                <th className="text-right p-4">Costo Total</th>
                <th className="text-left p-4">Proveedor</th>
                <th className="text-center p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-gray-400">Sin ingresos registrados</td></tr>
              ) : batches.map((batch) => (
                <tr key={batch.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{new Date(batch.entryDate).toLocaleDateString("es-AR")}</td>
                  <td className="p-4">{batch.category.name}</td>
                  <td className="p-4">{batch.range.label}</td>
                  <td className="p-4 text-right">{batch.unitCount}</td>
                  <td className="p-4 text-right font-mono">{Number(batch.totalWeight).toFixed(1)} kg</td>
                  <td className="p-4 text-right font-mono">${Number(batch.totalCost).toLocaleString("es-AR")}</td>
                  <td className="p-4">{batch.supplier?.name ?? "-"}</td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      batch.status === "confirmed" ? "bg-green-100 text-green-700" :
                      batch.status === "projected" ? "bg-blue-100 text-blue-700" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {batch.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
