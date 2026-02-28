import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALID_CATEGORIES = ["premium", "parrilla", "guiso", "subproducto"];
const VALID_SPECIES = ["vaca", "cerdo", "pollo"];

// ─────────────────────────────────────────────────────────
// POST /api/cuts — Create a new cut + auto-add to templates
// ─────────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const { name, cutCategory, species } = await req.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
    }
    if (!VALID_CATEGORIES.includes(cutCategory)) {
      return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
    }
    const cutSpecies = VALID_SPECIES.includes(species) ? species : "vaca";

    // Check for duplicate name (case-insensitive)
    const existing = await prisma.cut.findFirst({
      where: { name: { equals: name.trim(), mode: "insensitive" } },
    });
    if (existing) {
      return NextResponse.json({ error: "Ya existe un corte con ese nombre" }, { status: 409 });
    }

    // Calculate next displayOrder for this category + species
    const maxOrder = await prisma.cut.aggregate({
      where: { cutCategory, species: cutSpecies },
      _max: { displayOrder: true },
    });
    const nextOrder = (maxOrder._max.displayOrder ?? 0) + 1;

    // Create cut
    const cut = await prisma.cut.create({
      data: {
        name: name.trim(),
        cutCategory,
        species: cutSpecies,
        isSellable: cutCategory !== "subproducto",
        displayOrder: nextOrder,
        isActive: true,
      },
    });

    // Auto-create YieldTemplateItems (0%) for templates of the same species
    // so the EMA learning system picks up the new cut
    const templates = await prisma.yieldTemplate.findMany({
      where: { category: { species: cutSpecies } },
      select: { id: true },
    });
    if (templates.length > 0) {
      await prisma.yieldTemplateItem.createMany({
        data: templates.map((t) => ({
          templateId: t.id,
          cutId: cut.id,
          percentageYield: 0,
        })),
      });
    }

    return NextResponse.json({
      id: cut.id,
      name: cut.name,
      cutCategory: cut.cutCategory,
      isSellable: cut.isSellable,
      species: cut.species,
    });
  } catch (err: unknown) {
    console.error("Error creating cut:", err);
    return NextResponse.json({ error: "Error al crear el corte" }, { status: 500 });
  }
}
