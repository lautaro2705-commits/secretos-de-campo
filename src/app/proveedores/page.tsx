import { prisma } from "@/lib/prisma";
import { ProveedoresClient } from "./ProveedoresClient";

export const dynamic = "force-dynamic";

export default async function ProveedoresPage() {
  const [suppliers, invoices, paymentMethods] = await Promise.all([
    prisma.supplier.findMany({
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
      include: {
        _count: {
          select: { supplierInvoices: true, generalStocks: true },
        },
      },
    }),
    prisma.supplierInvoice.findMany({
      include: {
        supplier: { select: { name: true } },
        payments: {
          include: { paymentMethod: { select: { name: true } } },
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { invoiceDate: "desc" },
      take: 100,
    }),
    prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const serializedSuppliers = suppliers.map((s) => ({
    ...s,
    balance: Number(s.balance),
  }));

  const serializedInvoices = invoices.map((inv) => ({
    ...inv,
    totalAmount: Number(inv.totalAmount),
    paidAmount: Number(inv.paidAmount),
    pendingAmount: Number(inv.totalAmount) - Number(inv.paidAmount),
    invoiceDate: inv.invoiceDate.toISOString(),
    dueDate: inv.dueDate ? inv.dueDate.toISOString() : null,
    createdAt: inv.createdAt.toISOString(),
    updatedAt: inv.updatedAt.toISOString(),
    payments: inv.payments.map((p) => ({
      ...p,
      amount: Number(p.amount),
      paymentDate: p.paymentDate.toISOString(),
      createdAt: p.createdAt.toISOString(),
    })),
  }));

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🚚 Proveedores</h1>
        <p className="text-gray-500 text-sm">
          Cuenta corriente, facturas y pagos
        </p>
      </div>
      <ProveedoresClient
        initialSuppliers={serializedSuppliers}
        initialInvoices={serializedInvoices}
        paymentMethods={paymentMethods}
      />
    </div>
  );
}
