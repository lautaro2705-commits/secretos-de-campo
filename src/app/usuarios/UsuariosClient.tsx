"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  username: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "ADMIN", label: "Administrador" },
  { value: "MANAGER", label: "Encargado" },
  { value: "CASHIER", label: "Cajero" },
];

export function UsuariosClient() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState("CASHIER");

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  }

  function resetForm() {
    setFormUsername("");
    setFormPassword("");
    setFormName("");
    setFormRole("CASHIER");
    setEditingId(null);
    setShowForm(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editingId) {
      const body: Record<string, unknown> = { id: editingId, name: formName, role: formRole };
      if (formPassword) body.password = formPassword;
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formUsername,
          password: formPassword,
          name: formName,
          role: formRole,
        }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        return;
      }
    }
    resetForm();
    fetchUsers();
  }

  async function toggleActive(user: User) {
    await fetch("/api/users", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, isActive: !user.isActive }),
    });
    fetchUsers();
  }

  function startEdit(user: User) {
    setEditingId(user.id);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormRole(user.role);
    setFormPassword("");
    setShowForm(true);
  }

  if (loading) {
    return <div className="text-center text-gray-400 py-16">Cargando usuarios...</div>;
  }

  return (
    <div className="space-y-6">
      <button
        onClick={() => { resetForm(); setShowForm(true); }}
        className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
      >
        + Nuevo Usuario
      </button>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
          <h3 className="font-semibold">{editingId ? "Editar Usuario" : "Nuevo Usuario"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Usuario</label>
              <input
                type="text"
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                disabled={!!editingId}
                required={!editingId}
                className="w-full border rounded-lg px-3 py-2 text-sm disabled:bg-gray-100"
                placeholder="nombre.usuario"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                {editingId ? "Nueva Contraseña (dejar vacío para no cambiar)" : "Contraseña"}
              </label>
              <input
                type="password"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required={!editingId}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Nombre Completo</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Rol</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-brand-700"
            >
              {editingId ? "Guardar Cambios" : "Crear Usuario"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Usuario</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Nombre</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Rol</th>
              <th className="text-left px-6 py-3 font-medium text-gray-500">Estado</th>
              <th className="text-right px-6 py-3 font-medium text-gray-500">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-6 py-4 font-mono text-xs">{user.username}</td>
                <td className="px-6 py-4">{user.name}</td>
                <td className="px-6 py-4">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    user.role === "ADMIN" ? "bg-purple-100 text-purple-700" :
                    user.role === "MANAGER" ? "bg-blue-100 text-blue-700" :
                    "bg-gray-100 text-gray-700"
                  }`}>
                    {ROLES.find((r) => r.value === user.role)?.label || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-xs ${user.isActive ? "text-green-600" : "text-red-500"}`}>
                    {user.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => startEdit(user)}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(user)}
                    className={`text-xs ${user.isActive ? "text-red-500" : "text-green-600"} hover:underline`}
                  >
                    {user.isActive ? "Desactivar" : "Activar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
