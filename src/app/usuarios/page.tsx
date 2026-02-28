import { UsuariosClient } from "./UsuariosClient";

export const dynamic = "force-dynamic";

export default function UsuariosPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🔑 Gestión de Usuarios</h1>
        <p className="text-gray-500 text-sm">Crear, editar y gestionar cuentas de acceso</p>
      </div>
      <UsuariosClient />
    </div>
  );
}
