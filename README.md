# Secretos De Campo - ERP Carnicería

Sistema de administración para carnicería con lógica de desposte inteligente.

## Problema

En una carnicería, **no se compra lo que se vende**. Se compra una "media res" (unidad padre) y se venden ~15 cortes diferentes (subproductos). El stock no es 1:1 — es 1:N con porcentajes variables.

## Solución: Plantillas de Rendimiento

1. **Una vez**: El usuario pesa un desposte real completo y carga los resultados.
2. **El sistema**: Calcula los porcentajes (% de cada corte sobre el peso total) y guarda la "huella digital" de ese tipo de animal.
3. **Cada día**: El usuario ingresa "5 medias reses de Vaquillona, 520 kg, $X". El sistema detecta el rango, busca la plantilla, y proyecta el stock de todos los cortes automáticamente.

## Stack

| Capa       | Tecnología               |
|------------|--------------------------|
| Frontend   | Next.js + Tailwind CSS   |
| Backend    | Next.js API Routes       |
| Base de datos | PostgreSQL (Supabase) |
| Lenguaje   | TypeScript               |

## Estructura

```
secretos-de-campo/
├── database/
│   ├── 001_extensions.sql    ← pgcrypto, uuid-ossp
│   ├── 002_schema.sql        ← 19 tablas con relaciones
│   ├── 003_functions.sql     ← Triggers y funciones helper
│   └── 004_seed.sql          ← Datos de prueba realistas
├── src/
│   ├── types/
│   │   └── inventory.ts      ← Tipos TypeScript del dominio
│   └── lib/
│       └── services/
│           └── inventory.service.ts  ← calculateEstimatedStock
└── README.md
```

## Setup de Base de Datos

Ejecutar los archivos SQL en orden contra PostgreSQL:

```bash
psql -d secretos_de_campo -f database/001_extensions.sql
psql -d secretos_de_campo -f database/002_schema.sql
psql -d secretos_de_campo -f database/003_functions.sql
psql -d secretos_de_campo -f database/004_seed.sql
```

O en Supabase: copiar cada archivo en el SQL Editor y ejecutar en orden.

## Uso de calculateEstimatedStock

```typescript
import { calculateEstimatedStock } from "./src/lib/services/inventory.service";

const result = await calculateEstimatedStock(db, {
  totalWeight: 520,
  categoryId: "a0000000-0000-0000-0000-000000000001", // Vaquillona
  unitCount: 5,
});

if (result.success) {
  console.log(`Plantilla: ${result.templateName}`);
  console.log(`Rango detectado: ${result.rangeName}`);
  for (const cut of result.cuts) {
    console.log(`  ${cut.cutName}: ${cut.estimatedKg} kg (${cut.percentageYield}%)`);
  }
  console.log(`Varianza: ${result.variance} kg`);
}
```

### Output esperado (520 kg Vaquillona):

```
Plantilla: Vaquillona Liviana - Desposte Estándar
Rango detectado: 80-105 kg
  Lomo: 14.56 kg (2.80%)
  Bife Ancho: 26.00 kg (5.00%)
  Bife Angosto: 21.84 kg (4.20%)
  Cuadril: 28.60 kg (5.50%)
  Peceto: 13.00 kg (2.50%)
  Asado: 75.40 kg (14.50%)
  Vacío: 23.40 kg (4.50%)
  Matambre: 18.20 kg (3.50%)
  Tapa de Asado: 15.60 kg (3.00%)
  Falda: 23.40 kg (4.50%)
  Nalga: 36.40 kg (7.00%)
  Bola de Lomo: 26.00 kg (5.00%)
  Paleta: 41.60 kg (8.00%)
  Hueso: 93.60 kg (18.00%)
  Grasa y Recortes: 62.40 kg (12.00%)
  Varianza: 0.00 kg
```

## Módulos (próximas fases)

- [ ] Inventario y Stock (proyectado vs. real, mermas, alertas)
- [ ] Precios y Costos (costo dinámico, actualización masiva)
- [ ] Punto de Venta / POS (táctil, pagos múltiples, cuentas corrientes)
- [ ] Proveedores y Gastos (facturas, cuenta corriente proveedores)
