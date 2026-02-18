import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { amount, paymentMethodId, reference, notes } = body;

    if (!amount || amount <= 0 || !paymentMethodId) {
      return NextResponse.json(
        { error: "Monto y método de pago son requeridos" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Obtener cliente actual
      const customer = await tx.customer.findUnique({ where: { id } });
      if (!customer) throw new Error("Cliente no encontrado");

      const currentBalance = Number(customer.balance);
      if (currentBalance <= 0) {
        throw new Error("El cliente no tiene saldo pendiente");
      }

      // Clamp: no puede pagar más de lo que debe
      const effectiveAmount = Math.min(amount, currentBalance);

      // Crear pago
      const payment = await tx.customerPayment.create({
        data: {
          customerId: id,
          amount: effectiveAmount,
          paymentMethodId,
          reference: reference || null,
          notes: notes || null,
        },
        include: { paymentMethod: true },
      });

      // Decrementar balance (clamp a 0)
      const newBalance = Math.max(0, currentBalance - effectiveAmount);
      await tx.customer.update({
        where: { id },
        data: { balance: newBalance },
      });

      return {
        payment,
        previousBalance: currentBalance,
        newBalance,
        amountApplied: effectiveAmount,
      };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/customers/[id]/payment:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
