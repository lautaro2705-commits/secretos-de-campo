import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { supplierInvoices: true, generalStocks: true },
        },
      },
    });

    const serialized = suppliers.map((s) => ({
      ...s,
      balance: Number(s.balance),
    }));

    return NextResponse.json(serialized);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Error en GET /api/suppliers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, razonSocial, cuit, phone, email, address, notes } = body;

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        razonSocial: razonSocial || null,
        cuit: cuit || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    if (message.includes("Unique constraint") && message.includes("cuit")) {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese CUIT" },
        { status: 400 }
      );
    }
    console.error("Error en POST /api/suppliers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, razonSocial, cuit, phone, email, address, notes, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(razonSocial !== undefined && { razonSocial: razonSocial || null }),
        ...(cuit !== undefined && { cuit: cuit || null }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(email !== undefined && { email: email || null }),
        ...(address !== undefined && { address: address || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({ success: true, supplier });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    if (message.includes("Unique constraint") && message.includes("cuit")) {
      return NextResponse.json(
        { error: "Ya existe un proveedor con ese CUIT" },
        { status: 400 }
      );
    }
    console.error("Error en PUT /api/suppliers:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
