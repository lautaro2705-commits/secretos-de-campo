import { prisma } from "@/lib/prisma";
import { RentabilidadCalculator } from "./RentabilidadCalculator";

export const dynamic = "force-dynamic";

export default async function RentabilidadPage() {
  const [priceList, cuts, realYields] = await Promise.all([
    prisma.priceList.findFirst({
      where: { isActive: true },
      include: {
        prices: { include: { cut: true } },
      },
    }),
    prisma.cut.findMany({
      where: { isActive: true, species: "vaca" },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    }),
    prisma.realYield.findMany({
      where: { category: { species: "vaca" } },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        category: { select: { name: true } },
        range: { select: { label: true } },
        items: { include: { cut: { select: { id: true, name: true } } } },
      },
    }),
  ]);

  const priceMap: Record<string, number> = {};
  for (const p of priceList?.prices ?? []) {
    priceMap[p.cutId] = Number(p.sellPricePerKg);
  }

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">💹 Rentabilidad por Media Res</h1>
        <p className="text-gray-500 text-sm">
          Integración de ganancia por kg: cruza el rinde del desposte con los precios de venta para
          obtener la ganancia total y la ganancia por kg de media res comprada.
        </p>
      </div>

      <RentabilidadCalculator
        priceListName={priceList?.name ?? null}
        cuts={cuts.map((c) => ({
          id: c.id,
          name: c.name,
          cutCategory: c.cutCategory ?? "",
          isSellable: c.isSellable,
          sellPricePerKg: priceMap[c.id] ?? 0,
        }))}
        realYields={realYields.map((y) => ({
          id: y.id,
          yieldNumber: y.yieldNumber,
          totalWeight: Number(y.totalWeight),
          createdAt: y.createdAt.toISOString(),
          categoryName: y.category.name,
          rangeLabel: y.range.label,
          items: y.items.map((i) => ({
            cutId: i.cutId,
            cutName: i.cut.name,
            actualKg: Number(i.actualKg),
          })),
        }))}
      />
    </div>
  );
}
