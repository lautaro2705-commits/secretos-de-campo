"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface CutInfo {
  id: string; name: string; category: string; pricePerKg: number; stock: number;
}
interface CartItem {
  cutId: string; name: string; kg: number; pricePerKg: number;
}
interface ReceiptData {
  saleNumber: number;
  saleDate: string;
  customerName: string | null;
  subtotal: number;
  surchargeAmount: number;
  total: number;
  items: { name: string; kg: number; pricePerKg: number }[];
  products: { name: string; qty: number; pricePerUnit: number }[];
  payments: { method: string; amount: number }[];
}
interface Props {
  cuts: CutInfo[];
  paymentMethods: { id: string; name: string; surcharge: number }[];
  customers: { id: string; name: string; balance: number }[];
}

export function POSClient({ cuts, paymentMethods, customers }: Props) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState(paymentMethods[0]?.id ?? "");
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastSale, setLastSale] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const filtered = cuts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = cart.reduce((s, i) => s + i.kg * i.pricePerKg, 0);
  const payMethod = paymentMethods.find((m) => m.id === selectedPayment);
  const surcharge = payMethod ? subtotal * payMethod.surcharge / 100 : 0;
  const total = subtotal + surcharge;

  function addToCart(cut: CutInfo) {
    const kg = parseFloat(prompt(`Kg de ${cut.name}:`) || "0");
    if (kg <= 0) return;
    if (kg > cut.stock) {
      alert(`Stock insuficiente. Disponible: ${cut.stock.toFixed(2)} kg`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.cutId === cut.id);
      if (existing) {
        return prev.map((i) => i.cutId === cut.id ? { ...i, kg: i.kg + kg } : i);
      }
      return [...prev, { cutId: cut.id, name: cut.name, kg, pricePerKg: cut.pricePerKg }];
    });
  }

  function removeFromCart(cutId: string) {
    setCart((prev) => prev.filter((i) => i.cutId !== cutId));
  }

  async function completeSale() {
    if (cart.length === 0) return;
    setLoading(true);
    setLastSale(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ cutId: i.cutId, quantityKg: i.kg, pricePerKg: i.pricePerKg })),
          payments: [{ paymentMethodId: selectedPayment, amount: total }],
          customerId: customerId || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setLastSale(`Venta #${data.saleNumber} registrada — $${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`);
      if (data.sale) setReceipt(data.sale);
      setCart([]);
      router.refresh();
    } catch (err: unknown) {
      alert("Error: " + (err instanceof Error ? err.message : "Error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen">
      {/* Panel izquierdo: Productos */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">🛒 Punto de Venta</h1>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar corte..."
            className="mt-3 w-full border rounded-lg px-4 py-3 text-lg"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {filtered.map((cut) => (
            <button
              key={cut.id}
              onClick={() => addToCart(cut)}
              disabled={cut.stock <= 0}
              className={`p-4 rounded-xl text-left transition-all ${
                cut.stock <= 0
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-white border-2 border-transparent hover:border-brand-500 hover:shadow-md active:scale-95"
              } shadow-sm border`}
            >
              <p className="font-semibold">{cut.name}</p>
              <p className="text-brand-600 font-mono text-lg">${cut.pricePerKg.toLocaleString("es-AR")}/kg</p>
              <p className="text-xs text-gray-400 mt-1">Stock: {cut.stock.toFixed(1)} kg</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${
                cut.category === "premium" ? "bg-purple-100 text-purple-600" :
                cut.category === "parrilla" ? "bg-orange-100 text-orange-600" :
                "bg-blue-100 text-blue-600"
              }`}>{cut.category}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel derecho: Carrito */}
      <div className="w-96 bg-white border-l flex flex-col shadow-lg">
        <div className="p-4 border-b bg-gray-50">
          <h2 className="font-bold text-lg">Ticket de Venta</h2>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center mt-12">Agregá cortes para comenzar</p>
          ) : cart.map((item) => (
            <div key={item.cutId} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div>
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-gray-500">{item.kg.toFixed(2)} kg × ${item.pricePerKg.toLocaleString("es-AR")}</p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-mono font-semibold">${(item.kg * item.pricePerKg).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</p>
                <button onClick={() => removeFromCart(item.cutId)} className="text-red-400 hover:text-red-600 text-lg">×</button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t p-4 space-y-3 bg-gray-50">
          {/* Cliente */}
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Sin cliente (venta directa)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} {c.balance > 0 ? `(Debe: $${c.balance.toLocaleString("es-AR")})` : ""}</option>
            ))}
          </select>

          {/* Método de pago */}
          <div className="flex gap-2">
            {paymentMethods.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedPayment(m.id)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                  selectedPayment === m.id
                    ? "bg-brand-600 text-white"
                    : "bg-white border text-gray-600 hover:bg-gray-100"
                }`}
              >
                {m.name}
                {m.surcharge > 0 && <span className="block text-[10px] opacity-75">+{m.surcharge}%</span>}
              </button>
            ))}
          </div>

          {/* Totales */}
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
            {surcharge > 0 && (
              <div className="flex justify-between text-amber-600">
                <span>Recargo {payMethod?.name} ({payMethod?.surcharge}%)</span>
                <span className="font-mono">${surcharge.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span>TOTAL</span>
              <span className="font-mono">${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <button
            onClick={completeSale}
            disabled={cart.length === 0 || loading}
            className="w-full bg-green-600 text-white py-4 rounded-xl text-lg font-bold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors active:scale-[0.98]"
          >
            {loading ? "Procesando..." : "✅ Cobrar"}
          </button>

          {lastSale && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm text-center">
              {lastSale}
            </div>
          )}
        </div>
      </div>

      {/* Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-auto">
            <div id="receipt-content" className="p-6">
              <div className="text-center border-b pb-4 mb-4">
                <h2 className="text-xl font-bold">Secretos De Campo</h2>
                <p className="text-gray-500 text-xs">Comprobante de Venta</p>
              </div>
              <div className="flex justify-between text-sm mb-4">
                <div>
                  <p className="font-semibold">Venta #{receipt.saleNumber}</p>
                  {receipt.customerName && <p className="text-gray-500">{receipt.customerName}</p>}
                </div>
                <div className="text-right text-gray-500 text-xs">
                  <p>{new Date(receipt.saleDate).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}</p>
                  <p>{new Date(receipt.saleDate).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>

              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="border-b text-gray-500 text-xs">
                    <th className="text-left py-1">Producto</th>
                    <th className="text-right py-1">Cant.</th>
                    <th className="text-right py-1">P/U</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt.items.map((item, i) => (
                    <tr key={i} className="border-b border-dashed">
                      <td className="py-1">{item.name}</td>
                      <td className="text-right py-1">{item.kg.toFixed(2)} kg</td>
                      <td className="text-right py-1">${item.pricePerKg.toLocaleString("es-AR")}</td>
                      <td className="text-right py-1 font-mono">${(item.kg * item.pricePerKg).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {receipt.products.map((prod, i) => (
                    <tr key={`p-${i}`} className="border-b border-dashed">
                      <td className="py-1">{prod.name}</td>
                      <td className="text-right py-1">{prod.qty.toFixed(2)}</td>
                      <td className="text-right py-1">${prod.pricePerUnit.toLocaleString("es-AR")}</td>
                      <td className="text-right py-1 font-mono">${(prod.qty * prod.pricePerUnit).toLocaleString("es-AR", { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="space-y-1 text-sm border-t pt-3">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">${receipt.subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
                {receipt.surchargeAmount > 0 && (
                  <div className="flex justify-between text-amber-600"><span>Recargo</span><span className="font-mono">${receipt.surchargeAmount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span></div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL</span>
                  <span className="font-mono">${receipt.total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                <p>Pago: {receipt.payments.map((p) => `${p.method} $${p.amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`).join(", ")}</p>
              </div>

              <div className="text-center mt-4 text-xs text-gray-400">
                ¡Gracias por su compra!
              </div>
            </div>

            <div className="flex gap-2 p-4 border-t">
              <button
                onClick={() => {
                  const content = document.getElementById("receipt-content");
                  if (!content) return;
                  const printWin = window.open("", "_blank", "width=400,height=600");
                  if (!printWin) return;
                  const style = printWin.document.createElement("style");
                  style.textContent = "body{font-family:monospace;font-size:12px;padding:10px;max-width:300px;margin:0 auto}table{width:100%;border-collapse:collapse}th,td{text-align:left;padding:2px 0}th:last-child,td:last-child,th:nth-child(2),td:nth-child(2),th:nth-child(3),td:nth-child(3){text-align:right}@media print{body{margin:0;padding:5px}}";
                  printWin.document.head.appendChild(style);
                  printWin.document.title = `Ticket #${receipt.saleNumber}`;
                  const cloned = content.cloneNode(true);
                  printWin.document.body.appendChild(cloned);
                  printWin.print();
                }}
                className="flex-1 px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                🖨️ Imprimir
              </button>
              <button onClick={() => setReceipt(null)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
