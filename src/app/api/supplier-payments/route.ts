import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const supplierId = searchParams.get("supplierId");

    if (!supplierId) {
      return NextResponse.json(
        { error: "supplierId es requerido" },
        { status: 400 }
      );
    }

    // Historial completo de movimientos: facturas + pagos, ordenados por fecha
    const [invoices, payments] = await Promise.all([
      prisma.supplierInvoice.findMany({
        where: { supplierId },
        orderBy: { invoiceDate: "desc" },
        select: {
          id: true,
          invoiceNumber: true,
          invoiceDate: true,
          dueDate: true,
          totalAmount: true,
          paidAmount: true,
          status: true,
          notes: true,
        },
      }),
      prisma.supplierPayment.findMany({
        where: { invoice: { supplierId } },
        include: {
          paymentMethod: { select: { name: true } },
          invoice: { select: { invoiceNumber: true } },
        },
        orderBy: { paymentDate: "desc" },
      }),
    ]);

    // Armar estado de cuenta cronológico
    const movements = [
      ...invoices.map((inv) => ({
        type: "invoice" as const,
        id: inv.id,
        date: inv.invoiceDate,
        description: `Factura ${inv.invoiceNumber || "S/N"}`,
        amount: Number(inv.totalAmount),
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        status: inv.status,
        paidAmount: Number(inv.paidAmount),
      })),
      ...payments.map((p) => ({
        type: "payment" as const,
        id: p.id,
        date: p.paymentDate,
        description: `Pago - ${p.paymentMethod.name}${p.invoice.invoiceNumber ? ` (Fact. ${p.invoice.invoiceNumber})` : ""}`,
        amount: -Number(p.amount),
        reference: p.reference,
        paymentMethod: p.paymentMethod.name,
        invoiceId: p.invoiceId,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({ movements, invoices, payments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/supplier-payments:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { invoiceId, paymentMethodId, amount, paymentDate, reference, notes } = body;

    if (!invoiceId || !paymentMethodId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Factura, método de pago y monto son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la factura existe y tiene saldo pendiente
    const invoice = await prisma.supplierInvoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "Factura no encontrada" },
        { status: 404 }
      );
    }

    const pending = Number(invoice.totalAmount) - Number(invoice.paidAmount);
    if (amount > pending) {
      return NextResponse.json(
        { error: `El monto excede el saldo pendiente ($${pending.toLocaleString("es-AR")})` },
        { status: 400 }
      );
    }

    // Crear pago + actualizar factura + actualizar saldo proveedor
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el pago
      const payment = await tx.supplierPayment.create({
        data: {
          invoiceId,
          paymentMethodId,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate + "T00:00:00") : new Date(),
          reference: reference || null,
          notes: notes || null,
        },
        include: { paymentMethod: { select: { name: true } } },
      });

      // 2. Actualizar monto pagado en la factura
      const newPaidAmount = Number(invoice.paidAmount) + amount;
      const newStatus = newPaidAmount >= Number(invoice.totalAmount) ? "paid" : "partial";

      await tx.supplierInvoice.update({
        where: { id: invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus,
        },
      });

      // 3. Decrementar saldo (deuda) del proveedor
      await tx.supplier.update({
        where: { id: invoice.supplierId },
        data: { balance: { decrement: amount } },
      });

      return { payment, newStatus, newPaidAmount };
    });

    return NextResponse.json({
      success: true,
      payment: {
        ...result.payment,
        amount: Number(result.payment.amount),
      },
      invoiceStatus: result.newStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/supplier-payments:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
