import { ReportesClient } from "./ReportesClient";

export const dynamic = "force-dynamic";

export default function ReportesPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📈 Reportes</h1>
        <p className="text-gray-500 text-sm">Análisis de ventas, gastos y rendimiento</p>
      </div>
      <ReportesClient />
    </div>
  );
}
