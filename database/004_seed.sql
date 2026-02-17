-- =====================================================================
-- SECRETOS DE CAMPO - ERP Carnicería
-- 004: Datos de Prueba (Seed Data)
-- =====================================================================
-- Ejecutar después de 003_functions.sql
-- UUIDs fijos para poder referenciar entre tablas en los seeds.
-- =====================================================================

BEGIN;

-- =====================================================================
-- CATEGORÍAS DE ANIMAL
-- =====================================================================

INSERT INTO animal_categories (id, name, description) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Vaquillona', 'Hembra joven, carne tierna y sabrosa. La más común en carnicerías.'),
    ('a0000000-0000-0000-0000-000000000002', 'Novillo', 'Macho castrado joven. Carne tierna, buen rendimiento.'),
    ('a0000000-0000-0000-0000-000000000003', 'Overo', 'Animal con manchas. Generalmente carne de menor categoría.');


-- =====================================================================
-- RANGOS DE PESO (media res, en kg)
-- =====================================================================

INSERT INTO weight_ranges (id, min_weight, max_weight, label) VALUES
    ('b0000000-0000-0000-0000-000000000001', 80.00, 105.00, '80-105 kg'),
    ('b0000000-0000-0000-0000-000000000002', 106.00, 115.00, '106-115 kg'),
    ('b0000000-0000-0000-0000-000000000003', 116.00, 140.00, '116-140 kg');


-- =====================================================================
-- CORTES (15 cortes argentinos típicos)
-- =====================================================================
-- cut_category: premium | parrilla | guiso | subproducto

INSERT INTO cuts (id, name, description, cut_category, is_sellable, display_order) VALUES
    -- Premium
    ('c0000000-0000-0000-0000-000000000001', 'Lomo',           'Corte premium, muy tierno',          'premium',     true,  1),
    ('c0000000-0000-0000-0000-000000000002', 'Bife Ancho',     'Ojo de bife con hueso',              'premium',     true,  2),
    ('c0000000-0000-0000-0000-000000000003', 'Bife Angosto',   'Corte fino para parrilla',           'premium',     true,  3),
    ('c0000000-0000-0000-0000-000000000004', 'Cuadril',        'Corte magro y versátil',             'premium',     true,  4),
    ('c0000000-0000-0000-0000-000000000005', 'Peceto',         'Ideal para horno, muy magro',        'premium',     true,  5),

    -- Parrilla
    ('c0000000-0000-0000-0000-000000000006', 'Asado',          'Tira de asado, el clásico argentino', 'parrilla',   true,  6),
    ('c0000000-0000-0000-0000-000000000007', 'Vacío',          'Con grasa superficial, muy sabroso',  'parrilla',   true,  7),
    ('c0000000-0000-0000-0000-000000000008', 'Matambre',       'Lámina de carne sobre costillas',     'parrilla',   true,  8),
    ('c0000000-0000-0000-0000-000000000009', 'Tapa de Asado',  'Cubre las costillas, jugosa',         'parrilla',   true,  9),
    ('c0000000-0000-0000-0000-000000000010', 'Falda',          'Corte con grasa, ideal parrilla',     'parrilla',   true, 10),

    -- Guiso / Milanesa
    ('c0000000-0000-0000-0000-000000000011', 'Nalga',          'Para milanesas y bifes',              'guiso',      true, 11),
    ('c0000000-0000-0000-0000-000000000012', 'Bola de Lomo',   'Para milanesas, tierna',              'guiso',      true, 12),
    ('c0000000-0000-0000-0000-000000000013', 'Paleta',         'Corte económico, para guiso/horno',   'guiso',      true, 13),

    -- Subproductos (no vendibles como corte)
    ('c0000000-0000-0000-0000-000000000014', 'Hueso',          'Huesos varios del desposte',          'subproducto', false, 14),
    ('c0000000-0000-0000-0000-000000000015', 'Grasa y Recortes', 'Grasa, nervios y recortes',         'subproducto', false, 15);


-- =====================================================================
-- PLANTILLA DE RENDIMIENTO: Vaquillona 80-105kg
-- =====================================================================
-- Basada en un desposte de referencia de una media res de 100kg.
-- Los porcentajes suman exactamente 100%.

INSERT INTO yield_templates (id, category_id, range_id, name, reference_weight, notes, status) VALUES
    ('d0000000-0000-0000-0000-000000000001',
     'a0000000-0000-0000-0000-000000000001',  -- Vaquillona
     'b0000000-0000-0000-0000-000000000001',  -- 80-105 kg
     'Vaquillona Liviana - Desposte Estándar',
     100.00,
     'Plantilla base creada con desposte real del 15/02/2026. Vaquillona de 100kg, frigorífico Don Pedro.',
     'active');

INSERT INTO yield_template_items (template_id, cut_id, percentage_yield) VALUES
    -- Premium: 20.0% total
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001',  2.80),  -- Lomo
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',  5.00),  -- Bife Ancho
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',  4.20),  -- Bife Angosto
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',  5.50),  -- Cuadril
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',  2.50),  -- Peceto

    -- Parrilla: 30.0% total
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 14.50),  -- Asado
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007',  4.50),  -- Vacío
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008',  3.50),  -- Matambre
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009',  3.00),  -- Tapa de Asado
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010',  4.50),  -- Falda

    -- Guiso/Milanesa: 20.0% total
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011',  7.00),  -- Nalga
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000012',  5.00),  -- Bola de Lomo
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000013',  8.00),  -- Paleta

    -- Subproductos: 30.0% total
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000014', 18.00),  -- Hueso
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000015', 12.00);  -- Grasa y Recortes

-- Verificar que suma 100%:
-- 2.80 + 5.00 + 4.20 + 5.50 + 2.50 = 20.00 (premium)
-- 14.50 + 4.50 + 3.50 + 3.00 + 4.50 = 30.00 (parrilla)
-- 7.00 + 5.00 + 8.00              = 20.00 (guiso)
-- 18.00 + 12.00                    = 30.00 (subproducto)
-- TOTAL                            = 100.00 ✓


-- =====================================================================
-- PROVEEDORES
-- =====================================================================

INSERT INTO suppliers (id, name, razon_social, cuit, phone, email, address) VALUES
    ('e0000000-0000-0000-0000-000000000001',
     'Frigorífico Don Pedro',
     'Don Pedro S.A.',
     '30-71234567-0',
     '011-4555-1234',
     'ventas@donpedro.com.ar',
     'Ruta 3 Km 45, Cañuelas, Buenos Aires'),
    ('e0000000-0000-0000-0000-000000000002',
     'Frigorífico La Pampa',
     'La Pampa Carnes S.R.L.',
     '30-71234568-0',
     '011-4555-5678',
     'pedidos@lapampacarnes.com.ar',
     'Parque Industrial, General Pico, La Pampa');


-- =====================================================================
-- CLIENTES (para Cuentas Corrientes)
-- =====================================================================

INSERT INTO customers (id, name, phone, dni, credit_limit) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Juan Pérez',    '11-2345-6789', '28.456.789', 50000.00),
    ('f0000000-0000-0000-0000-000000000002', 'María García',  '11-3456-7890', '32.567.890', 30000.00),
    ('f0000000-0000-0000-0000-000000000003', 'Carlos López',  '11-4567-8901', '25.678.901', 75000.00);


-- =====================================================================
-- MÉTODOS DE PAGO
-- =====================================================================

INSERT INTO payment_methods (id, name, surcharge_percentage) VALUES
    ('g0000000-0000-0000-0000-000000000001', 'Efectivo',     0.00),
    ('g0000000-0000-0000-0000-000000000002', 'Débito',       0.00),
    ('g0000000-0000-0000-0000-000000000003', 'MercadoPago',  3.50),
    ('g0000000-0000-0000-0000-000000000004', 'Crédito',      8.00);


-- =====================================================================
-- LISTA DE PRECIOS (con precios realistas en ARS)
-- =====================================================================

INSERT INTO price_lists (id, name, description, is_active, valid_from) VALUES
    ('h0000000-0000-0000-0000-000000000001',
     'Lista General Febrero 2026',
     'Precios vigentes para mostrador',
     true,
     '2026-02-01');

-- Precios por kg (ARS estimados febrero 2026)
-- cost_per_kg se basa en: costo media res / rendimiento del corte
-- Ejemplo: Si la media res cuesta $3500/kg y el lomo es 2.8% del peso,
-- ese lomo es proporcionalmente más caro por su escasez.
INSERT INTO prices (price_list_id, cut_id, cost_per_kg, sell_price_per_kg) VALUES
    -- Premium (alto valor, bajo rendimiento → mayor precio)
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 12500.00, 18500.00),  -- Lomo
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002',  8500.00, 12900.00),  -- Bife Ancho
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003',  9000.00, 13500.00),  -- Bife Angosto
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004',  7500.00, 11200.00),  -- Cuadril
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005',  8000.00, 12000.00),  -- Peceto

    -- Parrilla (volumen medio, precio medio)
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006',  4500.00,  6900.00),  -- Asado
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007',  6500.00,  9800.00),  -- Vacío
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000008',  5500.00,  8200.00),  -- Matambre
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000009',  4000.00,  5900.00),  -- Tapa de Asado
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000010',  3000.00,  4500.00),  -- Falda

    -- Guiso/Milanesa (alto volumen, precio accesible)
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000011',  5000.00,  7500.00),  -- Nalga
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000012',  5500.00,  8000.00),  -- Bola de Lomo
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000013',  3500.00,  5200.00),  -- Paleta

    -- Subproductos
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000014',   500.00,   800.00),  -- Hueso
    ('h0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000015',   300.00,   500.00);  -- Grasa


-- =====================================================================
-- INVENTARIO INICIAL (todos los cortes en 0 kg)
-- =====================================================================

INSERT INTO inventory (cut_id, current_qty, min_stock_alert)
SELECT id, 0, CASE
    WHEN cut_category = 'premium' THEN 3.00
    WHEN cut_category = 'parrilla' THEN 5.00
    WHEN cut_category = 'guiso' THEN 5.00
    ELSE 0
END
FROM cuts;


COMMIT;
