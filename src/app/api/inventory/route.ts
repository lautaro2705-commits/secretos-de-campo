import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const inventory = await prisma.inventory.findMany({
    include: { cut: true },
    orderBy: { cut: { displayOrder: "asc" } },
  });
  return NextResponse.json(inventory);
}

// Ajuste manual de stock
export async function PATCH(req: Request) {
  try {
    const { cutId, newQty, reason, notes } = await req.json();

    if (!cutId || newQty == null || !reason) {
      return NextResponse.json({ error: "Faltan campos requeridos" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.inventory.findUnique({
        where: { cutId },
        include: { cut: true },
      });

      if (!current) {
        throw new Error("Corte no encontrado en inventario");
      }

      const previousQty = Number(current.currentQty);

      // Registrar ajuste (auditoría)
      await tx.inventoryAdjustment.create({
        data: {
          cutId,
          previousQty,
          newQty,
          reason,
          notes: notes || null,
        },
      });

      // Actualizar stock
      await tx.inventory.update({
        where: { cutId },
        data: { currentQty: newQty },
      });

      return { cutName: current.cut.name, previousQty, newQty };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
