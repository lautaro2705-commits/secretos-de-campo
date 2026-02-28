import { ComprasClient } from "./ComprasClient";

export const dynamic = "force-dynamic";

export default function ComprasPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📋 Planificación de Compras</h1>
        <p className="text-gray-500 text-sm">
          Velocidad de consumo, stock disponible y recomendaciones
        </p>
      </div>
      <ComprasClient />
    </div>
  );
}
