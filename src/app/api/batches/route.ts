import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { categoryId, unitCount, totalWeight, totalCost } = body;

    if (!categoryId || !unitCount || !totalWeight || totalCost == null) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    // Auto-detectar rango de peso
    const avgWeight = totalWeight / unitCount;
    const range = await prisma.weightRange.findFirst({
      where: { minWeight: { lte: avgWeight }, maxWeight: { gte: avgWeight } },
    });

    if (!range) {
      return NextResponse.json(
        { error: `No hay rango de peso para promedio ${avgWeight.toFixed(2)} kg` },
        { status: 400 }
      );
    }

    // Buscar plantilla
    const template = await prisma.yieldTemplate.findFirst({
      where: { categoryId, rangeId: range.id, status: "active" },
      include: { items: { include: { cut: true }, orderBy: { cut: { displayOrder: "asc" } } } },
    });

    if (!template) {
      return NextResponse.json(
        { error: "No hay plantilla activa para esta categoría y rango" },
        { status: 400 }
      );
    }

    // Crear lote + proyecciones + actualizar inventario en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear lote
      const batch = await tx.stockBatch.create({
        data: {
          categoryId,
          rangeId: range.id,
          templateId: template.id,
          unitCount,
          totalWeight,
          totalCost,
          status: "projected",
        },
      });

      // 2. Calcular y crear proyecciones
      const projections = template.items.map((item) => {
        const pct = Number(item.percentageYield);
        const estimatedKg = Math.round(totalWeight * (pct / 100) * 100) / 100;
        return {
          batchId: batch.id,
          cutId: item.cutId,
          estimatedKg,
          percentageUsed: pct,
        };
      });

      await tx.stockBatchProjection.createMany({ data: projections });

      // 3. Actualizar inventario (sumar kg proyectados)
      for (const proj of projections) {
        await tx.inventory.update({
          where: { cutId: proj.cutId },
          data: { currentQty: { increment: proj.estimatedKg } },
        });
      }

      return { batch, projections };
    });

    // Armar respuesta
    const projection = {
      batchId: result.batch.id,
      totalProjected: result.projections.reduce((s, p) => s + p.estimatedKg, 0),
      cuts: result.projections.map((p) => {
        const item = template.items.find((i) => i.cutId === p.cutId)!;
        return {
          cutName: item.cut.name,
          estimatedKg: p.estimatedKg,
          percentageYield: p.percentageUsed,
          isSellable: item.cut.isSellable,
        };
      }),
    };

    return NextResponse.json({ success: true, projection });
  } catch (err: any) {
    console.error("Error en POST /api/batches:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const batches = await prisma.stockBatch.findMany({
    include: { category: true, range: true, supplier: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(batches);
}
