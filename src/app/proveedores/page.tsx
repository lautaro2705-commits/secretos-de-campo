import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const [suppliers, invoices] = await Promise.all([
    prisma.supplier.findMany({ orderBy: { name: "asc" } }),
    prisma.supplierInvoice.findMany({
      include: { supplier: true, payments: { include: { paymentMethod: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <p className="text-gray-500 text-sm">Gestión de frigoríficos y facturas</p>
      </div>

      {/* Proveedores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-sm text-gray-500">{s.razonSocial}</p>
                <p className="text-xs text-gray-400 mt-1">CUIT: {s.cuit ?? "Sin registrar"}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {s.isActive ? "Activo" : "Inactivo"}
              </span>
            </div>
            <div className="mt-4 pt-4 border-t flex justify-between text-sm">
              <span className="text-gray-500">📞 {s.phone ?? "-"}</span>
              <span className="font-mono text-gray-700">
                Saldo: ${Number(s.balance).toLocaleString("es-AR")}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Facturas */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="font-semibold text-lg">📋 Facturas Recientes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-4">Nº Factura</th>
                <th className="text-left p-4">Proveedor</th>
                <th className="text-left p-4">Fecha</th>
                <th className="text-right p-4">Total</th>
                <th className="text-right p-4">Pagado</th>
                <th className="text-right p-4">Pendiente</th>
                <th className="text-center p-4">Estado</th>
              </tr>
            </thead>
            <tbody>
              {invoices.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-gray-400">Sin facturas registradas</td></tr>
              ) : invoices.map((inv) => {
                const total = Number(inv.totalAmount);
                const paid = Number(inv.paidAmount);
                const pending = total - paid;
                return (
                  <tr key={inv.id} className="border-b hover:bg-gray-50">
                    <td className="p-4 font-mono">{inv.invoiceNumber ?? "-"}</td>
                    <td className="p-4">{inv.supplier.name}</td>
                    <td className="p-4">{new Date(inv.invoiceDate).toLocaleDateString("es-AR")}</td>
                    <td className="p-4 text-right font-mono">${total.toLocaleString("es-AR")}</td>
                    <td className="p-4 text-right font-mono text-green-600">${paid.toLocaleString("es-AR")}</td>
                    <td className="p-4 text-right font-mono text-red-600">${pending.toLocaleString("es-AR")}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        inv.status === "paid" ? "bg-green-100 text-green-700" :
                        inv.status === "partial" ? "bg-yellow-100 text-yellow-700" :
                        inv.status === "pending" ? "bg-red-100 text-red-700" :
                        "bg-gray-100 text-gray-500"
                      }`}>{inv.status}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
