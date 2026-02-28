import { auth } from "@/lib/auth";
import { ReportesClient } from "./ReportesClient";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role || "CASHIER";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📈 Reportes</h1>
        <p className="text-gray-500 text-sm">Análisis de ventas, gastos y rendimiento</p>
      </div>
      <ReportesClient userRole={role} />
    </div>
  );
}
