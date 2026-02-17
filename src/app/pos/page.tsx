import { prisma } from "@/lib/prisma";
import { POSClient } from "./POSClient";

export const dynamic = "force-dynamic";

export default async function POSPage() {
  const [priceList, paymentMethods, customers, inventory] = await Promise.all([
    prisma.priceList.findFirst({
      where: { isActive: true },
      include: { prices: { include: { cut: true }, orderBy: { cut: { displayOrder: "asc" } } } },
    }),
    prisma.paymentMethod.findMany({ where: { isActive: true } }),
    prisma.customer.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.inventory.findMany({ include: { cut: true } }),
  ]);

  const cuts = priceList?.prices.map((p) => {
    const inv = inventory.find((i) => i.cutId === p.cutId);
    return {
      id: p.cutId,
      name: p.cut.name,
      category: p.cut.cutCategory ?? "",
      isSellable: p.cut.isSellable,
      pricePerKg: Number(p.sellPricePerKg),
      costPerKg: Number(p.costPerKg),
      stock: inv ? Number(inv.currentQty) : 0,
    };
  }).filter((c) => c.isSellable) ?? [];

  return (
    <POSClient
      cuts={cuts}
      paymentMethods={paymentMethods.map((m) => ({
        id: m.id,
        name: m.name,
        surcharge: Number(m.surchargePercentage),
      }))}
      customers={customers.map((c) => ({ id: c.id, name: c.name, balance: Number(c.balance) }))}
    />
  );
}
