import { prisma } from "@/lib/prisma";
import { StockGeneralClient } from "./StockGeneralClient";

export const dynamic = "force-dynamic";

async function getStockData() {
  const [stocks, categories, suppliers, inventoryItems] = await Promise.all([
    prisma.generalStock.findMany({
      orderBy: [{ status: "asc" }, { entryDate: "desc" }],
      include: { supplier: { select: { name: true } } },
    }),
    prisma.animalCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.inventory.findMany({
      select: { currentQty: true },
    }),
  ]);

  const inventoryKg = inventoryItems.reduce(
    (sum, i) => sum + Number(i.currentQty),
    0
  );

  return {
    stocks: stocks.map((s) => ({
      id: s.id,
      batchDescription: s.batchDescription,
      entryDate: s.entryDate.toISOString().split("T")[0],
      animalCategory: s.animalCategory,
      unitCount: s.unitCount,
      totalWeightKg: Number(s.totalWeightKg),
      bonePercent: Number(s.bonePercent),
      fatPercent: Number(s.fatPercent),
      mermaPercent: Number(s.mermaPercent),
      sellableKg: Number(s.sellableKg),
      soldKg: Number(s.soldKg),
      remainingKg: Number(s.sellableKg) - Number(s.soldKg),
      status: s.status,
      supplierName: s.supplier?.name || null,
      notes: s.notes,
    })),
    categories,
    suppliers,
    inventoryKg: Math.round(inventoryKg * 100) / 100,
  };
}

export default async function StockGeneralPage() {
  const data = await getStockData();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🐄 Stock General</h1>
        <p className="text-gray-500 text-sm">
          Control de kg por tropa con descuento diario FIFO
        </p>
      </div>
      <StockGeneralClient {...data} />
    </div>
  );
}
