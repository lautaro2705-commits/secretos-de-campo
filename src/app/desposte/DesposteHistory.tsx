"use client";

import { useState } from "react";

interface YieldItem {
  id: string;
  actualKg: number;
  percentageReal: number;
  cut: { name: string };
}

interface RealYield {
  id: string;
  yieldNumber: number;
  totalWeight: number;
  appliedToTemplate: boolean;
  createdAt: string;
  category: { name: string };
  range: { label: string };
  items: YieldItem[];
}

export function DesposteHistory({ yields }: { yields: RealYield[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (yields.length === 0) {
    return <p className="text-gray-400 text-sm text-center py-6">Sin despostes registrados</p>;
  }

  return (
    <div className="space-y-3">
      {yields.map((y) => {
        const totalItems = y.items.reduce((s, i) => s + Number(i.actualKg), 0);
        const variance = Number(y.totalWeight) - totalItems;
        const isExpanded = expandedId === y.id;

        return (
          <div key={y.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpandedId(isExpanded ? null : y.id)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-left"
            >
              <div className="flex items-center gap-4 text-sm">
                <span className="font-mono font-semibold text-brand-700">#{y.yieldNumber}</span>
                <span className="text-gray-600">{y.category.name}</span>
                <span className="text-gray-400">{y.range.label}</span>
                <span className="font-mono">{Number(y.totalWeight).toFixed(1)} kg</span>
                {y.appliedToTemplate && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                    🧠 Aplicado
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-gray-400">
                  {new Date(y.createdAt).toLocaleDateString("es-AR")}
                </span>
                <span className="text-gray-300">{isExpanded ? "▲" : "▼"}</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t px-4 py-3 bg-gray-50">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {y.items.map((item) => (
                    <div key={item.id} className="bg-white rounded px-3 py-2 text-sm">
                      <p className="font-medium text-gray-700 truncate">{item.cut.name}</p>
                      <p className="font-mono text-brand-700">{Number(item.actualKg).toFixed(2)} kg</p>
                      <p className="text-xs text-gray-400 font-mono">{Number(item.percentageReal).toFixed(2)}%</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs text-gray-500 flex gap-4">
                  <span>Total cortes: {totalItems.toFixed(2)} kg</span>
                  <span className={Math.abs(variance) > 1 ? "text-amber-600" : "text-green-600"}>
                    Merma: {variance.toFixed(2)} kg ({((variance / Number(y.totalWeight)) * 100).toFixed(1)}%)
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
