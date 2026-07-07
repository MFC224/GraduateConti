"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";

function normalize(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

type EgresadoConCeremonia = {
  id: string;
  nombres: string;
  apellidos: string;
  ceremonia_id: string;
  ceremonia_nombre: string;
};

export default function EgresadoIngresoPage() {
  const router = useRouter();
  const [dni, setDni] = useState("");
  const [nombres, setNombres] = useState("");
  const [apellidos, setApellidos] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [multiCeremonia, setMultiCeremonia] = useState<EgresadoConCeremonia[] | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMultiCeremonia(null);

    const dniTrimmed = dni.trim();
    const nombresTrimmed = nombres.trim();
    const apellidosTrimmed = apellidos.trim();

    if (!/^\d{1,8}$/.test(dniTrimmed)) {
      setError("El DNI debe ser numérico y tener máximo 8 dígitos.");
      return;
    }
    if (!nombresTrimmed) {
      setError("Ingresa tus nombres.");
      return;
    }
    if (!apellidosTrimmed) {
      setError("Ingresa tus apellidos.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data: resultados, error: supabaseError } = await supabase
        .from("egresados")
        .select("id, nombres, apellidos, ceremonia_id")
        .eq("dni", dniTrimmed);

      if (supabaseError) throw supabaseError;

      const rows = (resultados ?? []) as {
        id: string;
        nombres: string;
        apellidos: string;
        ceremonia_id: string;
      }[];

      const coinciden = rows.filter(
        (e) =>
          normalize(e.nombres) === normalize(nombresTrimmed) &&
          normalize(e.apellidos) === normalize(apellidosTrimmed)
      );

      if (coinciden.length === 0) {
        setError(
          "No encontramos tus datos. Verifica que DNI, nombres y apellidos estén escritos correctamente o consulta con Grados y Títulos."
        );
        setLoading(false);
        return;
      }

      if (coinciden.length === 1) {
        setCookie("egresado_session", coinciden[0].id, 1);
        router.push(`/egresado/${coinciden[0].id}/invitados`);
        return;
      }

      if (coinciden.length > 1) {
        const ceremoniaIds = coinciden.map((e) => e.ceremonia_id);
        const { data: ceremonias } = await (supabase.from("ceremonias") as any)
          .select("id, nombre")
          .in("id", ceremoniaIds);
        const ceremoniaMap = Object.fromEntries(
          (ceremonias ?? []).map((c: { id: string; nombre: string }) => [c.id, c.nombre])
        );
        setMultiCeremonia(
          coinciden.map((e) => ({
            id: e.id,
            nombres: e.nombres,
            apellidos: e.apellidos,
            ceremonia_id: e.ceremonia_id,
            ceremonia_nombre: ceremoniaMap[e.ceremonia_id] ?? "Ceremonia",
          }))
        );
        setLoading(false);
        return;
      }
    } catch {
      setError("Ocurrió un error al buscar tus datos. Intenta nuevamente.");
      setLoading(false);
    }
  }

  function seleccionarCeremonia(egresado: EgresadoConCeremonia) {
    setCookie("egresado_session", egresado.id, 1);
    router.push(`/egresado/${egresado.id}/invitados`);
  }

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Header />
      <div className="pt-16 max-w-md mx-auto px-4 py-8 animate-fadeUp">
        <header className="mb-8 text-center">
          <h1 className="text-2xl md:text-4xl font-bold text-primary mb-2">
            Graduation Portal
          </h1>
          <p className="text-base text-gray-500 dark:text-slate-400">
            Ingresa tus datos para registrar a tus invitados
          </p>
        </header>

        {multiCeremonia ? (
          <div className="space-y-4 bg-white dark:bg-slate-800 p-6 md:p-8 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
              Selecciona tu ceremonia
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 text-center">
              Encontramos {multiCeremonia.length} ceremonias con tus datos.
            </p>
            <div className="flex flex-col gap-3">
              {multiCeremonia.map((eg) => (
                <button
                  key={eg.id}
                  onClick={() => seleccionarCeremonia(eg)}
                  className="w-full p-4 border border-gray-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 hover:bg-gray-50 dark:hover:bg-slate-600 transition-all duration-200 text-left"
                >
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">
                    {eg.ceremonia_nombre}
                  </span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setMultiCeremonia(null)}
              className="w-full h-12 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200"
            >
              Volver
            </button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-5 bg-white dark:bg-slate-800 p-6 md:p-8 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5" htmlFor="dni">
                DNI
              </label>
              <input
                id="dni"
                name="dni"
                type="text"
                inputMode="numeric"
                placeholder="Ingresa tu DNI"
                required
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow duration-200"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5" htmlFor="nombres">
                Nombres
              </label>
              <input
                id="nombres"
                name="nombres"
                type="text"
                placeholder="Tus nombres"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow duration-200"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5" htmlFor="apellidos">
                Apellidos
              </label>
              <input
                id="apellidos"
                name="apellidos"
                type="text"
                placeholder="Tus apellidos"
                required
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                className="w-full h-12 px-4 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow duration-200"
                autoComplete="off"
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
              {loading ? "Buscando..." : "Ingresar"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <a
            className="text-sm text-gray-400 dark:text-slate-500 hover:text-primary dark:hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            ¿Necesitas ayuda?
          </a>
        </div>
      </div>
    </main>
  );
}
