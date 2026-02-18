import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Secretos De Campo",
  description: "Sistema de gestión para carnicería",
};

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
  { href: "/reportes", label: "Reportes", icon: "📈" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-64 bg-brand-900 text-white flex flex-col shrink-0">
            <div className="p-6 border-b border-brand-800">
              <h1 className="text-xl font-bold">🥩 Secretos De Campo</h1>
              <p className="text-brand-300 text-xs mt-1">Sistema de Gestión</p>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm hover:bg-brand-800 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-brand-800 text-xs text-brand-400">
              v1.0 — Datos persistentes en PostgreSQL
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
