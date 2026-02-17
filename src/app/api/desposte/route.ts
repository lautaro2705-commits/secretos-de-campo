import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

// ─────────────────────────────────────────────────────────
// GET /api/desposte — List past real yields
// ─────────────────────────────────────────────────────────
export async function GET() {
  const yields = await prisma.realYield.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      category: { select: { name: true } },
      range: { select: { label: true } },
      items: {
        include: { cut: { select: { name: true } } },
        orderBy: { cut: { displayOrder: "asc" } },
      },
    },
  });
  return NextResponse.json(yields);
}

// ─────────────────────────────────────────────────────────
// POST /api/desposte — Register real yield + auto-learn
// ─────────────────────────────────────────────────────────
//
// Body: {
//   categoryId: string,
//   totalWeight: number,        // peso total de la media res
//   items: { cutId: string, actualKg: number }[]
//   notes?: string
// }
//
// The system:
// 1. Saves the real yield record
// 2. Calculates real percentages per cut
// 3. Finds matching template (category + auto-detected range)
// 4. Updates template using Exponential Moving Average (EMA)
//    newPct = α * realPct + (1 - α) * oldPct
//    where α (learning rate) starts high and decreases as more data comes in
// ─────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, totalWeight, items, notes } = body;

    if (!categoryId || !totalWeight || !items?.length) {
      return NextResponse.json(
        { error: "Faltan datos: categoryId, totalWeight, items[]" },
        { status: 400 }
      );
    }

    // --- Auto-detect weight range ---
    const ranges = await prisma.weightRange.findMany({ orderBy: { minWeight: "asc" } });
    const matchedRange = ranges.find(
      (r) => totalWeight >= Number(r.minWeight) && totalWeight <= Number(r.maxWeight)
    );
    if (!matchedRange) {
      return NextResponse.json(
        { error: `Peso ${totalWeight}kg no cae en ningún rango configurado` },
        { status: 400 }
      );
    }

    // --- Calculate real percentages ---
    interface ItemInput { cutId: string; actualKg: number; }
    interface ItemWithPct extends ItemInput { percentageReal: number; }

    const totalKgItems = (items as ItemInput[]).reduce((s: number, i: ItemInput) => s + i.actualKg, 0);
    const itemsWithPct: ItemWithPct[] = (items as ItemInput[]).map((i: ItemInput) => ({
      cutId: i.cutId,
      actualKg: i.actualKg,
      percentageReal: totalWeight > 0 ? (i.actualKg / totalWeight) * 100 : 0,
    }));

    // --- Save real yield record ---
    const realYield = await prisma.realYield.create({
      data: {
        categoryId,
        rangeId: matchedRange.id,
        totalWeight,
        notes,
        items: {
          create: itemsWithPct.map((i: ItemWithPct) => ({
            cutId: i.cutId,
            actualKg: i.actualKg,
            percentageReal: Math.round(i.percentageReal * 100) / 100,
          })),
        },
      },
      include: {
        items: {
          include: { cut: { select: { name: true } } },
        },
      },
    });

    // --- Auto-learn: update template percentages ---
    const template = await prisma.yieldTemplate.findUnique({
      where: { categoryId_rangeId: { categoryId, rangeId: matchedRange.id } },
      include: { items: true },
    });

    let learningApplied = false;
    let learningRate = 0;

    if (template) {
      // Count how many real yields exist for this category+range
      const yieldCount = await prisma.realYield.count({
        where: { categoryId, rangeId: matchedRange.id },
      });

      // Learning rate: starts at 0.5 (aggressive) for first data,
      // decreases to 0.1 (conservative) as more data accumulates
      // α = max(0.1, 0.5 / sqrt(yieldCount))
      learningRate = Math.max(0.1, 0.5 / Math.sqrt(yieldCount));

      // Build a map of real percentages
      const realPctMap = new Map<string, number>();
      for (const item of itemsWithPct) {
        realPctMap.set(item.cutId, item.percentageReal);
      }

      // Update each template item using EMA
      const updates: { id: string; newPct: number }[] = [];
      let totalNewPct = 0;

      for (const tItem of template.items) {
        const realPct = realPctMap.get(tItem.cutId);
        const oldPct = Number(tItem.percentageYield);

        let newPct: number;
        if (realPct !== undefined) {
          // EMA: blend old and new
          newPct = learningRate * realPct + (1 - learningRate) * oldPct;
        } else {
          // Cut not in this real yield — keep old value
          newPct = oldPct;
        }

        newPct = Math.round(newPct * 100) / 100;
        updates.push({ id: tItem.id, newPct });
        totalNewPct += newPct;
      }

      // Normalize to exactly 100% (distribute rounding error to largest item)
      const diff = 100 - Math.round(totalNewPct * 100) / 100;
      if (Math.abs(diff) > 0.001) {
        const largest = updates.reduce((a, b) => (a.newPct > b.newPct ? a : b));
        largest.newPct = Math.round((largest.newPct + diff) * 100) / 100;
      }

      // Apply updates in a transaction
      await prisma.$transaction([
        ...updates.map((u) =>
          prisma.yieldTemplateItem.update({
            where: { id: u.id },
            data: { percentageYield: u.newPct },
          })
        ),
        prisma.realYield.update({
          where: { id: realYield.id },
          data: { appliedToTemplate: true },
        }),
      ]);

      learningApplied = true;
    }

    // --- Build response with comparison ---
    const variance = totalWeight - totalKgItems;

    return NextResponse.json({
      realYield: {
        id: realYield.id,
        yieldNumber: realYield.yieldNumber,
        totalWeight,
        totalKgRegistered: Math.round(totalKgItems * 100) / 100,
        variance: Math.round(variance * 100) / 100,
        variancePercent: Math.round((variance / totalWeight) * 10000) / 100,
      },
      items: realYield.items.map((i) => ({
        cutName: i.cut.name,
        actualKg: Number(i.actualKg),
        percentageReal: Number(i.percentageReal),
      })),
      learning: {
        applied: learningApplied,
        learningRate: Math.round(learningRate * 1000) / 1000,
        message: learningApplied
          ? `Plantilla actualizada con tasa de aprendizaje ${(learningRate * 100).toFixed(1)}%`
          : "No se encontró plantilla para actualizar",
      },
    });
  } catch (error: any) {
    console.error("Error en desposte:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
