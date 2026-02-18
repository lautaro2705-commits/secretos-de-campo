import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "30");

    const closes = await prisma.dailyCashClose.findMany({
      orderBy: { closeDate: "desc" },
      take: limit,
    });

    return NextResponse.json(closes);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/daily-close:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { posnetTotal, actualCash, scaleReadings, notes, closedBy, date } =
      body;

    // Fecha del cierre (hoy por defecto)
    const closeDate = date ? new Date(date + "T00:00:00") : new Date();
    // Normalizar a solo fecha
    closeDate.setHours(0, 0, 0, 0);

    // Rango del día para queries
    const dayStart = new Date(closeDate);
    const dayEnd = new Date(closeDate);
    dayEnd.setDate(dayEnd.getDate() + 1);

    // 1. Calcular total ventas del día y desglose por método de pago
    const salesOfDay = await prisma.sale.findMany({
      where: {
        saleDate: { gte: dayStart, lt: dayEnd },
        status: { not: "cancelled" },
      },
      include: {
        payments: {
          include: { paymentMethod: true },
        },
      },
    });

    let totalSales = 0;
    let totalCash = 0;
    let totalCard = 0;
    let totalTransfer = 0;
    let totalMp = 0;

    for (const sale of salesOfDay) {
      totalSales += Number(sale.total);
      for (const payment of sale.payments) {
        const amount = Number(payment.amount);
        const methodName = payment.paymentMethod.name.toLowerCase();

        if (methodName.includes("efectivo")) {
          totalCash += amount;
        } else if (
          methodName.includes("débito") ||
          methodName.includes("debito") ||
          methodName.includes("crédito") ||
          methodName.includes("credito")
        ) {
          totalCard += amount;
        } else if (methodName.includes("transferencia")) {
          totalTransfer += amount;
        } else if (
          methodName.includes("mercado") ||
          methodName.includes("mp")
        ) {
          totalMp += amount;
        } else {
          // Otros métodos van a efectivo por defecto
          totalCash += amount;
        }
      }
    }

    // 2. Calcular total gastos del día
    const expensesAgg = await prisma.expense.aggregate({
      where: { date: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
    });
    const totalExpenses = Number(expensesAgg._sum.amount || 0);

    // 3. Calcular total adelantos del día
    const advancesAgg = await prisma.employeeAdvance.aggregate({
      where: { date: { gte: dayStart, lt: dayEnd } },
      _sum: { amount: true },
    });
    const totalAdvances = Number(advancesAgg._sum.amount || 0);

    // 4. Calcular efectivo esperado
    const expectedCash = totalCash - totalExpenses - totalAdvances;

    // 5. Diferencia
    const realActualCash = Number(actualCash || 0);
    const difference = realActualCash - expectedCash;

    // 6. Upsert — si ya cerró hoy, actualiza
    const dailyClose = await prisma.dailyCashClose.upsert({
      where: { closeDate: dayStart },
      create: {
        closeDate: dayStart,
        totalSales: Math.round(totalSales * 100) / 100,
        totalCash: Math.round(totalCash * 100) / 100,
        totalCard: Math.round(totalCard * 100) / 100,
        totalTransfer: Math.round(totalTransfer * 100) / 100,
        totalMp: Math.round(totalMp * 100) / 100,
        posnetTotal: Number(posnetTotal || 0),
        scaleReadings: scaleReadings || null,
        expectedCash: Math.round(expectedCash * 100) / 100,
        actualCash: realActualCash,
        difference: Math.round(difference * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalAdvances: Math.round(totalAdvances * 100) / 100,
        notes: notes || null,
        closedBy: closedBy || null,
      },
      update: {
        totalSales: Math.round(totalSales * 100) / 100,
        totalCash: Math.round(totalCash * 100) / 100,
        totalCard: Math.round(totalCard * 100) / 100,
        totalTransfer: Math.round(totalTransfer * 100) / 100,
        totalMp: Math.round(totalMp * 100) / 100,
        posnetTotal: Number(posnetTotal || 0),
        scaleReadings: scaleReadings || null,
        expectedCash: Math.round(expectedCash * 100) / 100,
        actualCash: realActualCash,
        difference: Math.round(difference * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalAdvances: Math.round(totalAdvances * 100) / 100,
        notes: notes || null,
        closedBy: closedBy || null,
      },
    });

    return NextResponse.json({
      success: true,
      dailyClose,
      summary: {
        salesCount: salesOfDay.length,
        totalSales: Math.round(totalSales * 100) / 100,
        totalCash: Math.round(totalCash * 100) / 100,
        totalCard: Math.round(totalCard * 100) / 100,
        totalTransfer: Math.round(totalTransfer * 100) / 100,
        totalMp: Math.round(totalMp * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalAdvances: Math.round(totalAdvances * 100) / 100,
        expectedCash: Math.round(expectedCash * 100) / 100,
        actualCash: realActualCash,
        difference: Math.round(difference * 100) / 100,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/daily-close:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
