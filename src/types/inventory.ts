// =====================================================================
// SECRETOS DE CAMPO - Tipos del dominio de Inventario
// =====================================================================

// --- Entidades base (reflejan las tablas SQL) ---

export interface AnimalCategory {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

export interface WeightRange {
  id: string;
  min_weight: number;
  max_weight: number;
  label: string;
}

export interface Cut {
  id: string;
  name: string;
  description: string | null;
  cut_category: "premium" | "parrilla" | "guiso" | "subproducto";
  is_sellable: boolean;
  display_order: number;
}

export interface YieldTemplate {
  id: string;
  category_id: string;
  range_id: string;
  name: string | null;
  reference_weight: number | null;
  notes: string | null;
  status: "active" | "draft" | "archived";
}

export interface YieldTemplateItem {
  id: string;
  template_id: string;
  cut_id: string;
  percentage_yield: number;
}

// --- calculateEstimatedStock ---

export interface CalculateStockInput {
  /** Peso total de la mercadería ingresada (en kg) */
  totalWeight: number;
  /** UUID de la categoría de animal */
  categoryId: string;
  /** UUID del rango de peso. Si no se provee, se auto-detecta. */
  rangeId?: string;
  /** Cantidad de medias reses. Necesario para auto-detectar el rango. */
  unitCount?: number;
}

export interface EstimatedCut {
  cutId: string;
  cutName: string;
  cutCategory: Cut["cut_category"];
  estimatedKg: number;
  percentageYield: number;
  isSellable: boolean;
}

export interface CalculateStockResult {
  success: true;
  templateId: string;
  templateName: string;
  categoryName: string;
  rangeName: string;
  totalWeight: number;
  cuts: EstimatedCut[];
  /** Suma de todos los kg estimados */
  totalProjected: number;
  /** Diferencia entre totalWeight y totalProjected (debería ser ~0) */
  variance: number;
}

export interface CalculateStockError {
  success: false;
  error: string;
  code:
    | "MISSING_UNIT_COUNT"
    | "RANGE_NOT_FOUND"
    | "TEMPLATE_NOT_FOUND"
    | "NO_TEMPLATE_ITEMS"
    | "INVALID_INPUT";
}

export type CalculateStockResponse = CalculateStockResult | CalculateStockError;

// --- Stock batch (ingreso de mercadería) ---

export interface StockBatchInput {
  entryDate: string;
  supplierId: string | null;
  categoryId: string;
  unitCount: number;
  totalWeight: number;
  totalCost: number;
  notes?: string;
}

// --- Inventory adjustment ---

export type AdjustmentReason =
  | "merma"
  | "sobrante"
  | "conteo_fisico"
  | "error_carga"
  | "otro";

export interface InventoryAdjustment {
  cutId: string;
  newQty: number;
  reason: AdjustmentReason;
  notes?: string;
  adjustedBy?: string;
}
