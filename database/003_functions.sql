-- =====================================================================
-- SECRETOS DE CAMPO - ERP Carnicería
-- 003: Funciones y Triggers
-- =====================================================================
-- Ejecutar después de 002_schema.sql
-- =====================================================================


-- =====================================================================
-- TRIGGER: Auto-update updated_at
-- =====================================================================
-- Reutilizable en cualquier tabla que tenga columna updated_at

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a todas las tablas con updated_at
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN
        SELECT table_name FROM information_schema.columns
        WHERE column_name = 'updated_at'
          AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I
             FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at()',
            t
        );
    END LOOP;
END;
$$;


-- =====================================================================
-- FUNCTION: Validar que los % de una plantilla sumen ~100%
-- =====================================================================
-- Permite una tolerancia de ±0.5% por redondeo

CREATE OR REPLACE FUNCTION validate_template_total(p_template_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_total NUMERIC(7,2);
BEGIN
    SELECT COALESCE(SUM(percentage_yield), 0)
    INTO v_total
    FROM yield_template_items
    WHERE template_id = p_template_id;

    RETURN v_total BETWEEN 99.5 AND 100.5;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- FUNCTION: Buscar rango de peso por peso promedio
-- =====================================================================

CREATE OR REPLACE FUNCTION find_weight_range(p_avg_weight NUMERIC)
RETURNS UUID AS $$
DECLARE
    v_range_id UUID;
BEGIN
    SELECT id INTO v_range_id
    FROM weight_ranges
    WHERE p_avg_weight >= min_weight AND p_avg_weight <= max_weight
    LIMIT 1;

    RETURN v_range_id;
END;
$$ LANGUAGE plpgsql;


-- =====================================================================
-- FUNCTION: Proyectar stock de un lote
-- =====================================================================
-- Dado un batch, calcula los kg estimados por corte usando la plantilla.
-- Retorna TABLE para poder usar con INSERT INTO ... SELECT.

CREATE OR REPLACE FUNCTION project_batch_stock(p_batch_id UUID)
RETURNS TABLE (
    cut_id UUID,
    estimated_kg NUMERIC(10,2),
    percentage_used NUMERIC(5,2)
) AS $$
DECLARE
    v_template_id UUID;
    v_total_weight NUMERIC(10,2);
BEGIN
    SELECT sb.template_id, sb.total_weight
    INTO v_template_id, v_total_weight
    FROM stock_batches sb
    WHERE sb.id = p_batch_id;

    IF v_template_id IS NULL THEN
        RAISE EXCEPTION 'Lote % no tiene plantilla asignada', p_batch_id;
    END IF;

    RETURN QUERY
    SELECT
        yti.cut_id,
        ROUND(v_total_weight * (yti.percentage_yield / 100), 2) AS estimated_kg,
        yti.percentage_yield AS percentage_used
    FROM yield_template_items yti
    WHERE yti.template_id = v_template_id;
END;
$$ LANGUAGE plpgsql;
