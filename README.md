# Secretos De Campo - ERP Carnicería

Sistema de administración web para carnicería con lógica de desposte inteligente.
Deployable en Railway con PostgreSQL.

## Problema que resuelve

En una carnicería, **no se compra lo que se vende**. Se compra una "media res" (unidad padre) y se venden ~15 cortes diferentes (subproductos). El stock no es 1:1 — es 1:N con porcentajes variables.

## Solución: Plantillas de Rendimiento

1. **Una vez**: El usuario pesa un desposte real completo y carga los resultados
2. **El sistema**: Calcula los porcentajes y guarda la "huella digital" de ese tipo de animal
3. **Cada día**: Se ingresan las medias reses y el sistema proyecta el stock automáticamente

## Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 + Tailwind CSS |
| Backend | Next.js API Routes |
| ORM | Prisma |
| Base de datos | PostgreSQL (Railway) |
| Deploy | Railway (Dockerfile) |

## Módulos

- **Dashboard**: Resumen general, stock por corte, alertas
- **Inventario**: Ingreso de media res (proyección automática), ajustes manuales
- **Punto de Venta**: POS optimizado, búsqueda, pagos múltiples, cuentas corrientes
- **Precios**: Lista de precios, actualización masiva porcentual, márgenes
- **Proveedores**: Registro de frigoríficos, facturas, cuenta corriente

## Deploy en Railway

1. Crear proyecto en [railway.app](https://railway.app)
2. Agregar servicio **PostgreSQL** (Railway lo provisiona automáticamente)
3. Conectar este repo de GitHub
4. Railway detecta el `Dockerfile` y el `railway.toml` automáticamente
5. Configurar variable `DATABASE_URL` (Railway la conecta sola si usás el plugin de PostgreSQL)
6. Después del primer deploy, correr el seed:

```bash
# En la terminal de Railway o local:
npx prisma db push
npm run db:seed
```

## Desarrollo Local

```bash
npm install
cp .env.example .env  # Configurar DATABASE_URL
npx prisma db push    # Crear tablas
npm run db:seed       # Cargar datos de prueba
npm run dev           # http://localhost:3000
```

## Persistencia de datos

- Los datos se guardan en **PostgreSQL** (no en memoria)
- Railway mantiene la base de datos viva entre deploys
- Backups automáticos disponibles en Railway
- Cada operación (venta, ingreso, ajuste) queda registrada con fecha y auditoría
