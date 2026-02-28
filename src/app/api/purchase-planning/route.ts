import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Get active stock
    const activeStock = await prisma.generalStock.findMany({
      where: { status: "active" },
      select: { sellableKg: true, soldKg: true },
    });
    const totalStockKg = activeStock.reduce(
      (s, t) => s + (Number(t.sellableKg) - Number(t.soldKg)),
      0
    );

    // Get inventory kg
    const inventory = await prisma.inventory.findMany({
      select: { currentQty: true },
    });
    const inventoryKg = inventory.reduce((s, i) => s + Number(i.currentQty), 0);

    // Get deductions from last 30 days for consumption rate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const deductions = await prisma.generalStockDeduction.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      select: { deductedKg: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Calculate unique days with deductions and total kg
    const daySet = new Set<string>();
    let totalDeductedKg = 0;
    for (const d of deductions) {
      daySet.add(d.createdAt.toISOString().split("T")[0]);
      totalDeductedKg += Number(d.deductedKg);
    }
    const uniqueDays = daySet.size || 1;
    const avgDailyKg = totalDeductedKg / uniqueDays;

    // Days remaining
    const totalAvailableKg = totalStockKg + inventoryKg;
    const daysRemaining = avgDailyKg > 0 ? totalAvailableKg / avgDailyKg : 999;

    // Weekly trend (last 4 weeks)
    const weeklyTrend: { week: string; kg: number }[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
      const weekEnd = new Date();
      weekEnd.setDate(weekEnd.getDate() - w * 7);

      const weekDeductions = deductions.filter((d) => {
        const dt = new Date(d.createdAt);
        return dt >= weekStart && dt < weekEnd;
      });
      const weekKg = weekDeductions.reduce((s, d) => s + Number(d.deductedKg), 0);
      const label = `Sem ${4 - w}`;
      weeklyTrend.push({ week: label, kg: Math.round(weekKg * 10) / 10 });
    }

    return NextResponse.json({
      totalStockKg: Math.round(totalStockKg * 10) / 10,
      inventoryKg: Math.round(inventoryKg * 10) / 10,
      totalAvailableKg: Math.round(totalAvailableKg * 10) / 10,
      avgDailyKg: Math.round(avgDailyKg * 10) / 10,
      daysRemaining: Math.round(daysRemaining * 10) / 10,
      totalDeductedKg: Math.round(totalDeductedKg * 10) / 10,
      uniqueDays,
      weeklyTrend,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
