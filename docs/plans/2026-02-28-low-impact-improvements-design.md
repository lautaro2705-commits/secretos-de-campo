# Mejoras de Bajo Impacto — Documento de Diseno

**Fecha**: 2026-02-28
**Proyecto**: Secretos De Campo (ERP Carniceria)
**Estado**: Aprobado

## Contexto

El ERP ya cubre el ciclo completo de negocio con 34 modelos Prisma, 12 paginas, y 20+ API routes. No tiene autenticacion, el sidebar no es responsive en mobile, y la unica forma de exportar es print del navegador.

## 4 Mejoras

### 1. Roles y Permisos (Auth)

**Stack**: NextAuth v5 + CredentialsProvider + bcrypt + JWT

**Schema**:
- Modelo `User`: id, username, passwordHash, name, role (enum ADMIN/MANAGER/CASHIER), isActive
- Seed: usuario `admin / admin123`

**Matriz de acceso simplificada**:
- CASHIER y MANAGER: ven TODO excepto utilidad, exportar, gestion de usuarios
- ADMIN: acceso completo

**Restricciones especificas (solo ADMIN)**:
- Tab "Rentabilidad" en /reportes
- Boton "Exportar" en /reportes
- Pagina /usuarios (gestion de cuentas)
- API /api/reports/export
- API /api/users

**Implementacion**:
- `/login` page con formulario
- `middleware.ts` redirige a /login si no autenticado
- Session JWT con { id, name, role }
- Layout sidebar: siempre muestra todas las rutas (cajero ve todo)
- Reportes y export: condicionan visibilidad por rol en el cliente

### 2. PWA / Mobile

**Sidebar responsive**:
- `< md` (768px): sidebar oculto, boton hamburger en top-left
- Click fuera o en link cierra sidebar
- Layout sidebar como Client Component con estado open/close

**PWA**:
- `public/manifest.json` con nombre, iconos, theme color, display: standalone
- Meta tags en layout.tsx
- Sin service worker (datos en tiempo real, no offline)

**Touch optimization**:
- Botones POS con min-h-12 (48px)
- Inputs con text-base (16px) para evitar zoom iOS

### 3. Multi-sucursal (Seed ligero)

**Schema**:
- Modelo `Branch`: id, name, address, isActive
- Campos `branchId` nullable en: Sale, DailyCashClose, GeneralStock, Expense
- Seed: "Casa Central" como branch default
- Sin UI nueva — preparacion para futuro

### 4. Exportar a Excel/PDF

**Endpoint**: `GET /api/reports/export?format=xlsx|pdf&from=...&to=...`

**Excel** (exceljs):
- Hojas: Resumen, Ventas por Dia, Metodos de Pago, Top Cortes, Top Productos
- Headers, formato moneda, auto-width columnas

**PDF** (jspdf + jspdf-autotable):
- Header con nombre del negocio y rango de fechas
- KPIs, tabla ventas diarias, tabla top cortes

**UI**:
- Boton "Exportar" en /reportes, visible solo para ADMIN
- Dropdown con Excel / PDF
- Descarga directa via blob

## Orden de Implementacion

1. Roles y permisos (base para todo lo demas)
2. PWA / Mobile (layout responsive)
3. Multi-sucursal (schema only)
4. Exportar (depende de roles para control de acceso)
