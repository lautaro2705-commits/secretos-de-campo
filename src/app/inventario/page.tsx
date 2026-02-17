import { prisma } from "@/lib/prisma";
import { BatchEntryForm } from "./BatchEntryForm";
import { AdjustmentForm } from "./AdjustmentForm";
import { ProductEntryForm } from "./ProductEntryForm";

export const dynamic = "force-dynamic";

export default async function InventarioPage() {
  const [categories, ranges, inventory, batches, productTypes, productEntries, productInventory] =
    await Promise.all([
      prisma.animalCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.weightRange.findMany({ orderBy: { minWeight: "asc" } }),
      prisma.inventory.findMany({
        include: { cut: true },
        orderBy: { cut: { displayOrder: "asc" } },
      }),
      prisma.stockBatch.findMany({
        include: { category: true, range: true, supplier: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.productType.findMany({
        where: { isActive: true },
        include: {
          products: {
            where: { isActive: true },
            orderBy: { displayOrder: "asc" },
          },
        },
        orderBy: { name: "asc" },
      }),
      prisma.productStockEntry.findMany({
        include: { product: { include: { productType: true } }, supplier: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      }),
      prisma.productInventory.findMany({
        include: { product: { include: { productType: true } } },
        orderBy: { product: { displayOrder: "asc" } },
      }),
    ]);

  // Combinar inventarios para vista de stock
  const allInventory = [
    ...inventory.map((i) => ({
      name: i.cut.name,
      type: "🥩 Vacuno",
      qty: Number(i.currentQty),
      unit: "kg",
      alert: Number(i.minStockAlert),
    })),
    ...productInventory
      .filter((pi) => Number(pi.currentQty) > 0)
      .map((pi) => ({
        name: pi.product.name,
        type: `${pi.product.productType.icon || "📦"} ${pi.product.productType.name}`,
        qty: Number(pi.currentQty),
        unit: pi.product.unit,
        alert: Number(pi.minStockAlert),
      })),
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Inventario</h1>
        <p className="text-gray-500 text-sm">
          Ingreso de mercadería y control de stock
        </p>
      </div>

      {/* ========================================= */}
      {/* Ingreso de Media Res (Vacuno)            */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">🥩 Ingreso de Media Res</h2>
          <p className="text-gray-500 text-sm mt-1">
            Carne vacuna — el sistema proyecta cortes con la plantilla de rendimiento
          </p>
        </div>
        <div className="p-6">
          <BatchEntryForm
            categories={categories.map((c) => ({ id: c.id, name: c.name }))}
            ranges={ranges.map((r) => ({
              id: r.id,
              label: r.label,
              minWeight: Number(r.minWeight),
              maxWeight: Number(r.maxWeight),
            }))}
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* Ingreso de Productos (Cerdo, Pollo, etc.)*/}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📦 Ingreso de Productos</h2>
          <p className="text-gray-500 text-sm mt-1">
            Cerdo, pollo, brosas, congelados, fiambres, quesos y embutidos
          </p>
        </div>
        <div className="p-6">
          <ProductEntryForm
            productTypes={productTypes.map((pt) => ({
              id: pt.id,
              name: pt.name,
              icon: pt.icon,
              products: pt.products.map((p) => ({
                id: p.id,
                name: p.name,
                unit: p.unit,
              })),
            }))}
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* Stock Actual                             */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📊 Stock Actual</h2>
          <p className="text-gray-500 text-sm mt-1">
            Todos los productos con stock &gt; 0
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Producto</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-right p-4">Stock</th>
                <th className="text-right p-4">Alerta Mín.</th>
                <th className="text-center p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {allInventory.filter((i) => i.qty > 0).length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    Sin stock registrado
                  </td>
                </tr>
              ) : (
                allInventory
                  .filter((i) => i.qty > 0)
                  .map((item) => (
                    <tr key={item.name} className="border-b hover:bg-gray-50">
                      <td className="p-4 font-medium">{item.name}</td>
                      <td className="p-4 text-gray-500">{item.type}</td>
                      <td className="p-4 text-right font-mono">
                        {item.qty.toFixed(2)} {item.unit}
                      </td>
                      <td className="p-4 text-right font-mono text-gray-400">
                        {item.alert} {item.unit}
                      </td>
                      <td className="p-4 text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.qty <= item.alert
                              ? "bg-red-100 text-red-700"
                              : item.qty <= item.alert * 2
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.qty <= item.alert
                            ? "⚠️ Bajo"
                            : item.qty <= item.alert * 2
                              ? "Medio"
                              : "OK"}
                        </span>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* Ajuste Manual de Stock                   */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">🔧 Ajuste de Stock</h2>
          <p className="text-gray-500 text-sm mt-1">
            Corrección manual cuando la realidad difiere de la proyección
          </p>
        </div>
        <div className="p-6">
          <AdjustmentForm
            inventory={inventory.map((i) => ({
              cutId: i.cutId,
              cutName: i.cut.name,
              currentQty: Number(i.currentQty),
            }))}
          />
        </div>
      </div>

      {/* ========================================= */}
      {/* Últimos Ingresos de Media Res            */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📋 Últimos Ingresos — Media Res</h2>
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
                <th className="text-center p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Sin ingresos registrados
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      {new Date(batch.entryDate).toLocaleDateString("es-AR")}
                    </td>
                    <td className="p-4">{batch.category.name}</td>
                    <td className="p-4">{batch.range.label}</td>
                    <td className="p-4 text-right">{batch.unitCount}</td>
                    <td className="p-4 text-right font-mono">
                      {Number(batch.totalWeight).toFixed(1)} kg
                    </td>
                    <td className="p-4 text-right font-mono">
                      ${Number(batch.totalCost).toLocaleString("es-AR")}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          batch.status === "confirmed"
                            ? "bg-green-100 text-green-700"
                            : batch.status === "projected"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {batch.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================= */}
      {/* Últimos Ingresos de Productos             */}
      {/* ========================================= */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📋 Últimos Ingresos — Productos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Fecha</th>
                <th className="text-left p-4">Tipo</th>
                <th className="text-left p-4">Producto</th>
                <th className="text-right p-4">Cantidad</th>
                <th className="text-right p-4">Costo/Ud</th>
                <th className="text-right p-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {productEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    Sin ingresos registrados
                  </td>
                </tr>
              ) : (
                productEntries.map((entry) => (
                  <tr key={entry.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      {new Date(entry.entryDate).toLocaleDateString("es-AR")}
                    </td>
                    <td className="p-4">
                      {entry.product.productType.icon}{" "}
                      {entry.product.productType.name}
                    </td>
                    <td className="p-4 font-medium">{entry.product.name}</td>
                    <td className="p-4 text-right font-mono">
                      {Number(entry.quantity).toFixed(2)} {entry.product.unit}
                    </td>
                    <td className="p-4 text-right font-mono">
                      ${Number(entry.costPerUnit).toLocaleString("es-AR")}
                    </td>
                    <td className="p-4 text-right font-mono">
                      ${Number(entry.totalCost).toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
