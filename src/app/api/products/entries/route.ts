import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const entries = await prisma.productStockEntry.findMany({
    include: {
      product: { include: { productType: true } },
      supplier: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(entries);
}
