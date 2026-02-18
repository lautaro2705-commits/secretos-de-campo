import { NextRequest, NextResponse } from "next/server";
import { getYieldEstimate } from "@/lib/yield-estimate";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");
    const totalWeightKg = Number(searchParams.get("totalWeightKg") || 0);
    const unitCount = Number(searchParams.get("unitCount") || 1);
    const mermaPercent = Number(searchParams.get("mermaPercent") || 5);

    if (!categoryId || !totalWeightKg) {
      return NextResponse.json(
        { error: "Se requiere categoryId y totalWeightKg" },
        { status: 400 }
      );
    }

    const estimate = await getYieldEstimate(categoryId, totalWeightKg, unitCount);

    if (!estimate) {
      return NextResponse.json({
        found: false,
        bonePercent: 0,
        fatPercent: 0,
        mermaPercent,
        sellableKg: totalWeightKg * (1 - mermaPercent / 100),
        message: "No se encontró plantilla para esta categoría/peso. Ingrese los % manualmente.",
      });
    }

    const sellableKg =
      totalWeightKg *
      (1 - (estimate.bonePercent + estimate.fatPercent + mermaPercent) / 100);

    return NextResponse.json({
      found: true,
      bonePercent: estimate.bonePercent,
      fatPercent: estimate.fatPercent,
      mermaPercent,
      sellableKg: Math.round(sellableKg * 100) / 100,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/general-stock/yield-estimate:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
