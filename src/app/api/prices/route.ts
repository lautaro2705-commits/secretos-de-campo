import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const priceList = await prisma.priceList.findFirst({
    where: { isActive: true },
    include: {
      prices: {
        include: { cut: true },
        orderBy: { cut: { displayOrder: "asc" } },
      },
    },
  });
  return NextResponse.json(priceList);
}

// Actualización masiva de precios
export async function PATCH(req: Request) {
  try {
    const { percentage, cutIds } = await req.json();

    if (!percentage) {
      return NextResponse.json({ error: "Se necesita porcentaje" }, { status: 400 });
    }

    const multiplier = 1 + percentage / 100;

    const priceList = await prisma.priceList.findFirst({ where: { isActive: true } });
    if (!priceList) {
      return NextResponse.json({ error: "No hay lista de precios activa" }, { status: 400 });
    }

    const where: any = { priceListId: priceList.id };
    if (cutIds && cutIds.length > 0) {
      where.cutId = { in: cutIds };
    }

    const prices = await prisma.price.findMany({ where, include: { cut: true } });

    const updated = [];
    for (const price of prices) {
      const newSellPrice = Math.round(Number(price.sellPricePerKg) * multiplier * 100) / 100;
      await prisma.price.update({
        where: { id: price.id },
        data: { sellPricePerKg: newSellPrice },
      });
      updated.push({ cut: price.cut.name, oldPrice: Number(price.sellPricePerKg), newPrice: newSellPrice });
    }

    return NextResponse.json({ success: true, updated, count: updated.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Actualizar precio individual
export async function PUT(req: Request) {
  try {
    const { priceId, costPerKg, sellPricePerKg } = await req.json();

    const updated = await prisma.price.update({
      where: { id: priceId },
      data: {
        ...(costPerKg != null && { costPerKg }),
        ...(sellPricePerKg != null && { sellPricePerKg }),
      },
      include: { cut: true },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
