import { VentasClient } from "./VentasClient";

export const dynamic = "force-dynamic";

export default function VentasPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🧾 Historial de Ventas</h1>
        <p className="text-gray-500 text-sm">Todas las ventas registradas — podés anular ventas erróneas</p>
      </div>
      <VentasClient />
    </div>
  );
}
