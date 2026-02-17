import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, productTypeId, unit, description } = body;

    if (!name?.trim() || !productTypeId) {
      return NextResponse.json(
        { error: "Nombre y tipo de producto son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el tipo existe
    const productType = await prisma.productType.findUnique({
      where: { id: productTypeId },
    });

    if (!productType) {
      return NextResponse.json(
        { error: "Tipo de producto no encontrado" },
        { status: 404 }
      );
    }

    // Verificar nombre único
    const existing = await prisma.product.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Ya existe un producto con el nombre "${name.trim()}"` },
        { status: 409 }
      );
    }

    // Obtener el máximo displayOrder para este tipo
    const lastProduct = await prisma.product.findFirst({
      where: { productTypeId },
      orderBy: { displayOrder: "desc" },
    });
    const nextOrder = (lastProduct?.displayOrder ?? 0) + 1;

    // Crear producto + inventario en transacción
    const product = await prisma.$transaction(async (tx) => {
      const newProduct = await tx.product.create({
        data: {
          name: name.trim(),
          productTypeId,
          unit: unit || productType.unit || "kg",
          description: description?.trim() || null,
          displayOrder: nextOrder,
        },
      });

      await tx.productInventory.create({
        data: {
          productId: newProduct.id,
          currentQty: 0,
          minStockAlert: 2,
        },
      });

      return newProduct;
    });

    return NextResponse.json({
      success: true,
      product: {
        id: product.id,
        name: product.name,
        unit: product.unit,
        productTypeId: product.productTypeId,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/products/create:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
