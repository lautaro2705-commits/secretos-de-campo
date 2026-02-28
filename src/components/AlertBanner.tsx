import { prisma } from "@/lib/prisma";

interface Alert {
  type: "warning" | "info" | "critical";
  message: string;
}

export async function AlertBanner() {
  const alerts: Alert[] = [];

  try {
    // 1. Tropas casi agotadas (< 10% restante)
    const activeTropas = await prisma.generalStock.findMany({
      where: { status: "active" },
    });
    for (const t of activeTropas) {
      const remaining = Number(t.sellableKg) - Number(t.soldKg);
      if (remaining <= 0) continue;
      const pct = Number(t.sellableKg) > 0 ? (remaining / Number(t.sellableKg)) * 100 : 0;
      if (pct < 10) {
        alerts.push({
          type: "warning",
          message: `Tropa "${t.batchDescription}" casi agotada (${remaining.toFixed(1)} kg, ${pct.toFixed(0)}%)`,
        });
      }
    }

    // 2. Inventario bajo (currentQty < minStockAlert)
    const inventoryItems = await prisma.inventory.findMany({
      where: { minStockAlert: { gt: 0 } },
      include: { cut: { select: { name: true } } },
    });
    const lowStock = inventoryItems.filter(
      (i) => Number(i.currentQty) < Number(i.minStockAlert)
    );
    if (lowStock.length > 0) {
      alerts.push({
        type: "warning",
        message: `${lowStock.length} corte${lowStock.length > 1 ? "s" : ""} con stock bajo: ${lowStock.slice(0, 3).map((i) => i.cut.name).join(", ")}${lowStock.length > 3 ? "..." : ""}`,
      });
    }

    // 3. Cierre de caja pendiente (después de las 15:00 hora Argentina, UTC-3)
    const now = new Date();
    const argHour = now.getUTCHours() - 3;
    if (argHour >= 15 || argHour < 0) {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayClose = await prisma.dailyCashClose.findUnique({
        where: { closeDate: today },
      });
      if (!todayClose) {
        alerts.push({
          type: "info",
          message: "Cierre de caja pendiente para hoy",
        });
      }
    }

    // 4. Stock general bajo (< 3 días basado en consumo promedio)
    const totalRemaining = activeTropas.reduce(
      (s, t) => s + Number(t.sellableKg) - Number(t.soldKg),
      0
    );
    if (totalRemaining > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentDeductions = await prisma.generalStockDeduction.findMany({
        where: { deductionDate: { gte: sevenDaysAgo } },
      });
      if (recentDeductions.length > 0) {
        const uniqueDays = new Set(
          recentDeductions.map((d) => d.deductionDate.toISOString().slice(0, 10))
        );
        const totalDeducted = recentDeductions.reduce(
          (s, d) => s + Number(d.deductedKg),
          0
        );
        const avgDaily = uniqueDays.size > 0 ? totalDeducted / uniqueDays.size : 0;
        const daysLeft = avgDaily > 0 ? totalRemaining / avgDaily : Infinity;
        if (daysLeft < 3) {
          alerts.push({
            type: "critical",
            message: `Stock general para ~${Math.round(daysLeft)} día${Math.round(daysLeft) !== 1 ? "s" : ""}. Considerar hacer pedido.`,
          });
        }
      }
    }
  } catch {
    // Don't break the layout if alerts fail
  }

  if (alerts.length === 0) return null;

  const bgColors = {
    critical: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-700",
  };
  const icons = { critical: "🔴", warning: "⚠️", info: "ℹ️" };

  // Show the most critical alert type
  const hasCritical = alerts.some((a) => a.type === "critical");
  const hasWarning = alerts.some((a) => a.type === "warning");
  const bannerType = hasCritical ? "critical" : hasWarning ? "warning" : "info";

  return (
    <div className={`mx-8 mt-4 border rounded-lg px-4 py-3 text-sm ${bgColors[bannerType]}`}>
      <div className="flex items-start gap-2">
        <span className="text-base mt-0.5">{icons[bannerType]}</span>
        <div className="flex-1">
          {alerts.map((alert, i) => (
            <p key={i} className={i > 0 ? "mt-1" : ""}>
              {alert.message}
            </p>
          ))}
        </div>
        <span className="text-xs opacity-60 whitespace-nowrap">
          {alerts.length} alerta{alerts.length > 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
