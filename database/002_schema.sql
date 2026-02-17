-- =====================================================================
-- SECRETOS DE CAMPO - ERP Carnicería
-- 002: Schema Principal
-- =====================================================================
-- Ejecutar después de 001_extensions.sql
-- Todas las tablas usan UUID PKs, TIMESTAMPTZ, y NUMERIC(12,2)
-- =====================================================================


-- =====================================================================
-- 1. CATEGORÍAS DE ANIMAL
-- =====================================================================

CREATE TABLE animal_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_animal_categories_active ON animal_categories(is_active) WHERE is_active = true;


-- =====================================================================
-- 2. RANGOS DE PESO (por media res)
-- =====================================================================

CREATE TABLE weight_ranges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    min_weight NUMERIC(8,2) NOT NULL CHECK (min_weight > 0),
    max_weight NUMERIC(8,2) NOT NULL CHECK (max_weight > 0),
    label VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_weight_range CHECK (max_weight > min_weight)
);


-- =====================================================================
-- 3. CORTES
-- =====================================================================

CREATE TABLE cuts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    cut_category VARCHAR(50) CHECK (cut_category IN ('premium', 'parrilla', 'guiso', 'subproducto')),
    is_sellable BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cuts_sellable ON cuts(is_sellable) WHERE is_sellable = true;
CREATE INDEX idx_cuts_active ON cuts(is_active) WHERE is_active = true;


-- =====================================================================
-- 4. PLANTILLAS DE RENDIMIENTO (Yield Templates)
-- =====================================================================
-- Cada plantilla = combinación única de categoría animal + rango de peso.
-- Representa un desposte real hecho una vez, del cual se extraen los %.

CREATE TABLE yield_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category_id UUID NOT NULL REFERENCES animal_categories(id) ON DELETE RESTRICT,
    range_id UUID NOT NULL REFERENCES weight_ranges(id) ON DELETE RESTRICT,
    name VARCHAR(200),
    reference_weight NUMERIC(8,2),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'draft', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_template_category_range UNIQUE (category_id, range_id)
);

CREATE INDEX idx_yield_templates_status ON yield_templates(status) WHERE status = 'active';


-- =====================================================================
-- 5. ITEMS DE PLANTILLA (La Fórmula)
-- =====================================================================
-- Cada fila = "de esta plantilla, el corte X representa Y% del peso total"

CREATE TABLE yield_template_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    template_id UUID NOT NULL REFERENCES yield_templates(id) ON DELETE CASCADE,
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
    percentage_yield NUMERIC(5,2) NOT NULL CHECK (percentage_yield > 0 AND percentage_yield <= 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_template_cut UNIQUE (template_id, cut_id)
);

CREATE INDEX idx_template_items_template ON yield_template_items(template_id);


-- =====================================================================
-- 6. PROVEEDORES
-- =====================================================================

CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    razon_social VARCHAR(200),
    cuit VARCHAR(13) UNIQUE,
    phone VARCHAR(50),
    email VARCHAR(200),
    address TEXT,
    notes TEXT,
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_suppliers_active ON suppliers(is_active) WHERE is_active = true;


-- =====================================================================
-- 7. CLIENTES (Cuentas Corrientes)
-- =====================================================================

CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(200),
    address TEXT,
    dni VARCHAR(20),
    notes TEXT,
    credit_limit NUMERIC(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
    balance NUMERIC(12,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customers_active ON customers(is_active) WHERE is_active = true;


-- =====================================================================
-- 8. LOTES DE STOCK (Ingresos de Media Res)
-- =====================================================================
-- Cada fila = una entrada de mercadería (ej: "5 medias reses de Vaquillona")

CREATE TABLE stock_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES animal_categories(id) ON DELETE RESTRICT,
    range_id UUID NOT NULL REFERENCES weight_ranges(id) ON DELETE RESTRICT,
    template_id UUID REFERENCES yield_templates(id) ON DELETE SET NULL,
    unit_count INTEGER NOT NULL CHECK (unit_count > 0),
    total_weight NUMERIC(10,2) NOT NULL CHECK (total_weight > 0),
    total_cost NUMERIC(12,2) NOT NULL CHECK (total_cost >= 0),
    cost_per_kg NUMERIC(12,2) GENERATED ALWAYS AS (total_cost / NULLIF(total_weight, 0)) STORED,
    avg_weight_per_unit NUMERIC(8,2) GENERATED ALWAYS AS (total_weight / NULLIF(unit_count, 0)) STORED,
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'projected' CHECK (status IN ('projected', 'confirmed', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stock_batches_date ON stock_batches(entry_date DESC);
CREATE INDEX idx_stock_batches_supplier ON stock_batches(supplier_id);
CREATE INDEX idx_stock_batches_status ON stock_batches(status) WHERE status != 'cancelled';


-- =====================================================================
-- 9. PROYECCIONES DE LOTE (Cortes estimados por lote)
-- =====================================================================
-- Generada automáticamente al ingresar un lote usando la plantilla.

CREATE TABLE stock_batch_projections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    batch_id UUID NOT NULL REFERENCES stock_batches(id) ON DELETE CASCADE,
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
    estimated_kg NUMERIC(10,2) NOT NULL CHECK (estimated_kg >= 0),
    percentage_used NUMERIC(5,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_batch_cut UNIQUE (batch_id, cut_id)
);

CREATE INDEX idx_batch_projections_batch ON stock_batch_projections(batch_id);


-- =====================================================================
-- 10. INVENTARIO (Stock actual por corte)
-- =====================================================================
-- Fuente de verdad única. Se actualiza con cada ingreso, venta o ajuste.

CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT UNIQUE,
    current_qty NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (current_qty >= 0),
    min_stock_alert NUMERIC(10,2) DEFAULT 0 CHECK (min_stock_alert >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_inventory_low_stock ON inventory(current_qty)
    WHERE current_qty <= min_stock_alert;


-- =====================================================================
-- 11. AJUSTES DE INVENTARIO (Auditoría)
-- =====================================================================
-- Cada corrección manual queda registrada con motivo.

CREATE TABLE inventory_adjustments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
    previous_qty NUMERIC(10,2) NOT NULL,
    new_qty NUMERIC(10,2) NOT NULL CHECK (new_qty >= 0),
    difference NUMERIC(10,2) GENERATED ALWAYS AS (new_qty - previous_qty) STORED,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('merma', 'sobrante', 'conteo_fisico', 'error_carga', 'otro')),
    notes TEXT,
    adjusted_by VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_adjustments_cut ON inventory_adjustments(cut_id);
CREATE INDEX idx_adjustments_date ON inventory_adjustments(created_at DESC);


-- =====================================================================
-- 12. LISTAS DE PRECIOS
-- =====================================================================

CREATE TABLE price_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 13. PRECIOS (por corte)
-- =====================================================================

CREATE TABLE prices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    price_list_id UUID NOT NULL REFERENCES price_lists(id) ON DELETE CASCADE,
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
    cost_per_kg NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (cost_per_kg >= 0),
    sell_price_per_kg NUMERIC(12,2) NOT NULL CHECK (sell_price_per_kg >= 0),
    margin_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
        CASE WHEN cost_per_kg > 0
            THEN ((sell_price_per_kg - cost_per_kg) / cost_per_kg) * 100
            ELSE 0
        END
    ) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pricelist_cut UNIQUE (price_list_id, cut_id)
);

CREATE INDEX idx_prices_list ON prices(price_list_id);
CREATE INDEX idx_prices_cut ON prices(cut_id);


-- =====================================================================
-- 14. MÉTODOS DE PAGO
-- =====================================================================

CREATE TABLE payment_methods (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    surcharge_percentage NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (surcharge_percentage >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =====================================================================
-- 15. VENTAS (POS)
-- =====================================================================

CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number SERIAL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    sale_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    surcharge_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (surcharge_amount >= 0),
    total NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled', 'cuenta_corriente')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sales_date ON sales(sale_date DESC);
CREATE INDEX idx_sales_customer ON sales(customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX idx_sales_status ON sales(status);


-- =====================================================================
-- 16. ITEMS DE VENTA
-- =====================================================================

CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    cut_id UUID NOT NULL REFERENCES cuts(id) ON DELETE RESTRICT,
    quantity_kg NUMERIC(10,2) NOT NULL CHECK (quantity_kg > 0),
    price_per_kg NUMERIC(12,2) NOT NULL CHECK (price_per_kg >= 0),
    line_total NUMERIC(12,2) GENERATED ALWAYS AS (quantity_kg * price_per_kg) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_cut ON sale_items(cut_id);


-- =====================================================================
-- 17. PAGOS DE VENTA (múltiples métodos por venta)
-- =====================================================================

CREATE TABLE sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    reference VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sale_payments_sale ON sale_payments(sale_id);


-- =====================================================================
-- 18. FACTURAS DE PROVEEDORES
-- =====================================================================

CREATE TABLE supplier_invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
    invoice_number VARCHAR(100),
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
    paid_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
    remaining NUMERIC(12,2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'cancelled')),
    notes TEXT,
    batch_id UUID REFERENCES stock_batches(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_invoices_supplier ON supplier_invoices(supplier_id);
CREATE INDEX idx_supplier_invoices_status ON supplier_invoices(status) WHERE status != 'paid';


-- =====================================================================
-- 19. PAGOS A PROVEEDORES
-- =====================================================================

CREATE TABLE supplier_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES supplier_invoices(id) ON DELETE RESTRICT,
    payment_method_id UUID NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference VARCHAR(200),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_supplier_payments_invoice ON supplier_payments(invoice_id);
