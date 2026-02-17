// =====================================================================
// SECRETOS DE CAMPO - Servicio de Inventario
// =====================================================================
// Lógica central del negocio: proyección de stock por desposte.
//
// Este servicio es agnóstico al framework — funciona con cualquier
// cliente PostgreSQL (Supabase, pg, Prisma, etc).
// =====================================================================

import type {
  CalculateStockInput,
  CalculateStockResponse,
  EstimatedCut,
} from "../../types/inventory";

// --- Interfaz del cliente de DB ---
// Permite inyectar cualquier cliente PostgreSQL.

export interface DbClient {
  query<T = Record<string, unknown>>(
    sql: string,
    params?: unknown[]
  ): Promise<{ rows: T[] }>;
}

// =====================================================================
// calculateEstimatedStock
// =====================================================================
// Dado un peso total + categoría animal, proyecta cuántos kg de cada
// corte se obtendrán usando la plantilla de rendimiento correspondiente.
//
// Flujo:
// 1. Si no se da rangeId → calcula peso promedio → busca rango
// 2. Busca la plantilla (category + range)
// 3. Aplica los % al peso total
// 4. Ajusta redondeo para que la suma coincida exactamente
// =====================================================================

export async function calculateEstimatedStock(
  db: DbClient,
  input: CalculateStockInput
): Promise<CalculateStockResponse> {
  const { totalWeight, categoryId, unitCount } = input;
  let { rangeId } = input;

  // --- Validaciones ---
  if (totalWeight <= 0) {
    return {
      success: false,
      error: "El peso total debe ser mayor a 0",
      code: "INVALID_INPUT",
    };
  }

  // --- Paso 1: Auto-detectar rango si no se provee ---
  if (!rangeId) {
    if (!unitCount || unitCount <= 0) {
      return {
        success: false,
        error:
          "Se necesita unitCount para auto-detectar el rango de peso. " +
          "Provea rangeId directamente o incluya unitCount > 0.",
        code: "MISSING_UNIT_COUNT",
      };
    }

    const avgWeight = totalWeight / unitCount;

    const rangeResult = await db.query<{ id: string }>(
      `SELECT id FROM weight_ranges
       WHERE $1 >= min_weight AND $1 <= max_weight
       LIMIT 1`,
      [avgWeight]
    );

    if (rangeResult.rows.length === 0) {
      return {
        success: false,
        error: `No se encontró rango de peso para peso promedio ${avgWeight.toFixed(2)} kg`,
        code: "RANGE_NOT_FOUND",
      };
    }

    rangeId = rangeResult.rows[0].id;
  }

  // --- Paso 2: Buscar plantilla ---
  const templateResult = await db.query<{
    id: string;
    name: string;
    category_name: string;
    range_label: string;
  }>(
    `SELECT
       yt.id,
       yt.name,
       ac.name AS category_name,
       wr.label AS range_label
     FROM yield_templates yt
     JOIN animal_categories ac ON ac.id = yt.category_id
     JOIN weight_ranges wr ON wr.id = yt.range_id
     WHERE yt.category_id = $1
       AND yt.range_id = $2
       AND yt.status = 'active'
     LIMIT 1`,
    [categoryId, rangeId]
  );

  if (templateResult.rows.length === 0) {
    return {
      success: false,
      error: `No se encontró plantilla activa para la categoría y rango indicados`,
      code: "TEMPLATE_NOT_FOUND",
    };
  }

  const template = templateResult.rows[0];

  // --- Paso 3: Obtener items de la plantilla con datos del corte ---
  const itemsResult = await db.query<{
    cut_id: string;
    cut_name: string;
    cut_category: string;
    percentage_yield: string; // NUMERIC viene como string
    is_sellable: boolean;
  }>(
    `SELECT
       yti.cut_id,
       c.name AS cut_name,
       c.cut_category,
       yti.percentage_yield,
       c.is_sellable
     FROM yield_template_items yti
     JOIN cuts c ON c.id = yti.cut_id
     WHERE yti.template_id = $1
     ORDER BY c.display_order`,
    [template.id]
  );

  if (itemsResult.rows.length === 0) {
    return {
      success: false,
      error: `La plantilla "${template.name}" no tiene cortes definidos`,
      code: "NO_TEMPLATE_ITEMS",
    };
  }

  // --- Paso 4: Calcular kg estimados por corte ---
  const cuts: EstimatedCut[] = itemsResult.rows.map((item) => {
    const pct = parseFloat(item.percentage_yield);
    const rawKg = totalWeight * (pct / 100);

    return {
      cutId: item.cut_id,
      cutName: item.cut_name,
      cutCategory: item.cut_category as EstimatedCut["cutCategory"],
      estimatedKg: Math.round(rawKg * 100) / 100, // Redondeo a 2 decimales
      percentageYield: pct,
      isSellable: item.is_sellable,
    };
  });

  // --- Paso 5: Ajuste de varianza ---
  const totalProjectedRaw = cuts.reduce((sum, c) => sum + c.estimatedKg, 0);
  const totalProjected = Math.round(totalProjectedRaw * 100) / 100;
  const variance = Math.round((totalWeight - totalProjected) * 100) / 100;

  // Estrategia de redondeo: Opción C — varianza visible.
  // No se ajusta la diferencia por redondeo. Se muestra al usuario
  // para que decida si corregir manualmente vía ajuste de inventario.

  return {
    success: true,
    templateId: template.id,
    templateName: template.name ?? "Sin nombre",
    categoryName: template.category_name,
    rangeName: template.range_label,
    totalWeight,
    cuts,
    totalProjected,
    variance,
  };
}
