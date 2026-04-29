"use client";

import { useMemo, useState } from "react";

interface CutInfo {
  id: string;
  name: string;
  cutCategory: string;
  isSellable: boolean;
  sellPricePerKg: number;
}

interface YieldItem {
  cutId: string;
  cutName: string;
  actualKg: number;
}

interface RealYieldInfo {
  id: string;
  yieldNumber: number;
  totalWeight: number;
  createdAt: string;
  categoryName: string;
  rangeLabel: string;
  items: YieldItem[];
}

interface Row {
  uid: string;
  cutId: string | null;
  name: string;
  kg: string;
  sellPricePerKg: string;
  isWaste: boolean;
}

interface Props {
  cuts: CutInfo[];
  realYields: RealYieldInfo[];
  priceListName: string | null;
}

const DEFAULT_COST_PER_KG = "10000";
const DEFAULT_TOTAL_WEIGHT = "136";

const fmtCurrency = (n: number) =>
  `$${Math.round(n).toLocaleString("es-AR")}`;

const fmtKg = (n: number) => `${n.toFixed(2)} kg`;

let uidCounter = 0;
const nextUid = () => `r${++uidCounter}-${Date.now()}`;

export function RentabilidadCalculator({ cuts, realYields, priceListName }: Props) {
  const [costPerKg, setCostPerKg] = useState(DEFAULT_COST_PER_KG);
  const [totalWeight, setTotalWeight] = useState(DEFAULT_TOTAL_WEIGHT);
  const [rows, setRows] = useState<Row[]>([]);
  const [selectedYieldId, setSelectedYieldId] = useState<string>("");
  const [addCutId, setAddCutId] = useState("");

  const cutById = useMemo(() => {
    const m: Record<string, CutInfo> = {};
    for (const c of cuts) m[c.id] = c;
    return m;
  }, [cuts]);

  function loadFromYield(yieldId: string) {
    setSelectedYieldId(yieldId);
    if (!yieldId) return;
    const y = realYields.find((r) => r.id === yieldId);
    if (!y) return;
    setTotalWeight(String(y.totalWeight));
    const newRows: Row[] = y.items.map((it) => {
      const cut = cutById[it.cutId];
      const price = cut?.sellPricePerKg ?? 0;
      return {
        uid: nextUid(),
        cutId: it.cutId,
        name: it.cutName,
        kg: it.actualKg.toFixed(2),
        sellPricePerKg: price ? String(price) : "",
        isWaste: cut ? !cut.isSellable : false,
      };
    });
    setRows(newRows);
  }

  function addRowFromCut(cutId: string) {
    if (!cutId) return;
    const cut = cutById[cutId];
    if (!cut) return;
    setRows((prev) => [
      ...prev,
      {
        uid: nextUid(),
        cutId: cut.id,
        name: cut.name,
        kg: "",
        sellPricePerKg: cut.sellPricePerKg ? String(cut.sellPricePerKg) : "",
        isWaste: !cut.isSellable,
      },
    ]);
    setAddCutId("");
  }

  function addCustomRow(presetName = "", isWaste = false) {
    setRows((prev) => [
      ...prev,
      {
        uid: nextUid(),
        cutId: null,
        name: presetName,
        kg: "",
        sellPricePerKg: isWaste ? "0" : "",
        isWaste,
      },
    ]);
  }

  function updateRow(uid: string, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));
  }

  function removeRow(uid: string) {
    setRows((prev) => prev.filter((r) => r.uid !== uid));
  }

  function clearAll() {
    setRows([]);
    setSelectedYieldId("");
  }

  const totalWeightNum = parseFloat(totalWeight) || 0;
  const costPerKgNum = parseFloat(costPerKg) || 0;
  const costoTotal = totalWeightNum * costPerKgNum;

  const computed = rows.map((r) => {
    const kg = parseFloat(r.kg) || 0;
    const price = r.isWaste ? 0 : parseFloat(r.sellPricePerKg) || 0;
    const ingreso = kg * price;
    return { row: r, kg, price, ingreso };
  });

  const sellableKg = computed
    .filter((c) => !c.row.isWaste)
    .reduce((s, c) => s + c.kg, 0);
  const wasteKg = computed
    .filter((c) => c.row.isWaste)
    .reduce((s, c) => s + c.kg, 0);
  const registeredKg = sellableKg + wasteKg;
  const mermaKg = Math.max(0, totalWeightNum - registeredKg);
  const ingresoTotal = computed.reduce((s, c) => s + c.ingreso, 0);
  const ganancia = ingresoTotal - costoTotal;
  const gananciaPorKgMedia = totalWeightNum > 0 ? ganancia / totalWeightNum : 0;
  const margenSobreVenta =
    ingresoTotal > 0 ? (ganancia / ingresoTotal) * 100 : 0;
  const markupSobreCosto =
    costoTotal > 0 ? (ganancia / costoTotal) * 100 : 0;
  const precioPromedioVendible =
    sellableKg > 0
      ? computed
          .filter((c) => !c.row.isWaste)
          .reduce((s, c) => s + c.ingreso, 0) / sellableKg
      : 0;

  // Pricelist coverage warning
  const rowsMissingPrice = computed.filter(
    (c) => !c.row.isWaste && c.kg > 0 && c.price <= 0
  );

  const yieldHas = (cutId: string) =>
    rows.some((r) => r.cutId === cutId);
  const availableCuts = cuts.filter((c) => !yieldHas(c.id));

  return (
    <div className="space-y-6">
      {/* Top inputs */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Costo por kg de media res ($)
            </label>
            <input
              type="number"
              step="1"
              min="0"
              value={costPerKg}
              onChange={(e) => setCostPerKg(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="10000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Peso total media res (kg)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={totalWeight}
              onChange={(e) => setTotalWeight(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              placeholder="136"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cargar desde Desposte Real
            </label>
            <select
              value={selectedYieldId}
              onChange={(e) => loadFromYield(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">— Sin precargar —</option>
              {realYields.map((y) => (
                <option key={y.id} value={y.id}>
                  #{y.yieldNumber} · {y.categoryName} · {y.totalWeight.toFixed(1)}kg ·{" "}
                  {new Date(y.createdAt).toLocaleDateString("es-AR")}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          Lista de precios activa:{" "}
          <span className="font-medium text-gray-700">
            {priceListName ?? "Sin lista activa"}
          </span>
          . Los precios se autocompletan al cargar cortes; podés editarlos manualmente.
        </p>
      </div>

      {/* Rows table */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-6 border-b flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg">📋 Cortes y desperdicios</h2>
            <p className="text-gray-500 text-sm mt-1">
              Marcá &quot;desperdicio&quot; los kg que no se venden (huesos, grasa). Suman al peso
              registrado pero no generan ingreso.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => addCustomRow("Huesos", true)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
            >
              + Huesos
            </button>
            <button
              type="button"
              onClick={() => addCustomRow("Grasa", true)}
              className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-2 rounded-lg"
            >
              + Grasa
            </button>
            <button
              type="button"
              onClick={() => addCustomRow("", false)}
              className="text-xs bg-brand-50 hover:bg-brand-100 text-brand-700 px-3 py-2 rounded-lg"
            >
              + Fila libre
            </button>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-700 px-3 py-2 rounded-lg"
              >
                Vaciar
              </button>
            )}
          </div>
        </div>

        {/* Add cut from catalog */}
        <div className="px-6 py-4 border-b bg-gray-50 flex flex-wrap gap-2 items-center">
          <span className="text-sm text-gray-600">Agregar corte del catálogo:</span>
          <select
            value={addCutId}
            onChange={(e) => addRowFromCut(e.target.value)}
            className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-[200px] max-w-md"
          >
            <option value="">— Seleccionar corte —</option>
            {availableCuts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.sellPricePerKg ? ` · $${c.sellPricePerKg.toLocaleString("es-AR")}/kg` : ""}
                {!c.isSellable ? " (no vendible)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 w-1/4">Corte / Item</th>
                <th className="text-right p-3">Kg</th>
                <th className="text-right p-3">$/kg venta</th>
                <th className="text-right p-3">Ingreso</th>
                <th className="text-right p-3">% peso</th>
                <th className="text-center p-3">Desperdicio</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    Cargá un Desposte Real, agregá cortes del catálogo o usá &quot;+ Fila libre&quot;.
                  </td>
                </tr>
              )}
              {computed.map(({ row, kg, price, ingreso }) => {
                const pctPeso =
                  totalWeightNum > 0 ? (kg / totalWeightNum) * 100 : 0;
                const missingPrice = !row.isWaste && kg > 0 && price <= 0;
                return (
                  <tr
                    key={row.uid}
                    className={`border-b hover:bg-gray-50 ${
                      row.isWaste ? "bg-amber-50/40" : ""
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="text"
                        value={row.name}
                        onChange={(e) => updateRow(row.uid, { name: e.target.value })}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="Nombre"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.kg}
                        onChange={(e) => updateRow(row.uid, { kg: e.target.value })}
                        className="w-24 border rounded px-2 py-1 text-sm font-mono text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={row.sellPricePerKg}
                        onChange={(e) =>
                          updateRow(row.uid, { sellPricePerKg: e.target.value })
                        }
                        disabled={row.isWaste}
                        className={`w-28 border rounded px-2 py-1 text-sm font-mono text-right ${
                          missingPrice ? "border-amber-400 bg-amber-50" : ""
                        } ${row.isWaste ? "bg-gray-100 text-gray-400" : ""}`}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-3 text-right font-mono">
                      {row.isWaste ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        fmtCurrency(ingreso)
                      )}
                    </td>
                    <td className="p-3 text-right font-mono text-gray-500">
                      {pctPeso > 0 ? `${pctPeso.toFixed(1)}%` : "—"}
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={row.isWaste}
                        onChange={(e) =>
                          updateRow(row.uid, {
                            isWaste: e.target.checked,
                            sellPricePerKg: e.target.checked ? "0" : row.sellPricePerKg,
                          })
                        }
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.uid)}
                        className="text-gray-400 hover:text-red-600 text-lg leading-none"
                        title="Eliminar fila"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warnings */}
      {rowsMissingPrice.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-amber-800 text-sm">
          ⚠️ {rowsMissingPrice.length} corte(s) con kg cargados pero sin precio de venta:{" "}
          {rowsMissingPrice.map((c) => c.row.name || "(sin nombre)").join(", ")}.
          El ingreso de esas filas se está computando como $0.
        </div>
      )}

      {Math.abs(totalWeightNum - registeredKg) > 0.01 && totalWeightNum > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm">
          ℹ️ Diferencia entre peso media res y kg registrados:{" "}
          <span className="font-mono">{(totalWeightNum - registeredKg).toFixed(2)} kg</span>{" "}
          (se considera merma — peso perdido en el desposte).
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
          <h2 className="font-semibold text-lg">⚖️ Reparto de la media</h2>
          <div className="space-y-1 text-sm">
            <Line label="Peso media res" value={fmtKg(totalWeightNum)} />
            <Line
              label="Kg vendibles"
              value={fmtKg(sellableKg)}
              hint={
                totalWeightNum > 0
                  ? `${((sellableKg / totalWeightNum) * 100).toFixed(1)}%`
                  : ""
              }
              accent="text-green-700"
            />
            <Line
              label="Kg desperdicio"
              value={fmtKg(wasteKg)}
              hint={
                totalWeightNum > 0
                  ? `${((wasteKg / totalWeightNum) * 100).toFixed(1)}%`
                  : ""
              }
              accent="text-amber-700"
            />
            <Line
              label="Merma (no registrada)"
              value={fmtKg(mermaKg)}
              hint={
                totalWeightNum > 0
                  ? `${((mermaKg / totalWeightNum) * 100).toFixed(1)}%`
                  : ""
              }
              accent="text-gray-500"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
          <h2 className="font-semibold text-lg">💰 Resultado económico</h2>
          <div className="space-y-1 text-sm">
            <Line label="Costo total" value={fmtCurrency(costoTotal)} accent="text-red-700" />
            <Line label="Ingreso total" value={fmtCurrency(ingresoTotal)} accent="text-green-700" />
            <div className="border-t pt-2 mt-2">
              <Line
                label="Ganancia total"
                value={fmtCurrency(ganancia)}
                accent={ganancia >= 0 ? "text-green-800 font-bold" : "text-red-800 font-bold"}
                large
              />
              <Line
                label="Ganancia / kg media res"
                value={`${fmtCurrency(gananciaPorKgMedia)}/kg`}
                accent={gananciaPorKgMedia >= 0 ? "text-green-800 font-bold" : "text-red-800 font-bold"}
                large
              />
            </div>
            <Line
              label="Margen sobre venta"
              value={`${margenSobreVenta.toFixed(1)}%`}
              accent="text-gray-700"
            />
            <Line
              label="Markup sobre costo"
              value={`${markupSobreCosto.toFixed(1)}%`}
              accent="text-gray-700"
            />
            <Line
              label="Precio promedio kg vendible"
              value={`${fmtCurrency(precioPromedioVendible)}/kg`}
              accent="text-gray-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function Line({
  label,
  value,
  hint,
  accent,
  large,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
  large?: boolean;
}) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className={`text-gray-600 ${large ? "text-base" : ""}`}>{label}</span>
      <span className={`font-mono ${large ? "text-lg" : ""} ${accent ?? "text-gray-900"}`}>
        {value}
        {hint && <span className="ml-2 text-xs text-gray-400">({hint})</span>}
      </span>
    </div>
  );
}
