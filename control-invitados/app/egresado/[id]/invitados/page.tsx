"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Users,
  Plus,
  CheckCircle,
  XCircle,
  QrCode,
  User,
  AlertCircle,
  ArrowLeft,
  GraduationCap,
  LogOut,
} from "lucide-react";
import Header from "@/components/Header";

type EgresadoData = {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  numero_orden: number | null;
  confirmado_asistencia: boolean;
  ceremonia_id: string;
  ceremonia_nombre: string;
  cupo_base_invitado: number;
};

type InvitadoRow = {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  es_menor_7: boolean;
  tipo_cupo: string;
  estado: string;
  qr_token: string;
};

export default function InvitadosPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [egresado, setEgresado] = useState<EgresadoData | null>(null);
  const [invitados, setInvitados] = useState<InvitadoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    dni: "",
    nombres: "",
    apellidos: "",
    es_menor_7: false,
  });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const { data: eg } = await (s
          .from("egresados") as any)
          .select("id, dni, nombres, apellidos, numero_orden, confirmado_asistencia, ceremonia_id")
          .eq("id", id)
          .single();
        if (!eg) {
          router.push("/egresado/ingreso");
          return;
        }
        const { data: cer } = await (s
          .from("ceremonias") as any)
          .select("nombre, cupo_base_invitado")
          .eq("id", eg.ceremonia_id)
          .single();
        setEgresado({
          ...eg,
          ceremonia_nombre: cer?.nombre ?? "",
          cupo_base_invitado: cer?.cupo_base_invitado ?? 3,
        });

        const { data: inv } = await (s
          .from("invitados") as any)
          .select("id, dni, nombres, apellidos, es_menor_7, tipo_cupo, estado, qr_token")
          .eq("egresado_id", id)
          .order("created_at", { ascending: true });
        setInvitados((inv ?? []) as InvitadoRow[]);
      } catch {
        router.push("/egresado/ingreso");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, router]);

  async function toggleAsistencia() {
    if (!egresado) return;
    const nuevoValor = !egresado.confirmado_asistencia;
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ confirmado_asistencia: nuevoValor })
        .eq("id", egresado.id);
      setEgresado({ ...egresado, confirmado_asistencia: nuevoValor });
    } catch {}
  }

  async function agregarInvitado() {
    setFormError("");
    const dni = formData.dni.trim();
    const nombres = formData.nombres.trim();
    const apellidos = formData.apellidos.trim();

    if (!/^\d{1,8}$/.test(dni)) {
      setFormError("El DNI debe ser numérico y tener máximo 8 dígitos.");
      return;
    }
    if (!nombres || !apellidos) {
      setFormError("Completa todos los campos.");
      return;
    }

    setFormLoading(true);
    try {
      const s = createClient();
      const aprobados = invitados.filter((i) => i.estado === "aprobado").length;
      const cupoBase = egresado?.cupo_base_invitado ?? 3;
      if (aprobados >= cupoBase) {
        setFormError(`Has alcanzado el límite máximo de ${cupoBase} invitados.`);
        setFormLoading(false);
        return;
      }

      const nuevoInvitado = {
        egresado_id: id,
        ceremonia_id: egresado!.ceremonia_id,
        dni,
        nombres,
        apellidos,
        es_menor_7: formData.es_menor_7,
        tipo_cupo: "base",
        estado: "aprobado",
      };

      const { data, error } = await (s.from("invitados") as any)
        .insert(nuevoInvitado)
        .select("id, dni, nombres, apellidos, es_menor_7, tipo_cupo, estado, qr_token")
        .single();

      if (error) {
        setFormError("Error al registrar. Verifica que el DNI no esté duplicado.");
        setFormLoading(false);
        return;
      }

      setInvitados([...invitados, data as InvitadoRow]);
      setFormData({ dni: "", nombres: "", apellidos: "", es_menor_7: false });
      setFormOpen(false);
      setFormLoading(false);
    } catch {
      setFormError("Error al registrar invitado.");
      setFormLoading(false);
    }
  }

  function handleLogout() {
    document.cookie = "egresado_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax";
    router.push("/egresado/ingreso");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
        <Header />
        <div className="pt-16 max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-10 bg-gray-200 dark:bg-slate-700 rounded-2xl w-3/4" />
            <div className="h-6 bg-gray-200 dark:bg-slate-700 rounded-2xl w-1/2" />
            <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded-2xl w-1/3" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-44 bg-gray-200 dark:bg-slate-700 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!egresado) {
    return null;
  }

  const aprobados = invitados.filter((i) => i.estado === "aprobado").length;
  const cupoBase = egresado.cupo_base_invitado;
  const pctUsado = Math.min(Math.round((aprobados / cupoBase) * 100), 100);

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-slate-950">
      <Header />

      {/* ── Content ── */}
      <div className="pt-16 max-w-4xl mx-auto px-4 py-8 flex flex-col gap-6 animate-fadeUp">
        {/* Top actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/egresado/ingreso")}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 transition-all duration-200 rounded-full"
          >
            <ArrowLeft size={16} />
            Volver
          </button>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all duration-200 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
          >
            <LogOut size={16} />
            Cerrar Sesión
          </button>
        </div>

        {/* Header Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User size={28} className="text-primary" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                  {egresado.nombres} {egresado.apellidos}
                  {egresado.numero_orden != null && (
                    <span className="text-sm font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/30 px-2.5 py-0.5 rounded-full">
                      #{egresado.numero_orden}
                    </span>
                  )}
                </h1>
                <p className="text-sm text-gray-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <GraduationCap size={16} />
                  {egresado.ceremonia_nombre}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl px-4 py-3 border border-gray-100 dark:border-slate-700">
              <span className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Confirmar asistencia
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={egresado.confirmado_asistencia}
                  onChange={toggleAsistencia}
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
              </label>
            </div>
          </div>
        </div>

        {/* Progress Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
              Pases garantizados
            </h2>
            <span className="text-lg font-bold text-primary">
              {aprobados} / {cupoBase}
            </span>
          </div>
          <div className="w-full bg-gray-100 dark:bg-slate-700 rounded-full h-3 mb-3">
            <div
              className="bg-primary h-3 rounded-full transition-all duration-500"
              style={{ width: `${pctUsado}%` }}
            />
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {aprobados < cupoBase
              ? `Has usado ${aprobados} de ${cupoBase} pases garantizados.`
              : `Has alcanzado el límite máximo de ${cupoBase} invitados.`}
          </p>
        </div>

        {/* Invitados Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mis Invitados</h2>
            {!formOpen && (
              <button
                onClick={() => setFormOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:shadow-lg hover:bg-primary/90 transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                <Plus size={18} />
                Agregar invitado
              </button>
            )}
          </div>

          {invitados.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-4">
                <Users size={32} className="text-gray-400 dark:text-slate-500" />
              </div>
              <p className="text-gray-500 dark:text-slate-400 text-sm">
                Aún no tienes invitados registrados.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {invitados.map((inv) => (
                <div
                  key={inv.id}
                  className="bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-5 flex flex-col hover:shadow-lg transition-all duration-200"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <User size={20} className="text-gray-500 dark:text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {inv.nombres} {inv.apellidos}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        DNI: {inv.dni}
                      </p>
                    </div>
                  </div>
                  {inv.es_menor_7 && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mb-3 flex items-center gap-1">
                      <AlertCircle size={12} />
                      Menor de 7 años
                    </p>
                  )}
                  <div className="mt-auto pt-3 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        inv.estado === "aprobado"
                          ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300"
                      }`}
                    >
                      {inv.estado === "aprobado" ? "Aprobado" : "Rechazado"}
                    </span>
                    {inv.estado === "aprobado" && (
                      <button
                        onClick={() =>
                          router.push(`/invitacion/${inv.qr_token}`)
                        }
                        className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <QrCode size={14} />
                        Ver invitación
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Guest Form */}
          {formOpen && (
            <div className="mt-6 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 dark:border-slate-700 p-6 max-w-lg">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                Agregar invitado
              </h3>
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1" htmlFor="inv-dni">
                    DNI
                  </label>
                  <input
                    id="inv-dni"
                    type="text"
                    inputMode="numeric"
                    placeholder="DNI del invitado"
                    value={formData.dni}
                    onChange={(e) =>
                      setFormData({ ...formData, dni: e.target.value })
                    }
                    className="w-full h-11 px-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1" htmlFor="inv-nombres">
                    Nombres
                  </label>
                  <input
                    id="inv-nombres"
                    type="text"
                    placeholder="Nombres del invitado"
                    value={formData.nombres}
                    onChange={(e) =>
                      setFormData({ ...formData, nombres: e.target.value })
                    }
                    className="w-full h-11 px-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1" htmlFor="inv-apellidos">
                    Apellidos
                  </label>
                  <input
                    id="inv-apellidos"
                    type="text"
                    placeholder="Apellidos del invitado"
                    value={formData.apellidos}
                    onChange={(e) =>
                      setFormData({ ...formData, apellidos: e.target.value })
                    }
                    className="w-full h-11 px-3 border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.es_menor_7}
                    onChange={(e) =>
                      setFormData({ ...formData, es_menor_7: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 dark:border-slate-600 text-primary focus:ring-primary/30 dark:bg-slate-700"
                  />
                  <span className="text-sm text-gray-700 dark:text-slate-300">
                    ¿Es menor de 7 años?
                  </span>
                </label>
                {formData.es_menor_7 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <AlertCircle size={12} />
                    Los menores de 7 años no ocupan cupo, pero deben estar acompañados de un adulto.
                  </p>
                )}
                {formError && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {formError}
                  </p>
                )}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setFormOpen(false);
                      setFormError("");
                    }}
                    className="flex-1 h-11 border border-gray-300 dark:border-slate-600 rounded-xl text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={agregarInvitado}
                    disabled={formLoading}
                    className="flex-1 h-11 bg-primary text-white rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                  >
                    {formLoading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
