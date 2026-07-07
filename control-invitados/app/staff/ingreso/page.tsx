"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";

export default function StaffIngresoPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const emailTrimmed = email.trim();
    if (!emailTrimmed) {
      setError("Ingresa tu correo electrónico.");
      return;
    }
    if (!password) {
      setError("Ingresa tu contraseña.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email: emailTrimmed,
          password,
        });

      if (authError) {
        if (authError.message === "Invalid login credentials") {
          setError("Correo o contraseña incorrectos.");
        } else {
          setError(authError.message);
        }
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setError("Error al obtener tus datos.");
        return;
      }

      const { data: usuario, error: userError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();

      if (userError || !usuario) {
        setError("No tienes acceso al sistema. Contacta al administrador.");
        return;
      }

      const u = usuario as { rol: "admin_general" | "encargado" | "operario" };

      const rutas: Record<string, string> = {
        admin_general: "/panel/admin",
        encargado: "/panel/encargado",
        operario: "/panel/operario",
      };

      router.refresh();
      router.push(rutas[u.rol] ?? "/");
    } catch {
      setError("Ocurrió un error. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Header />
      <div className="pt-16 max-w-md mx-auto px-4 py-8 animate-fadeUp">
        <header className="mb-8 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2 dark:text-primary-fixed-dim">
            Portal del Staff
          </h1>
          <p className="text-base text-gray-500 dark:text-slate-400">
            Inicia sesión para gestionar las ceremonias
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 bg-white dark:bg-slate-900 p-6 md:p-8 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="tucorreo@universidad.edu.pe"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow duration-200"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Tu contraseña"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow duration-200"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <a
            className="text-sm text-gray-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary-fixed-dim transition-colors duration-200"
            href="/egresado/ingreso"
          >
            ¿Eres egresado? Ingresa aquí
          </a>
        </div>
      </div>
    </main>
  );
}
