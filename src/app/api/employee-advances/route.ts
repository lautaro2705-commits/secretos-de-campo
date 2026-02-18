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

    const advances = await prisma.employeeAdvance.findMany({
      where,
      include: {
        employee: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(advances);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/employee-advances:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { employeeId, amount, notes, paymentMethodId, date } = body;

    if (!employeeId || !amount || amount <= 0) {
      return NextResponse.json(
        { error: "Empleado y monto son requeridos" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 }
      );
    }

    const advance = await prisma.employeeAdvance.create({
      data: {
        employeeId,
        amount,
        date: date ? new Date(date + "T00:00:00") : new Date(),
        notes: notes || null,
        paymentMethodId: paymentMethodId || null,
      },
      include: {
        employee: true,
        paymentMethod: true,
      },
    });

    return NextResponse.json({ success: true, advance });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/employee-advances:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
