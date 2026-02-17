import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { items, payments, customerId, notes } = await req.json();

    if (!items || items.length === 0 || !payments || payments.length === 0) {
      return NextResponse.json({ error: "Se necesitan items y pagos" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calcular totales
      let subtotal = 0;
      for (const item of items) {
        subtotal += item.quantityKg * item.pricePerKg;
      }

      // Calcular recargo por método de pago
      let surchargeAmount = 0;
      for (const pay of payments) {
        const method = await tx.paymentMethod.findUnique({ where: { id: pay.paymentMethodId } });
        if (method && Number(method.surchargePercentage) > 0) {
          surchargeAmount += pay.amount * Number(method.surchargePercentage) / 100;
        }
      }

      const total = subtotal + surchargeAmount;

      // Crear venta
      const sale = await tx.sale.create({
        data: {
          customerId: customerId || null,
          subtotal,
          surchargeAmount: Math.round(surchargeAmount * 100) / 100,
          total: Math.round(total * 100) / 100,
          status: customerId ? "cuenta_corriente" : "completed",
          notes: notes || null,
          items: {
            create: items.map((i: any) => ({
              cutId: i.cutId,
              quantityKg: i.quantityKg,
              pricePerKg: i.pricePerKg,
            })),
          },
          payments: {
            create: payments.map((p: any) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
              reference: p.reference || null,
            })),
          },
        },
      });

      // Descontar del inventario
      for (const item of items) {
        await tx.inventory.update({
          where: { cutId: item.cutId },
          data: { currentQty: { decrement: item.quantityKg } },
        });
      }

      // Si es cuenta corriente, actualizar balance del cliente
      if (customerId) {
        const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
        const remaining = total - totalPaid;
        if (remaining > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { increment: remaining } },
          });
        }
      }

      return sale;
    });

    return NextResponse.json({ success: true, saleId: result.id, saleNumber: result.saleNumber });
  } catch (err: any) {
    console.error("Error en POST /api/sales:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const sales = await prisma.sale.findMany({
    include: {
      customer: true,
      items: { include: { cut: true } },
      payments: { include: { paymentMethod: true } },
    },
    orderBy: { saleDate: "desc" },
    take: 50,
  });
  return NextResponse.json(sales);
}
