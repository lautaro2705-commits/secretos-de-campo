"use client";

import { useState } from "react";
import Image from "next/image";

type Prize = {
  id: string;
  name: string;
  emoji: string;
  weight: number;
};

const PRIZES: Prize[] = [
  { id: "chorizos",   name: "2 Chorizos",     emoji: "🌭", weight: 40 },
  { id: "morcilla",   name: "1 Morcilla",     emoji: "🥩", weight: 35 },
  { id: "carbon",     name: "1 Bolsa de Carbón", emoji: "🪵", weight: 5 },
  { id: "huevos",     name: "6 Huevos",       emoji: "🥚", weight: 5 },
  { id: "provoleta",  name: "1 Provoleta",    emoji: "🧀", weight: 5 },
  { id: "yerba",      name: "1 Yerba",        emoji: "🌿", weight: 5 },
  { id: "brahma",     name: "1 Lata Brahma",  emoji: "🍺", weight: 5 },
];

const TOTAL_WEIGHT = PRIZES.reduce((s, p) => s + p.weight, 0);

function drawPrize(): Prize {
  const r = Math.random() * TOTAL_WEIGHT;
  let acc = 0;
  for (const p of PRIZES) {
    acc += p.weight;
    if (r < acc) return p;
  }
  return PRIZES[PRIZES.length - 1];
}

type HistoryEntry = { prize: Prize; at: string };

export default function SorteoPage() {
  const [spinning, setSpinning] = useState(false);
  const [current, setCurrent] = useState<Prize | null>(null);
  const [reel, setReel] = useState<Prize>(PRIZES[0]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const handleSpin = () => {
    if (spinning) return;
    setSpinning(true);
    setCurrent(null);

    const finalPrize = drawPrize();
    const totalMs = 2200;
    const startMs = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startMs;
      if (elapsed >= totalMs) {
        setReel(finalPrize);
        setCurrent(finalPrize);
        setHistory((h) => [
          { prize: finalPrize, at: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) },
          ...h,
        ].slice(0, 20));
        setSpinning(false);
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          (navigator as Navigator & { vibrate?: (p: number | number[]) => boolean }).vibrate?.([60, 40, 120]);
        }
        return;
      }
      setReel(PRIZES[Math.floor(Math.random() * PRIZES.length)]);
      const progress = elapsed / totalMs;
      const delay = 60 + progress * 220;
      setTimeout(tick, delay);
    };

    tick();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 via-white to-red-50 text-gray-900">
      <div className="max-w-md mx-auto px-4 py-6 sm:py-10">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <Image
            src="/logo-secretos.svg"
            alt="Secretos de Campo - Almacén de Carnes"
            width={200}
            height={260}
            priority
            className="w-44 sm:w-52 h-auto"
          />
        </div>

        <h1 className="text-center text-2xl sm:text-3xl font-extrabold text-[#C8102E] tracking-tight">
          Sorteo de la Carnicería
        </h1>
        <p className="text-center text-sm text-gray-600 mt-1 mb-6">
          Tocá el botón para sortear un premio.
        </p>

        {/* Reel / Result card */}
        <div
          className={`relative rounded-3xl border-4 shadow-xl bg-white overflow-hidden transition-colors ${
            current ? "border-[#C8102E]" : "border-red-200"
          }`}
        >
          <div className="flex flex-col items-center justify-center py-10 px-6">
            <div
              className={`text-8xl sm:text-9xl leading-none transition-transform duration-150 ${
                spinning ? "scale-90 animate-pulse" : "scale-100"
              }`}
            >
              {reel.emoji}
            </div>
            <div className="mt-4 min-h-[3.5rem] flex items-center justify-center text-center">
              {spinning ? (
                <span className="text-lg font-semibold text-gray-500 animate-pulse">
                  Sorteando…
                </span>
              ) : current ? (
                <div>
                  <div className="text-xs uppercase tracking-widest text-gray-500">
                    Ganaste
                  </div>
                  <div className="text-2xl font-extrabold text-[#C8102E]">
                    {current.name}
                  </div>
                </div>
              ) : (
                <span className="text-lg font-semibold text-gray-400">
                  ¡Buena suerte!
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Spin button */}
        <button
          onClick={handleSpin}
          disabled={spinning}
          className={`w-full mt-6 py-5 rounded-2xl text-white text-xl font-extrabold shadow-lg active:scale-[0.98] transition
            ${spinning
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#C8102E] hover:bg-[#a40d25]"
            }`}
        >
          {spinning ? "Girando…" : current ? "Sortear de nuevo" : "🎰 Sortear premio"}
        </button>

        {/* Prize list with probabilities */}
        <details className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm">
          <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-[#C8102E] flex items-center justify-between">
            Premios y probabilidades
            <span className="text-gray-400 text-sm">▼</span>
          </summary>
          <ul className="px-4 pb-4 divide-y divide-red-50">
            {PRIZES.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{p.emoji}</span>
                  <span className="text-sm font-medium">{p.name}</span>
                </span>
                <span className="text-sm font-semibold text-gray-600">
                  {((p.weight / TOTAL_WEIGHT) * 100).toFixed(0)}%
                </span>
              </li>
            ))}
            <li className="flex items-center justify-between py-2 text-xs text-gray-500 pt-3">
              <span>Chorizos + Morcilla</span>
              <span className="font-semibold">75%</span>
            </li>
            <li className="flex items-center justify-between py-1 text-xs text-gray-500">
              <span>Resto (5 premios)</span>
              <span className="font-semibold">25%</span>
            </li>
          </ul>
        </details>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 border-b border-red-50">
              <h2 className="font-semibold text-[#C8102E]">Últimos sorteos</h2>
              <button
                onClick={() => setHistory([])}
                className="text-xs text-gray-500 hover:text-[#C8102E]"
              >
                Limpiar
              </button>
            </div>
            <ul className="max-h-64 overflow-auto divide-y divide-red-50">
              {history.map((h, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <span className="text-lg">{h.prize.emoji}</span>
                    <span>{h.prize.name}</span>
                  </span>
                  <span className="text-xs text-gray-500">{h.at}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-center text-[11px] text-gray-400 mt-6">
          Secretos de Campo — Almacén de Carnes
        </p>
      </div>
    </div>
  );
}
