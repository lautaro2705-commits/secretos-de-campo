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

    // Armar estado de cuenta cronológico
    const movements = [
      ...customer.sales
        .filter((s) => s.status !== "cancelled")
        .map((s) => ({
          type: "sale" as const,
          id: s.id,
          date: s.saleDate.toISOString(),
          description: `Venta #${s.saleNumber}`,
          amount: Number(s.total),
          saleNumber: s.saleNumber,
          status: s.status,
        })),
      ...customer.payments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        date: p.paymentDate.toISOString(),
        description: `Pago - ${p.paymentMethod.name}${p.reference ? ` (${p.reference})` : ""}`,
        amount: -Number(p.amount),
        paymentMethod: p.paymentMethod.name,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      ...customer,
      balance: Number(customer.balance),
      creditLimit: Number(customer.creditLimit),
      movements,
      sales: customer.sales.map((s) => ({
        ...s,
        total: Number(s.total),
        subtotal: Number(s.subtotal),
        surchargeAmount: Number(s.surchargeAmount),
        saleDate: s.saleDate.toISOString(),
        items: s.items.map((i) => ({
          ...i,
          quantityKg: Number(i.quantityKg),
          pricePerKg: Number(i.pricePerKg),
        })),
        payments: s.payments.map((p) => ({
          ...p,
          amount: Number(p.amount),
        })),
      })),
      payments: customer.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString(),
      })),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/customers/[id]:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
