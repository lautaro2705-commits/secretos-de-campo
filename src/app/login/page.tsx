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
