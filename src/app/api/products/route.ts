import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: listar tipos de producto y sus productos
export async function GET() {
  const types = await prisma.productType.findMany({
    where: { isActive: true },
    include: {
      products: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(types);
}

// POST: registrar ingreso de stock de un producto
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, quantity, costPerUnit, notes } = body;

    if (!productId || !quantity || costPerUnit == null) {
      return NextResponse.json(
        { error: "Faltan campos: productId, quantity, costPerUnit" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { productType: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    }

    const totalCost = Number(quantity) * Number(costPerUnit);

    // Crear entrada de stock + actualizar inventario en transacción
    const entry = await prisma.$transaction(async (tx) => {
      const stockEntry = await tx.productStockEntry.create({
        data: {
          productId,
          quantity,
          costPerUnit,
          totalCost,
          notes: notes || null,
        },
      });

      await tx.productInventory.upsert({
        where: { productId },
        update: { currentQty: { increment: Number(quantity) } },
        create: { productId, currentQty: quantity, minStockAlert: 2 },
      });

      return stockEntry;
    });

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        product: product.name,
        type: product.productType.name,
        quantity: Number(entry.quantity),
        costPerUnit: Number(entry.costPerUnit),
        totalCost: Number(entry.totalCost),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/products:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
