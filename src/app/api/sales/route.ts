import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { items, productItems, payments, customerId, notes } = await req.json();

    const hasItems = items && items.length > 0;
    const hasProducts = productItems && productItems.length > 0;
    if ((!hasItems && !hasProducts) || !payments || payments.length === 0) {
      return NextResponse.json({ error: "Se necesitan items y pagos" }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Calcular totales
      let subtotal = 0;
      for (const item of (items || [])) {
        subtotal += item.quantityKg * item.pricePerKg;
      }
      for (const item of (productItems || [])) {
        subtotal += item.quantity * item.pricePerUnit;
      }

      // Verificar límite de crédito si es cuenta corriente
      if (customerId) {
        const customer = await tx.customer.findUnique({ where: { id: customerId } });
        if (customer) {
          const creditLimit = Number(customer.creditLimit);
          const currentBalance = Number(customer.balance);
          const totalPaid = payments.reduce((s: number, p: any) => s + p.amount, 0);
          const newDebt = subtotal - totalPaid;
          if (creditLimit > 0 && newDebt > 0 && (currentBalance + newDebt) > creditLimit) {
            throw new Error(
              `Límite de crédito excedido. Límite: $${creditLimit.toLocaleString("es-AR")}, ` +
              `Saldo actual: $${currentBalance.toLocaleString("es-AR")}, ` +
              `Nueva deuda: $${newDebt.toLocaleString("es-AR")}`
            );
          }
        }
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
            create: (items || []).map((i: any) => ({
              cutId: i.cutId,
              quantityKg: i.quantityKg,
              pricePerKg: i.pricePerKg,
            })),
          },
          itemProducts: {
            create: (productItems || []).map((i: any) => ({
              productId: i.productId,
              quantity: i.quantity,
              pricePerUnit: i.pricePerUnit,
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

      // Descontar del inventario y detectar stock negativo
      const stockWarnings: string[] = [];
      for (const item of (items || [])) {
        const inv = await tx.inventory.findUnique({ where: { cutId: item.cutId } });
        const currentStock = inv ? Number(inv.currentQty) : 0;
        if (currentStock < item.quantityKg) {
          const cut = await tx.cut.findUnique({ where: { id: item.cutId }, select: { name: true } });
          stockWarnings.push(`${cut?.name || item.cutId}: ${currentStock.toFixed(2)}kg disponible, vendido ${item.quantityKg}kg`);
        }
        if (inv) {
          await tx.inventory.update({
            where: { cutId: item.cutId },
            data: { currentQty: { decrement: item.quantityKg } },
          });
        } else {
          await tx.inventory.create({
            data: { cutId: item.cutId, currentQty: -item.quantityKg },
          });
        }
      }

      // Descontar del inventario de productos
      for (const item of (productItems || [])) {
        const inv = await tx.productInventory.findUnique({ where: { productId: item.productId } });
        if (inv) {
          await tx.productInventory.update({
            where: { productId: item.productId },
            data: { currentQty: { decrement: item.quantity } },
          });
        } else {
          await tx.productInventory.create({
            data: { productId: item.productId, currentQty: -item.quantity },
          });
        }
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

      return { sale, stockWarnings };
    });

    // Fetch full sale for receipt
    const fullSale = await prisma.sale.findUnique({
      where: { id: result.sale.id },
      include: {
        customer: { select: { name: true } },
        items: { include: { cut: { select: { name: true } } } },
        itemProducts: { include: { product: { select: { name: true } } } },
        payments: { include: { paymentMethod: { select: { name: true } } } },
      },
    });

    return NextResponse.json({
      success: true,
      saleId: result.sale.id,
      saleNumber: result.sale.saleNumber,
      stockWarnings: result.stockWarnings,
      sale: fullSale ? {
        saleNumber: fullSale.saleNumber,
        saleDate: fullSale.saleDate.toISOString(),
        customerName: fullSale.customer?.name || null,
        subtotal: Number(fullSale.subtotal),
        surchargeAmount: Number(fullSale.surchargeAmount),
        total: Number(fullSale.total),
        status: fullSale.status,
        items: fullSale.items.map((i) => ({
          name: i.cut.name,
          kg: Number(i.quantityKg),
          pricePerKg: Number(i.pricePerKg),
        })),
        products: fullSale.itemProducts.map((p) => ({
          name: p.product.name,
          qty: Number(p.quantity),
          pricePerUnit: Number(p.pricePerUnit),
        })),
        payments: fullSale.payments.map((p) => ({
          method: p.paymentMethod.name,
          amount: Number(p.amount),
        })),
      } : null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/sales:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 20)));
    const skip = (page - 1) * limit;

    const [sales, total] = await Promise.all([
      prisma.sale.findMany({
        include: {
          customer: true,
          items: { include: { cut: true } },
          itemProducts: { include: { product: true } },
          payments: { include: { paymentMethod: true } },
        },
        orderBy: { saleDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.sale.count(),
    ]);

    return NextResponse.json({
      sales: sales.map((s) => ({
        ...s,
        subtotal: Number(s.subtotal),
        surchargeAmount: Number(s.surchargeAmount),
        total: Number(s.total),
        saleDate: s.saleDate.toISOString(),
        items: s.items.map((i) => ({ ...i, quantityKg: Number(i.quantityKg), pricePerKg: Number(i.pricePerKg) })),
        itemProducts: s.itemProducts.map((p) => ({ ...p, quantity: Number(p.quantity), pricePerUnit: Number(p.pricePerUnit) })),
        payments: s.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/sales:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Cancel a sale: restore inventory + customer balance
export async function PATCH(req: NextRequest) {
  try {
    const { id, reason } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "ID de venta requerido" }, { status: 400 });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        items: true,
        itemProducts: true,
        payments: true,
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 });
    }

    if (sale.status === "cancelled") {
      return NextResponse.json({ error: "La venta ya está anulada" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Mark sale as cancelled
      await tx.sale.update({
        where: { id },
        data: {
          status: "cancelled",
          notes: reason ? `[ANULADA] ${reason}` : "[ANULADA]",
        },
      });

      // Restore cut inventory
      for (const item of sale.items) {
        await tx.inventory.update({
          where: { cutId: item.cutId },
          data: { currentQty: { increment: Number(item.quantityKg) } },
        });
      }

      // Restore product inventory
      for (const item of sale.itemProducts) {
        await tx.productInventory.update({
          where: { productId: item.productId },
          data: { currentQty: { increment: Number(item.quantity) } },
        });
      }

      // Restore customer balance if it was a cuenta corriente sale
      if (sale.customerId && sale.status === "cuenta_corriente") {
        // Only reverse the actual debt (total - payments), not the full total
        const totalPaid = sale.payments.reduce((s, p) => s + Number(p.amount), 0);
        const debtAmount = Number(sale.total) - totalPaid;
        if (debtAmount > 0) {
          await tx.customer.update({
            where: { id: sale.customerId },
            data: { balance: { decrement: debtAmount } },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en PATCH /api/sales:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
