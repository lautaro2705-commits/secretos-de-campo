# Low-Impact Improvements Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add auth with roles, PWA/mobile support, multi-branch schema prep, and Excel/PDF export to the butcher shop ERP.

**Architecture:** NextAuth v5 credentials + JWT for auth, responsive sidebar with hamburger on mobile, Branch model seeded but no UI, server-side Excel/PDF generation with download endpoints. Auth is implemented first because export visibility depends on user role.

**Tech Stack:** next-auth v5, bcryptjs, exceljs, jspdf + jspdf-autotable

---

### Task 1: Install Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Install auth + export libraries**

Run:
```bash
npm install next-auth@beta bcryptjs exceljs jspdf jspdf-autotable
npm install -D @types/bcryptjs
```

**Step 2: Verify installation**

Run: `cat package.json | grep -E "next-auth|bcrypt|exceljs|jspdf"`
Expected: All 4 packages listed.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install auth and export dependencies"
```

---

### Task 2: Add User + Branch Models to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma` (append after line 783)

**Step 1: Add enum and models at end of schema**

Append to `prisma/schema.prisma`:

```prisma
// =====================================================================
// 35. Roles
// =====================================================================

enum Role {
  ADMIN
  MANAGER
  CASHIER
}

// =====================================================================
// 36. Usuarios
// =====================================================================

model User {
  id           String   @id @default(uuid())
  username     String   @unique @db.VarChar(50)
  passwordHash String   @map("password_hash")
  name         String   @db.VarChar(100)
  role         Role     @default(CASHIER)
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("users")
}

// =====================================================================
// 37. Sucursales
// =====================================================================

model Branch {
  id        String   @id @default(uuid())
  name      String   @unique @db.VarChar(100)
  address   String?
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at") @db.Timestamptz

  @@map("branches")
}
```

**Step 2: Add branchId to Sale, DailyCashClose, GeneralStock, Expense**

In model `Sale` (line ~332), add:
```prisma
  branchId    String?  @map("branch_id")
```

In model `DailyCashClose` (line ~681), add:
```prisma
  branchId    String?  @map("branch_id")
```

In model `GeneralStock` (line ~735), add:
```prisma
  branchId    String?  @map("branch_id")
```

In model `Expense` (line ~619), add:
```prisma
  branchId    String?  @map("branch_id")
```

All nullable — non-breaking.

**Step 3: Push schema**

Run:
```bash
DATABASE_URL="postgresql://postgres:LALxozzTUMAUiyATbXPkFTIsqeOCUxwA@trolley.proxy.rlwy.net:24496/railway" npx prisma db push
```

Expected: "Your database is now in sync with your Prisma schema."

**Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat: add User, Branch models + branchId to Sale/Close/Stock/Expense"
```

---

### Task 3: Seed Admin User and Default Branch

**Files:**
- Modify: `prisma/seed.ts`

**Step 1: Add seed logic**

At the top of `prisma/seed.ts`, add import:
```typescript
import { hashSync } from "bcryptjs";
```

Add at end of main seed function (before final log):
```typescript
  // Seed admin user
  const adminExists = await prisma.user.findUnique({ where: { username: "admin" } });
  if (!adminExists) {
    await prisma.user.create({
      data: {
        username: "admin",
        passwordHash: hashSync("admin123", 10),
        name: "Administrador",
        role: "ADMIN",
      },
    });
    console.log("Created admin user (admin / admin123)");
  }

  // Seed default branch
  const branchExists = await prisma.branch.findFirst();
  if (!branchExists) {
    await prisma.branch.create({
      data: {
        name: "Casa Central",
        address: null,
      },
    });
    console.log("Created default branch: Casa Central");
  }
```

**Step 2: Run seed**

Run:
```bash
DATABASE_URL="postgresql://postgres:LALxozzTUMAUiyATbXPkFTIsqeOCUxwA@trolley.proxy.rlwy.net:24496/railway" npx tsx prisma/seed.ts
```

Expected: "Created admin user" and "Created default branch" messages.

**Step 3: Commit**

```bash
git add prisma/seed.ts
git commit -m "feat: seed admin user and default branch"
```

---

### Task 4: Configure NextAuth

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `.env` (NEXTAUTH_SECRET)

**Step 1: Generate auth secret**

Run: `openssl rand -base64 32`

Save output for NEXTAUTH_SECRET. Add to Railway env vars.

**Step 2: Create auth config `src/lib/auth.ts`**

```typescript
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.isActive) return null;

        const valid = await compare(credentials.password as string, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, name: user.name, role: user.role };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role: string }).role = token.role as string;
        (session.user as { id: string }).id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
});
```

**Step 3: Create route handler `src/app/api/auth/[...nextauth]/route.ts`**

```typescript
import { handlers } from "@/lib/auth";
export const { GET, POST } = handlers;
```

**Step 4: Create type augmentation `src/types/next-auth.d.ts`**

```typescript
import "next-auth";

declare module "next-auth" {
  interface User {
    role: string;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      role: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    id: string;
  }
}
```

**Step 5: Commit**

```bash
git add src/lib/auth.ts src/app/api/auth/ src/types/
git commit -m "feat: configure NextAuth with credentials provider"
```

---

### Task 5: Create Login Page

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/LoginForm.tsx`

**Step 1: Create server page `src/app/login/page.tsx`**

```tsx
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">🥩 Secretos De Campo</h1>
          <p className="text-gray-400 text-sm mt-1">Iniciá sesión para continuar</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
```

**Step 2: Create client form `src/app/login/LoginForm.tsx`**

```tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (res?.error) {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required autoFocus autoComplete="username"
          className="w-full border rounded-lg px-3 py-2.5 text-sm"
          placeholder="admin"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required autoComplete="current-password"
          className="w-full border rounded-lg px-3 py-2.5 text-sm"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50"
      >
        {loading ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
```

**Step 3: Login page uses its own layout (no sidebar)**

Create `src/app/login/layout.tsx`:

```tsx
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**Step 4: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page with credentials form"
```

---

### Task 6: Add Auth Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: Create middleware**

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/auth", "/api/health"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next.js internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes(".")) {
    return NextResponse.next();
  }

  // Not authenticated → redirect to login
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only API routes
  const adminOnlyApi = ["/api/reports/export", "/api/users"];
  if (adminOnlyApi.some((p) => pathname.startsWith(p))) {
    const role = req.auth.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  // Admin-only pages
  if (pathname === "/usuarios") {
    const role = req.auth.user?.role;
    if (role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add auth middleware protecting all routes"
```

---

### Task 7: Update Layout with Session + Responsive Sidebar

**Files:**
- Modify: `src/app/layout.tsx` (full rewrite)
- Create: `src/components/Sidebar.tsx`

**Step 1: Create `src/components/Sidebar.tsx`**

This is the client component that handles hamburger menu on mobile and shows user info + logout:

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Dashboard", icon: "📊" },
  { href: "/inventario", label: "Inventario", icon: "📦" },
  { href: "/desposte", label: "Desposte Real", icon: "🔪" },
  { href: "/pos", label: "Punto de Venta", icon: "🛒" },
  { href: "/ventas", label: "Ventas", icon: "🧾" },
  { href: "/precios", label: "Precios", icon: "💰" },
  { href: "/proveedores", label: "Proveedores", icon: "🚚" },
  { href: "/stock-general", label: "Stock General", icon: "🐄" },
  { href: "/caja", label: "Caja del Día", icon: "💵" },
  { href: "/clientes", label: "Clientes", icon: "👥" },
  { href: "/compras", label: "Compras", icon: "📋" },
  { href: "/reportes", label: "Reportes", icon: "📈" },
];

const adminOnlyItems = [
  { href: "/usuarios", label: "Usuarios", icon: "🔑" },
];

interface Props {
  userName: string;
  userRole: string;
}

export function Sidebar({ userName, userRole }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const allItems = userRole === "ADMIN" ? [...navItems, ...adminOnlyItems] : navItems;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed top-3 left-3 z-50 bg-brand-900 text-white p-2.5 rounded-lg shadow-lg"
        aria-label="Abrir menú"
      >
        <span className="text-xl">☰</span>
      </button>

      {/* Backdrop (mobile) */}
      {open && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 bg-brand-900 text-white flex flex-col shrink-0
        transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
      `}>
        <div className="p-6 border-b border-brand-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🥩 Secretos De Campo</h1>
            <p className="text-brand-300 text-xs mt-1">Sistema de Gestión</p>
          </div>
          <button onClick={() => setOpen(false)} className="md:hidden text-brand-300 text-xl">✕</button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {allItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                pathname === item.href
                  ? "bg-brand-700 text-white font-medium"
                  : "hover:bg-brand-800 text-brand-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-brand-800">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-brand-400 capitalize">{userRole.toLowerCase()}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-xs bg-brand-800 px-3 py-1.5 rounded hover:bg-brand-700 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
```

**Step 2: Rewrite `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/Sidebar";
import { ToastProvider } from "@/components/ToastProvider";
import { AlertBanner } from "@/components/AlertBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secretos De Campo",
  description: "Sistema de gestión para carnicería",
  manifest: "/manifest.json",
  themeColor: "#92400e",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Secretos De Campo",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const isLoginPage = !session;

  return (
    <html lang="es">
      <head>
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="min-h-screen">
        <SessionProvider session={session}>
          {isLoginPage ? (
            children
          ) : (
            <div className="flex min-h-screen">
              <Sidebar
                userName={session.user?.name || "Usuario"}
                userRole={(session.user as { role?: string })?.role || "CASHIER"}
              />
              <main className="flex-1 overflow-auto md:ml-0 pt-14 md:pt-0">
                <ToastProvider>
                  <AlertBanner />
                  {children}
                </ToastProvider>
              </main>
            </div>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
```

**Step 3: Commit**

```bash
git add src/components/Sidebar.tsx src/app/layout.tsx
git commit -m "feat: responsive sidebar with user info, hamburger menu, and session"
```

---

### Task 8: Create User Management Page (Admin Only)

**Files:**
- Create: `src/app/api/users/route.ts`
- Create: `src/app/usuarios/page.tsx`
- Create: `src/app/usuarios/UsuariosClient.tsx`

**Step 1: Create API `src/app/api/users/route.ts`**

```typescript
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { hashSync } from "bcryptjs";

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, username: true, name: true, role: true, isActive: true, createdAt: true },
    });
    return NextResponse.json(users);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { username, password, name, role } = await req.json();
    if (!username || !password || !name) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "El usuario ya existe" }, { status: 400 });
    }
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash: hashSync(password, 10),
        name,
        role: role || "CASHIER",
      },
    });
    return NextResponse.json({ id: user.id, username: user.username, name: user.name, role: user.role });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { id, name, role, isActive, password } = await req.json();
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (role !== undefined) data.role = role;
    if (isActive !== undefined) data.isActive = isActive;
    if (password) data.passwordHash = hashSync(password, 10);

    await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error" }, { status: 500 });
  }
}
```

**Step 2: Create page and client component**

Create `src/app/usuarios/page.tsx` and `src/app/usuarios/UsuariosClient.tsx` with a standard CRUD table (create user form, list with edit/deactivate buttons, role dropdown with ADMIN/MANAGER/CASHIER, optional password reset).

**Step 3: Commit**

```bash
git add src/app/api/users/ src/app/usuarios/
git commit -m "feat: add user management page (admin only)"
```

---

### Task 9: Restrict Rentabilidad Tab + Export by Role

**Files:**
- Modify: `src/app/reportes/page.tsx` (pass session role)
- Modify: `src/app/reportes/ReportesClient.tsx` (accept role prop, conditionally show)

**Step 1: Update reportes/page.tsx to pass role**

```tsx
import { auth } from "@/lib/auth";
import { ReportesClient } from "./ReportesClient";

export const dynamic = "force-dynamic";

export default async function ReportesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role || "CASHIER";

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">📈 Reportes</h1>
        <p className="text-gray-500 text-sm">Análisis de ventas, gastos y rendimiento</p>
      </div>
      <ReportesClient userRole={role} />
    </div>
  );
}
```

**Step 2: Modify ReportesClient.tsx**

- Add `userRole` to component props
- Filter tabs: exclude "rentabilidad" if role !== "ADMIN"
- Show export button only if role === "ADMIN"
- Add export dropdown + fetch logic (see Task 11)

**Step 3: Commit**

```bash
git add src/app/reportes/
git commit -m "feat: restrict rentabilidad tab and export to admin role"
```

---

### Task 10: PWA Manifest + Icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png` (generated or placeholder)
- Create: `public/icon-512.png` (generated or placeholder)

**Step 1: Create manifest.json**

```json
{
  "name": "Secretos De Campo",
  "short_name": "Secretos",
  "description": "Sistema de gestión para carnicería",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#92400e",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 2: Generate placeholder icons**

Use a simple canvas approach or download meat emoji PNG at 192x192 and 512x512.

**Step 3: Commit**

```bash
git add public/manifest.json public/icon-192.png public/icon-512.png
git commit -m "feat: add PWA manifest and icons for mobile install"
```

---

### Task 11: Export Reports API (Excel + PDF)

**Files:**
- Create: `src/app/api/reports/export/route.ts`

**Step 1: Create export endpoint**

The endpoint reuses the same query logic from `/api/reports/route.ts` but formats output as xlsx or pdf blob. Protected by middleware (admin only).

Key logic:
- Parse `format`, `from`, `to` from query params
- Query same data as existing reports API
- If format=xlsx: use ExcelJS to create workbook with sheets
- If format=pdf: use jsPDF + autoTable to create PDF
- Return blob with appropriate Content-Type and Content-Disposition headers

**Step 2: Add export UI to ReportesClient**

Add download button (visible only for ADMIN) that fetches the blob and triggers browser download.

```tsx
async function handleExport(format: "xlsx" | "pdf") {
  const res = await fetch(`/api/reports/export?format=${format}&from=${from}&to=${to}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-${from}-a-${to}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
```

**Step 3: Commit**

```bash
git add src/app/api/reports/export/ src/app/reportes/ReportesClient.tsx
git commit -m "feat: add Excel and PDF export for reports (admin only)"
```

---

### Task 12: Build, Test, and Deploy

**Step 1: Build**

Run: `npx next build`
Expected: Successful build with all routes.

**Step 2: Test auth flow**

- Navigate to any page → redirected to /login
- Login with admin/admin123 → redirected to dashboard
- All sidebar links work
- Logout → back to /login

**Step 3: Test mobile**

- Resize browser to <768px → hamburger visible, sidebar hidden
- Click hamburger → sidebar slides in
- Click link → sidebar closes, page loads

**Step 4: Test export**

- Go to /reportes, generate a report
- Click export Excel → downloads .xlsx
- Click export PDF → downloads .pdf

**Step 5: Push and deploy**

```bash
git push origin main
```

Railway auto-deploys. Set NEXTAUTH_SECRET env var in Railway dashboard.

**Step 6: Final commit if needed**

```bash
git add -A
git commit -m "fix: build fixes and final adjustments"
git push origin main
```
