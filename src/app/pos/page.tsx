import { prisma } from "@/lib/prisma";
import { POSClient } from "./POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const [priceLists, paymentMethods, customers, inventory] = await Promise.all([
    prisma.priceList.findMany({
      where: { isActive: true },
      include: {
        prices: { include: { cut: true }, orderBy: { cut: { displayOrder: "asc" } } },
      },
    }),
    prisma.paymentMethod.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, balance: true, priceListId: true },
    }),
    prisma.inventory.findMany({ include: { cut: true } }),
  ]);

  // Build cuts map: priceListId -> CutInfo[]
  const cutsMap: Record<string, { id: string; name: string; category: string; pricePerKg: number; stock: number }[]> = {};
  for (const pl of priceLists) {
    cutsMap[pl.id] = pl.prices
      .map((p) => {
        const inv = inventory.find((i) => i.cutId === p.cutId);
        return {
          id: p.cutId,
          name: p.cut.name,
          category: p.cut.cutCategory ?? "",
          isSellable: p.cut.isSellable,
          pricePerKg: Number(p.sellPricePerKg),
          stock: inv ? Number(inv.currentQty) : 0,
        };
      })
      .filter((c) => c.isSellable);
  }

  // Determine default price list (first active one)
  const defaultPriceListId = priceLists[0]?.id ?? "";

  return (
    <POSClient
      defaultPriceListId={defaultPriceListId}
      cutsMap={cutsMap}
      priceLists={priceLists.map((pl) => ({ id: pl.id, name: pl.name }))}
      paymentMethods={paymentMethods.map((m) => ({
        id: m.id,
        name: m.name,
        surcharge: Number(m.surchargePercentage),
      }))}
      customers={customers.map((c) => ({
        id: c.id,
        name: c.name,
        balance: Number(c.balance),
        priceListId: c.priceListId,
      }))}
    />
  );
}
