import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        _count: { select: { sales: true, payments: true } },
      },
      orderBy: [{ balance: "desc" }, { name: "asc" }],
    });

    return NextResponse.json(customers);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/customers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, phone, email, address, creditLimit } = body;

    if (!name?.trim()) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: phone?.trim() || null,
        email: email?.trim() || null,
        address: address?.trim() || null,
        creditLimit: creditLimit || 0,
        balance: 0,
      },
    });

    return NextResponse.json({ success: true, customer });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en POST /api/customers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
