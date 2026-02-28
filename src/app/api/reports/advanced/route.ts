import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  try {
    if (type === "profitability") {
      return await getProfitability();
    } else if (type === "stock-timeline") {
      return await getStockTimeline();
    } else if (type === "sales-comparison") {
      return await getSalesComparison();
    }
    return NextResponse.json({ error: "Tipo de reporte inválido" }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getProfitability() {
  const stocks = await prisma.generalStock.findMany({
    orderBy: { entryDate: "desc" },
    take: 50,
    include: {
      supplier: { select: { name: true } },
      deductions: {
        select: { deductedKg: true, createdAt: true },
      },
    },
  });

  // Get average sell price from recent sales
  const recentSales = await prisma.saleItem.findMany({
    where: { sale: { status: "completed" } },
    select: { quantityKg: true, pricePerKg: true },
    take: 500,
    orderBy: { sale: { saleDate: "desc" } },
  });

  const totalSoldKg = recentSales.reduce((s, i) => s + Number(i.quantityKg), 0);
  const totalRevenue = recentSales.reduce((s, i) => s + Number(i.quantityKg) * Number(i.pricePerKg), 0);
  const avgPricePerKg = totalSoldKg > 0 ? totalRevenue / totalSoldKg : 0;

  const tropas = stocks.map((s) => {
    const totalWeight = Number(s.totalWeightKg);
    const costPerKg = s.costPerKg ? Number(s.costPerKg) : null;
    const totalCost = costPerKg ? costPerKg * totalWeight : null;
    const soldKg = Number(s.soldKg);
    const estimatedRevenue = soldKg * avgPricePerKg;
    const margin = totalCost !== null ? estimatedRevenue - totalCost : null;
    const marginPct = totalCost !== null && totalCost > 0 ? (margin! / totalCost) * 100 : null;

    return {
      id: s.id,
      description: s.batchDescription,
      category: s.animalCategory,
      supplierName: s.supplier?.name || null,
      entryDate: s.entryDate.toISOString().split("T")[0],
      status: s.status,
      totalWeightKg: totalWeight,
      costPerKg,
      totalCost,
      soldKg,
      sellableKg: Number(s.sellableKg),
      estimatedRevenue: Math.round(estimatedRevenue),
      margin: margin !== null ? Math.round(margin) : null,
      marginPct: marginPct !== null ? Math.round(marginPct * 10) / 10 : null,
    };
  });

  return NextResponse.json({ tropas, avgPricePerKg: Math.round(avgPricePerKg) });
}

async function getStockTimeline() {
  // Get last 30 days of deductions
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const deductions = await prisma.generalStockDeduction.findMany({
    where: { createdAt: { gte: thirtyDaysAgo } },
    select: { deductedKg: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // Get entries in the same period
  const entries = await prisma.generalStock.findMany({
    where: { entryDate: { gte: thirtyDaysAgo } },
    select: { totalWeightKg: true, entryDate: true, sellableKg: true },
    orderBy: { entryDate: "asc" },
  });

  // Build daily timeline
  const dailyMap: Record<string, { deducted: number; entered: number }> = {};
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    const key = d.toISOString().split("T")[0];
    dailyMap[key] = { deducted: 0, entered: 0 };
  }

  for (const d of deductions) {
    const key = d.createdAt.toISOString().split("T")[0];
    if (dailyMap[key]) dailyMap[key].deducted += Number(d.deductedKg);
  }

  for (const e of entries) {
    const key = e.entryDate.toISOString().split("T")[0];
    if (dailyMap[key]) dailyMap[key].entered += Number(e.sellableKg);
  }

  const timeline = Object.entries(dailyMap).map(([date, data]) => ({
    date,
    deducted: Math.round(data.deducted * 10) / 10,
    entered: Math.round(data.entered * 10) / 10,
  }));

  return NextResponse.json({ timeline });
}

async function getSalesComparison() {
  const now = new Date();

  // This week (Mon-Sun)
  const dayOfWeek = now.getDay() || 7; // Convert Sunday=0 to 7
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(now.getDate() - dayOfWeek + 1);
  thisWeekStart.setHours(0, 0, 0, 0);

  const lastWeekStart = new Date(thisWeekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  // This month
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  const [thisWeekSales, lastWeekSales, thisMonthSales, lastMonthSales] = await Promise.all([
    prisma.sale.aggregate({
      where: { status: "completed", saleDate: { gte: thisWeekStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { status: "completed", saleDate: { gte: lastWeekStart, lt: thisWeekStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { status: "completed", saleDate: { gte: thisMonthStart } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.sale.aggregate({
      where: { status: "completed", saleDate: { gte: lastMonthStart, lte: lastMonthEnd } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const tw = { total: Number(thisWeekSales._sum.total || 0), count: thisWeekSales._count };
  const lw = { total: Number(lastWeekSales._sum.total || 0), count: lastWeekSales._count };
  const tm = { total: Number(thisMonthSales._sum.total || 0), count: thisMonthSales._count };
  const lm = { total: Number(lastMonthSales._sum.total || 0), count: lastMonthSales._count };

  return NextResponse.json({
    weekly: {
      current: tw,
      previous: lw,
      totalDelta: lw.total > 0 ? ((tw.total - lw.total) / lw.total) * 100 : 0,
      countDelta: lw.count > 0 ? ((tw.count - lw.count) / lw.count) * 100 : 0,
      avgTicketCurrent: tw.count > 0 ? tw.total / tw.count : 0,
      avgTicketPrevious: lw.count > 0 ? lw.total / lw.count : 0,
    },
    monthly: {
      current: tm,
      previous: lm,
      totalDelta: lm.total > 0 ? ((tm.total - lm.total) / lm.total) * 100 : 0,
      countDelta: lm.count > 0 ? ((tm.count - lm.count) / lm.count) * 100 : 0,
      avgTicketCurrent: tm.count > 0 ? tm.total / tm.count : 0,
      avgTicketPrevious: lm.count > 0 ? lm.total / lm.count : 0,
    },
  });
}
