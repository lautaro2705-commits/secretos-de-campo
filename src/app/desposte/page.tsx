import { prisma } from "@/lib/prisma";
import { DesposteForm } from "./DesposteForm";
import { DesposteHistory } from "./DesposteHistory";

export const dynamic = "force-dynamic";

export default async function DespostePage() {
  const [categories, cuts, realYields] = await Promise.all([
    prisma.animalCategory.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.cut.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    prisma.realYield.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        category: { select: { name: true } },
        range: { select: { label: true } },
        items: {
          include: { cut: { select: { name: true } } },
          orderBy: { percentageReal: "desc" },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">🔪 Desposte Real</h1>
        <p className="text-gray-500 mt-1">
          Registrá los kg reales de cada corte al despostar una media res.
          El sistema aprende de cada registro y ajusta las plantillas automáticamente.
        </p>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-1">📋 Cargar Desposte</h2>
        <p className="text-sm text-gray-500 mb-4">
          Ingresá el peso total y los kg de cada corte obtenido. El sistema calcula los porcentajes
          y actualiza la plantilla correspondiente.
        </p>
        <DesposteForm
          categories={categories.map((c) => ({ id: c.id, name: c.name, species: c.species }))}
          cuts={cuts.map((c) => ({
            id: c.id,
            name: c.name,
            cutCategory: c.cutCategory || "",
            isSellable: c.isSellable,
            species: c.species,
          }))}
        />
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">📊 Historial de Despostes</h2>
        <DesposteHistory yields={realYields as any} />
      </div>
    </div>
  );
}
