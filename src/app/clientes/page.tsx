import { prisma } from "@/lib/prisma";
import { ClientesList } from "./ClientesList";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const [customers, priceLists] = await Promise.all([
    prisma.customer.findMany({
      include: {
        _count: { select: { sales: true, payments: true } },
      },
      orderBy: [{ isActive: "desc" }, { balance: "desc" }, { name: "asc" }],
    }),
    prisma.priceList.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized = customers.map((c) => ({
    ...c,
    balance: Number(c.balance),
    creditLimit: Number(c.creditLimit),
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">👥 Clientes</h1>
        <p className="text-gray-500 text-sm">
          Cuentas corrientes y gestión de cobros
        </p>
      </div>
      <ClientesList customers={serialized} priceLists={priceLists} />
    </div>
  );
}
