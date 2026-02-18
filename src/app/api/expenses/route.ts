import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get("date");

    const where: any = {};
    if (dateStr) {
      const date = new Date(dateStr + "T00:00:00");
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      where.date = { gte: date, lt: nextDay };
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: { paymentMethod: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(expenses);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/expenses:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category, amount, description, paymentMethodId, notes, date } =
      body;

    if (!category || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Categoría y monto son requeridos" },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.create({
      data: {
        date: date ? new Date(date + "T00:00:00") : new Date(),
        category,
        amount,
        description: description || category,
        paymentMethodId: paymentMethodId || null,
        notes: notes || null,
      },
      include: { paymentMethod: true },
    });

    return NextResponse.json({ success: true, expense });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/expenses:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
