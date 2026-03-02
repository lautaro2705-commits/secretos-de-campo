import { prisma } from "@/lib/prisma";
import { POSClient } from "./POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const [priceLists, paymentMethods, customers, inventory, productTypes, productInventory] = await Promise.all([
    prisma.priceList.findMany({
      where: { isActive: true },
      include: {
        prices: { include: { cut: true }, orderBy: { cut: { displayOrder: "asc" } } },
        productPrices: { include: { product: { include: { productType: true } } }, orderBy: { product: { displayOrder: "asc" } } },
      },
    }),
    prisma.paymentMethod.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, balance: true, priceListId: true },
    }),
    prisma.inventory.findMany({ include: { cut: true } }),
    prisma.productType.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.productInventory.findMany(),
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

  // Build products map: priceListId -> ProductInfo[]
  const productsMap: Record<string, { id: string; name: string; typeName: string; typeIcon: string; unit: string; pricePerUnit: number; stock: number }[]> = {};
  for (const pl of priceLists) {
    productsMap[pl.id] = (pl.productPrices || [])
      .filter((pp) => pp.product.isActive && pp.product.isSellable)
      .map((pp) => {
        const inv = productInventory.find((pi) => pi.productId === pp.productId);
        return {
          id: pp.productId,
          name: pp.product.name,
          typeName: pp.product.productType.name,
          typeIcon: pp.product.productType.icon || "",
          unit: pp.product.unit,
          pricePerUnit: Number(pp.sellPricePerUnit),
          stock: inv ? Number(inv.currentQty) : 0,
        };
      });
  }

  // Determine default price list (first active one)
  const defaultPriceListId = priceLists[0]?.id ?? "";

  return (
    <POSClient
      defaultPriceListId={defaultPriceListId}
      cutsMap={cutsMap}
      productsMap={productsMap}
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
