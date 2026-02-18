import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { getYieldEstimate } from "@/lib/yield-estimate";

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
