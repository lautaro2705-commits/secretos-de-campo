import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            items: { include: { cut: true } },
            payments: { include: { paymentMethod: true } },
          },
          orderBy: { saleDate: "desc" },
          take: 50,
        },
        payments: {
          include: { paymentMethod: true },
          orderBy: { paymentDate: "desc" },
          take: 50,
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/customers/[id]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
