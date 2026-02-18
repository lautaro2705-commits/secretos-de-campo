import { prisma } from "@/lib/prisma";
import { CajaClient } from "./CajaClient";

export const dynamic = "force-dynamic";

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

async function getCajaData() {
  const { start, end } = todayRange();

  const [sales, expenses, advances, employees, paymentMethods, existingClose, activeStocks] =
    await Promise.all([
      prisma.sale.findMany({
        where: {
          saleDate: { gte: start, lt: end },
          status: { not: "cancelled" },
        },
        include: {
          customer: true,
          items: { include: { cut: true } },
          payments: { include: { paymentMethod: true } },
        },
        orderBy: { saleDate: "desc" },
      }),
      prisma.expense.findMany({
        where: { date: { gte: start, lt: end } },
        include: { paymentMethod: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.employeeAdvance.findMany({
        where: { date: { gte: start, lt: end } },
        include: { employee: true, paymentMethod: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.paymentMethod.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.dailyCashClose.findFirst({
        where: { closeDate: start },
      }),
      prisma.generalStock.findMany({
        where: { status: "active" },
        orderBy: { entryDate: "asc" },
      }),
    ]);

  // Serializar Decimals
  const serialized = {
    sales: sales.map((s) => ({
      ...s,
      saleDate: s.saleDate.toISOString(),
      subtotal: Number(s.subtotal),
      surchargeAmount: Number(s.surchargeAmount),
      total: Number(s.total),
      items: s.items.map((i) => ({
        ...i,
        quantityKg: Number(i.quantityKg),
        pricePerKg: Number(i.pricePerKg),
      })),
      payments: s.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    })),
    expenses: expenses.map((e) => ({
      ...e,
      amount: Number(e.amount),
    })),
    advances: advances.map((a) => ({
      ...a,
      amount: Number(a.amount),
    })),
    employees,
    paymentMethods: paymentMethods.map((pm) => ({
      ...pm,
      surchargePercentage: Number(pm.surchargePercentage),
    })),
    existingClose: existingClose
      ? {
          ...existingClose,
          totalSales: Number(existingClose.totalSales),
          totalCash: Number(existingClose.totalCash),
          totalCard: Number(existingClose.totalCard),
          totalTransfer: Number(existingClose.totalTransfer),
          totalMp: Number(existingClose.totalMp),
          posnetTotal: Number(existingClose.posnetTotal),
          expectedCash: Number(existingClose.expectedCash),
          actualCash: Number(existingClose.actualCash),
          difference: Number(existingClose.difference),
          totalExpenses: Number(existingClose.totalExpenses),
          totalAdvances: Number(existingClose.totalAdvances),
        }
      : null,
    generalStock: {
      totalRemainingKg: activeStocks.reduce(
        (s, t) => s + (Number(t.sellableKg) - Number(t.soldKg)),
        0
      ),
      activeTropas: activeStocks.map((t) => ({
        id: t.id,
        description: t.batchDescription,
        remainingKg: Number(t.sellableKg) - Number(t.soldKg),
      })),
    },
  };

  // JSON round-trip to convert Date → string and Decimal → number for client
  return JSON.parse(JSON.stringify(serialized));
}

export default async function CajaPage() {
  const data = await getCajaData();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">💵 Caja del Día</h1>
        <p className="text-gray-500 text-sm">
          {new Date().toLocaleDateString("es-AR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>
      <CajaClient {...data} />
    </div>
  );
}
