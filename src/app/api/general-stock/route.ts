import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const stocks = await prisma.generalStock.findMany({
      orderBy: [{ status: "asc" }, { entryDate: "desc" }],
      include: { supplier: { select: { name: true } } },
    });

    return NextResponse.json(
      stocks.map((s) => ({
        ...s,
        totalWeightKg: Number(s.totalWeightKg),
        bonePercent: Number(s.bonePercent),
        fatPercent: Number(s.fatPercent),
        mermaPercent: Number(s.mermaPercent),
        sellableKg: Number(s.sellableKg),
        soldKg: Number(s.soldKg),
        remainingKg: Number(s.sellableKg) - Number(s.soldKg),
        entryDate: s.entryDate.toISOString().split("T")[0],
      }))
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/general-stock:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      batchDescription,
      animalCategory,
      categoryId,
      unitCount,
      totalWeightKg,
      bonePercent: boneOverride,
      fatPercent: fatOverride,
      mermaPercent: mermaOverride,
      supplierId,
      notes,
      entryDate,
    } = body;

    if (!batchDescription || !animalCategory || !unitCount || !totalWeightKg) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios: descripcion, categoria, unidades, peso total" },
        { status: 400 }
      );
    }

    // Auto-calculate bone/fat from YieldTemplate if categoryId provided and no override
    let bonePercent = Number(boneOverride ?? 0);
    let fatPercent = Number(fatOverride ?? 0);
    const mermaPercent = Number(mermaOverride ?? 5);

    if (categoryId && (boneOverride == null || fatOverride == null)) {
      const estimate = await getYieldEstimate(
        categoryId,
        Number(totalWeightKg),
        Number(unitCount)
      );
      if (estimate) {
        if (boneOverride == null) bonePercent = estimate.bonePercent;
        if (fatOverride == null) fatPercent = estimate.fatPercent;
      }
    }

    const totalWeight = Number(totalWeightKg);
    const sellableKg =
      totalWeight * (1 - (bonePercent + fatPercent + mermaPercent) / 100);

    const date = entryDate ? new Date(entryDate + "T00:00:00") : new Date();

    const stock = await prisma.generalStock.create({
      data: {
        batchDescription,
        animalCategory,
        entryDate: date,
        unitCount: Number(unitCount),
        totalWeightKg: totalWeight,
        bonePercent,
        fatPercent,
        mermaPercent,
        sellableKg: Math.round(sellableKg * 100) / 100,
        supplierId: supplierId || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({
      success: true,
      stock: {
        ...stock,
        totalWeightKg: Number(stock.totalWeightKg),
        bonePercent: Number(stock.bonePercent),
        fatPercent: Number(stock.fatPercent),
        mermaPercent: Number(stock.mermaPercent),
        sellableKg: Number(stock.sellableKg),
        soldKg: Number(stock.soldKg),
        remainingKg: Number(stock.sellableKg) - Number(stock.soldKg),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/general-stock:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Shared logic: auto-detect bone/fat from YieldTemplate
export async function getYieldEstimate(
  categoryId: string,
  totalWeightKg: number,
  unitCount: number
): Promise<{ bonePercent: number; fatPercent: number } | null> {
  const avgWeight = totalWeightKg / unitCount;

  // Find matching weight range
  const range = await prisma.weightRange.findFirst({
    where: {
      minWeight: { lte: avgWeight },
      maxWeight: { gte: avgWeight },
    },
  });

  if (!range) return null;

  // Find YieldTemplate for this category + range
  const template = await prisma.yieldTemplate.findUnique({
    where: {
      categoryId_rangeId: { categoryId, rangeId: range.id },
    },
    include: {
      items: {
        include: { cut: { select: { name: true, isSellable: true } } },
      },
    },
  });

  if (!template) return null;

  let bonePercent = 0;
  let fatPercent = 0;

  for (const item of template.items) {
    if (item.cut.isSellable) continue;

    const pct = Number(item.percentageYield);
    const name = item.cut.name.toLowerCase();

    if (name.includes("hueso")) {
      bonePercent += pct;
    } else if (name.includes("grasa")) {
      fatPercent += pct;
    }
    // Other non-sellable items (like "recortes") are ignored for this estimate
  }

  return {
    bonePercent: Math.round(bonePercent * 100) / 100,
    fatPercent: Math.round(fatPercent * 100) / 100,
  };
}
