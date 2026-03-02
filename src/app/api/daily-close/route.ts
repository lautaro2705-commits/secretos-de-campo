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
        const methodType = payment.paymentMethod.type || "cash";

        switch (methodType) {
          case "card":
            totalCard += amount;
            break;
          case "transfer":
            totalTransfer += amount;
            break;
          case "digital":
            totalMp += amount;
            break;
          case "cash":
          default:
            totalCash += amount;
            break;
        }
      }
    }

    // 2. Calcular total gastos del día (separando por método)
    const expensesOfDay = await prisma.expense.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      include: { paymentMethod: true },
    });
    const totalExpenses = expensesOfDay.reduce((s, e) => s + Number(e.amount), 0);
    const cashExpenses = expensesOfDay
      .filter((e) => !e.paymentMethod || e.paymentMethod.type === "cash")
      .reduce((s, e) => s + Number(e.amount), 0);

    // 3. Calcular total adelantos del día (separando por método)
    const advancesOfDay = await prisma.employeeAdvance.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      include: { paymentMethod: true },
    });
    const totalAdvances = advancesOfDay.reduce((s, a) => s + Number(a.amount), 0);
    const cashAdvances = advancesOfDay
      .filter((a) => !a.paymentMethod || a.paymentMethod.type === "cash")
      .reduce((s, a) => s + Number(a.amount), 0);

    // 4. Calcular efectivo esperado (solo restar gastos/adelantos en efectivo)
    const expectedCash = totalCash - cashExpenses - cashAdvances;

    // 5. Diferencia
    const realActualCash = Number(actualCash || 0);
    const difference = realActualCash - expectedCash;

    // 6. Calcular kg totales de balanzas
    let totalScaleKg = 0;
    if (scaleReadings && Array.isArray(scaleReadings)) {
      for (const reading of scaleReadings) {
        const kgStart = Number(reading.kgStart || 0);
        const kgEnd = Number(reading.kgEnd || 0);
        if (kgEnd > kgStart) {
          totalScaleKg += kgEnd - kgStart;
        }
      }
    }
    totalScaleKg = Math.round(totalScaleKg * 100) / 100;

    // 7. Upsert — si ya cerró hoy, actualiza
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
        generalStockDeductionKg: totalScaleKg,
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
        generalStockDeductionKg: totalScaleKg,
        notes: notes || null,
        closedBy: closedBy || null,
      },
    });

    // 8. FIFO deduction del stock general
    let fifoDeductions: { tropaId: string; description: string; kg: number }[] = [];
    let unaccountedKg = 0;

    if (totalScaleKg > 0) {
      await prisma.$transaction(async (tx) => {
        // 8a. Revertir deducciones previas de este cierre (para re-cierre)
        const prevDeductions = await tx.generalStockDeduction.findMany({
          where: { dailyCloseId: dailyClose.id },
        });
        for (const d of prevDeductions) {
          await tx.generalStock.update({
            where: { id: d.generalStockId },
            data: {
              soldKg: { decrement: Number(d.deductedKg) },
              status: "active",
              depletedAt: null,
              realMermaPercent: null,
            },
          });
        }
        if (prevDeductions.length > 0) {
          await tx.generalStockDeduction.deleteMany({
            where: { dailyCloseId: dailyClose.id },
          });
        }

        // 8b. Obtener tropas activas ordenadas FIFO (más vieja primero)
        const activeTropas = await tx.generalStock.findMany({
          where: { status: "active" },
          orderBy: { entryDate: "asc" },
        });

        let remaining = totalScaleKg;

        for (const tropa of activeTropas) {
          if (remaining <= 0) break;

          const available = Number(tropa.sellableKg) - Number(tropa.soldKg);
          if (available <= 0) continue;

          const toDeduct = Math.min(remaining, available);
          const roundedDeduct = Math.round(toDeduct * 100) / 100;

          const newSoldKg = Number(tropa.soldKg) + roundedDeduct;
          const isDepleted = newSoldKg >= Number(tropa.sellableKg);

          // Calcular merma real al agotar tropa
          // Merma real = lo que no se pudo vender del peso estimado vendible
          // Si soldKg < sellableKg al agotar, la diferencia es merma extra
          // Fórmula: realMermaPercent = 100 - (soldKg / totalWeightKg * 100) - bonePercent - fatPercent
          let realMermaPercent: number | undefined;
          if (isDepleted) {
            const totalWeight = Number(tropa.totalWeightKg);
            const bone = Number(tropa.bonePercent);
            const fat = Number(tropa.fatPercent);
            if (totalWeight > 0) {
              const soldPercent = (newSoldKg / totalWeight) * 100;
              realMermaPercent = Math.round((100 - soldPercent - bone - fat) * 100) / 100;
            }
          }

          await tx.generalStock.update({
            where: { id: tropa.id },
            data: {
              soldKg: { increment: roundedDeduct },
              status: isDepleted ? "depleted" : "active",
              ...(isDepleted && {
                depletedAt: new Date(),
                ...(realMermaPercent !== undefined && { realMermaPercent }),
              }),
            },
          });

          await tx.generalStockDeduction.create({
            data: {
              generalStockId: tropa.id,
              dailyCloseId: dailyClose.id,
              deductedKg: roundedDeduct,
              deductionDate: dayStart,
            },
          });

          fifoDeductions.push({
            tropaId: tropa.id,
            description: tropa.batchDescription,
            kg: roundedDeduct,
          });

          remaining -= roundedDeduct;
        }

        unaccountedKg = Math.round(Math.max(0, remaining) * 100) / 100;
      });
    }

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
        totalScaleKg,
        fifoDeductions,
        unaccountedKg,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/daily-close:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
