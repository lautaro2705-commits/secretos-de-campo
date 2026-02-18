import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json({ error: "Parámetros 'from' y 'to' requeridos" }, { status: 400 });
    }

    const dateFrom = new Date(from);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(to);
    dateTo.setHours(23, 59, 59, 999);

    const [sales, expenses, advances, closes] = await Promise.all([
      prisma.sale.findMany({
        where: {
          saleDate: { gte: dateFrom, lte: dateTo },
          status: { not: "cancelled" },
        },
        include: {
          items: { include: { cut: true } },
          itemProducts: { include: { product: true } },
          payments: { include: { paymentMethod: true } },
          customer: { select: { name: true } },
        },
        orderBy: { saleDate: "asc" },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.employeeAdvance.aggregate({
        where: { date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.dailyCashClose.findMany({
        where: { closeDate: { gte: dateFrom, lte: dateTo } },
        orderBy: { closeDate: "asc" },
      }),
    ]);

    // --- Totales generales ---
    const totalSales = sales.reduce((s, sale) => s + Number(sale.total), 0);
    const totalTransactions = sales.length;
    const avgTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalExpenses = Number(expenses._sum.amount || 0);
    const totalAdvances = Number(advances._sum.amount || 0);
    const netIncome = totalSales - totalExpenses - totalAdvances;

    // --- Ventas por método de pago ---
    const byPaymentMethod: Record<string, number> = {};
    for (const sale of sales) {
      for (const p of sale.payments) {
        const name = p.paymentMethod.name;
        byPaymentMethod[name] = (byPaymentMethod[name] || 0) + Number(p.amount);
      }
    }

    // --- Cortes más vendidos ---
    const cutSales: Record<string, { name: string; kg: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.cutId;
        if (!cutSales[key]) {
          cutSales[key] = { name: item.cut.name, kg: 0, revenue: 0 };
        }
        cutSales[key].kg += Number(item.quantityKg);
        cutSales[key].revenue += Number(item.quantityKg) * Number(item.pricePerKg);
      }
    }
    const topCuts = Object.values(cutSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // --- Productos más vendidos ---
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.itemProducts) {
        const key = item.productId;
        if (!productSales[key]) {
          productSales[key] = { name: item.product.name, qty: 0, revenue: 0 };
        }
        productSales[key].qty += Number(item.quantity);
        productSales[key].revenue += Number(item.quantity) * Number(item.pricePerUnit);
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // --- Ventas por día ---
    const dailySales: Record<string, { date: string; total: number; count: number }> = {};
    for (const sale of sales) {
      const day = new Date(sale.saleDate).toISOString().slice(0, 10);
      if (!dailySales[day]) {
        dailySales[day] = { date: day, total: 0, count: 0 };
      }
      dailySales[day].total += Number(sale.total);
      dailySales[day].count += 1;
    }
    const dailyData = Object.values(dailySales).sort((a, b) => a.date.localeCompare(b.date));

    // --- Ventas por hora ---
    const hourlySales: number[] = new Array(24).fill(0);
    for (const sale of sales) {
      const hour = new Date(sale.saleDate).getHours();
      hourlySales[hour] += Number(sale.total);
    }

    return NextResponse.json({
      totalSales: Math.round(totalSales),
      totalTransactions,
      avgTicket: Math.round(avgTicket),
      totalExpenses: Math.round(totalExpenses),
      totalAdvances: Math.round(totalAdvances),
      netIncome: Math.round(netIncome),
      byPaymentMethod,
      topCuts,
      topProducts,
      dailyData,
      hourlySales,
      closesCount: closes.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/reports:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
