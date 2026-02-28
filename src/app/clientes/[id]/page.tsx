import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CustomerPaymentForm } from "./CustomerPaymentForm";

export const dynamic = "force-dynamic";

function formatMoney(n: number) {
  return `$${n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      sales: {
        where: { status: { not: "cancelled" } },
        include: {
          items: { include: { cut: true } },
          payments: { include: { paymentMethod: true } },
        },
        orderBy: { saleDate: "desc" },
        take: 50,
      },
      payments: {
        include: { paymentMethod: true },
        orderBy: { paymentDate: "desc" },
        take: 50,
      },
    },
  });

  if (!customer) notFound();

  const paymentMethods = await prisma.paymentMethod.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  const balance = Number(customer.balance);
  const creditLimit = Number(customer.creditLimit);
  const overLimit = creditLimit > 0 && balance > creditLimit;

  // Estado de cuenta cronológico
  const movements = [
    ...customer.sales.map((s) => ({
      type: "sale" as const,
      id: s.id,
      date: s.saleDate,
      description: `Venta #${s.saleNumber}`,
      amount: Number(s.total),
    })),
    ...customer.payments.map((p) => ({
      type: "payment" as const,
      id: p.id,
      date: p.paymentDate,
      description: `Pago - ${p.paymentMethod.name}${p.reference ? ` (${p.reference})` : ""}`,
      amount: -Number(p.amount),
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calcular saldo progresivo (de más reciente a más antiguo)
  let runningBalance = balance;
  const movementsWithBalance = movements.map((m) => {
    const bal = runningBalance;
    runningBalance -= m.amount; // revertimos el movimiento para ir hacia atrás
    return { ...m, balance: bal };
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link href="/clientes" className="text-brand-600 hover:text-brand-700 text-sm">
            ← Clientes
          </Link>
          <h1 className="text-2xl font-bold mt-1">{customer.name}</h1>
          <div className="flex gap-4 text-sm text-gray-500 mt-1">
            {customer.phone && <span>{customer.phone}</span>}
            {customer.email && <span>{customer.email}</span>}
            {customer.dni && <span>DNI: {customer.dni}</span>}
            {customer.address && <span>{customer.address}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Saldo actual</p>
          <p className={`text-3xl font-bold ${balance > 0 ? "text-red-600" : "text-green-600"}`}>
            {balance > 0 ? formatMoney(balance) : "Al día"}
          </p>
          {creditLimit > 0 && (
            <div className="mt-1">
              <p className="text-xs text-gray-400">Límite: {formatMoney(creditLimit)}</p>
              {overLimit && (
                <span className="text-xs bg-orange-200 text-orange-800 px-2 py-0.5 rounded">
                  Excede límite por {formatMoney(balance - creditLimit)}
                </span>
              )}
              {!overLimit && balance > 0 && (
                <p className="text-xs text-gray-400">
                  Disponible: {formatMoney(creditLimit - balance)}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Payment form */}
      {balance > 0 && (
        <div className="mb-6">
          <CustomerPaymentForm
            customerId={id}
            currentBalance={balance}
            paymentMethods={paymentMethods.map((pm) => ({ id: pm.id, name: pm.name }))}
          />
        </div>
      )}

      {/* Estado de Cuenta */}
      <div className="bg-white rounded-xl shadow-sm border mb-6">
        <div className="p-6 border-b">
          <h2 className="font-semibold">Estado de Cuenta</h2>
          <p className="text-xs text-gray-500">{movements.length} movimientos</p>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="border-b">
                <th className="text-left p-3">Fecha</th>
                <th className="text-left p-3">Descripción</th>
                <th className="text-right p-3">Debe</th>
                <th className="text-right p-3">Haber</th>
                <th className="text-right p-3">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {movementsWithBalance.length === 0 ? (
                <tr><td colSpan={5} className="p-6 text-center text-gray-400">Sin movimientos</td></tr>
              ) : movementsWithBalance.map((m) => (
                <tr key={m.id} className="border-b hover:bg-gray-50">
                  <td className="p-3 text-xs">{new Date(m.date).toLocaleDateString("es-AR")}</td>
                  <td className="p-3">{m.description}</td>
                  <td className="p-3 text-right font-mono text-red-600">
                    {m.amount > 0 ? formatMoney(m.amount) : ""}
                  </td>
                  <td className="p-3 text-right font-mono text-green-600">
                    {m.amount < 0 ? formatMoney(Math.abs(m.amount)) : ""}
                  </td>
                  <td className="p-3 text-right font-mono font-semibold">
                    {formatMoney(m.balance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ventas */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="font-semibold">Historial de Ventas</h2>
            <p className="text-xs text-gray-500">{customer.sales.length} ventas</p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-right p-3">Total</th>
                  <th className="text-left p-3">Estado</th>
                </tr>
              </thead>
              <tbody>
                {customer.sales.map((sale) => (
                  <tr key={sale.id} className="border-b">
                    <td className="p-3 font-mono text-xs">{sale.saleNumber}</td>
                    <td className="p-3 text-xs">{new Date(sale.saleDate).toLocaleDateString("es-AR")}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(Number(sale.total))}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        sale.status === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {sale.status === "completed" ? "Pagado" : "Cta. Cte."}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customer.sales.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">Sin ventas</p>
            )}
          </div>
        </div>

        {/* Pagos */}
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="p-6 border-b">
            <h2 className="font-semibold">Pagos Registrados</h2>
            <p className="text-xs text-gray-500">{customer.payments.length} pagos</p>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-right p-3">Monto</th>
                  <th className="text-left p-3">Método</th>
                  <th className="text-left p-3">Ref.</th>
                </tr>
              </thead>
              <tbody>
                {customer.payments.map((pay) => (
                  <tr key={pay.id} className="border-b">
                    <td className="p-3 text-xs">{new Date(pay.paymentDate).toLocaleDateString("es-AR")}</td>
                    <td className="p-3 text-right font-mono text-green-600">{formatMoney(Number(pay.amount))}</td>
                    <td className="p-3 text-xs">{pay.paymentMethod.name}</td>
                    <td className="p-3 text-xs text-gray-400">{pay.reference || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {customer.payments.length === 0 && (
              <p className="p-6 text-center text-gray-400 text-sm">Sin pagos</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
