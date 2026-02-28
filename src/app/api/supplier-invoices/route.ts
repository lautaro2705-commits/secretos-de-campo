import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};
    if (supplierId) where.supplierId = supplierId;
    if (status) where.status = status;

    const invoices = await prisma.supplierInvoice.findMany({
      where,
      include: {
        supplier: { select: { name: true } },
        payments: {
          include: { paymentMethod: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    });

    const serialized = invoices.map((inv) => ({
      ...inv,
      totalAmount: Number(inv.totalAmount),
      paidAmount: Number(inv.paidAmount),
      pendingAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
      payments: inv.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    }));

    return NextResponse.json(serialized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/supplier-invoices:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { supplierId, invoiceNumber, invoiceDate, dueDate, totalAmount, notes } = body;

    if (!supplierId || !totalAmount || totalAmount <= 0) {
      return NextResponse.json(
        { error: "Proveedor y monto total son requeridos" },
        { status: 400 }
      );
    }

    // Crear factura + actualizar saldo del proveedor en transacción
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.supplierInvoice.create({
        data: {
          supplierId,
          invoiceNumber: invoiceNumber || null,
          invoiceDate: invoiceDate ? new Date(invoiceDate + "T00:00:00") : new Date(),
          dueDate: dueDate ? new Date(dueDate + "T00:00:00") : null,
          totalAmount,
          status: "pending",
          notes: notes || null,
        },
        include: { supplier: { select: { name: true } } },
      });

      // Incrementar saldo (deuda) del proveedor
      await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: { increment: totalAmount } },
      });

      return invoice;
    });

    return NextResponse.json({
      success: true,
      invoice: {
        ...result,
        totalAmount: Number(result.totalAmount),
        paidAmount: Number(result.paidAmount),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/supplier-invoices:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
