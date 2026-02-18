import { prisma } from "@/lib/prisma";

/**
 * Calcula el % estimado de hueso y grasa para una categoría animal y peso,
 * usando los YieldTemplates que aprenden via EMA de cada desposte real.
 */
export async function getYieldEstimate(
  categoryId: string,
  totalWeightKg: number,
  unitCount: number
): Promise<{ bonePercent: number; fatPercent: number } | null> {
  const avgWeight = totalWeightKg / unitCount;

  // Buscar rango de peso que corresponda al peso promedio por unidad
  const range = await prisma.weightRange.findFirst({
    where: {
      minWeight: { lte: avgWeight },
      maxWeight: { gte: avgWeight },
    },
  });

  if (!range) return null;

  // Buscar YieldTemplate para esta categoría + rango
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
  }

  return {
    bonePercent: Math.round(bonePercent * 100) / 100,
    fatPercent: Math.round(fatPercent * 100) / 100,
  };
}
