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
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-64 bg-brand-900 text-white flex flex-col shrink-0
          transform transition-transform duration-200
          ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        <div className="p-6 border-b border-brand-800 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">🥩 Secretos De Campo</h1>
            <p className="text-brand-300 text-xs mt-1">Sistema de Gestión</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="md:hidden text-brand-300 text-xl"
          >
            ✕
          </button>
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
          <div className="flex items-center justify-between">
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
