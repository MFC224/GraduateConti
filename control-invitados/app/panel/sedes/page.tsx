"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { crearSede, toggleSede } from "@/app/actions/sedes";

export default function SedesPage() {
  const router = useRouter();
  const [sedes, setSedes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({ nombre: "", ciudad: "", direccion: "" });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();

        const { data: { session } } = await s.auth.getSession();
        if (session?.user?.id) {
          const { data: userData } = await (s.from("usuarios") as any)
            .select("rol")
            .eq("id", session.user.id)
            .single();
          if (userData?.rol !== "admin_general") {
            router.replace("/panel/admin");
            return;
          }
          setCurrentUserRol(userData.rol);
        } else {
          router.replace("/staff/ingreso");
          return;
        }

        const { data } = await (s.from("sedes") as any)
          .select("*")
          .order("nombre", { ascending: true });
        setSedes(data ?? []);
      } catch {}
      setLoading(false);
    })();
  }, [router]);

  async function handleCreate() {
    if (!form.nombre) {
      setToast({ type: "error", message: "El nombre de la sede es obligatorio." });
      return;
    }
    setCreating(true);
    const fd = new FormData();
    fd.set("nombre", form.nombre);
    fd.set("ciudad", form.ciudad);
    fd.set("direccion", form.direccion);
    fd.set("currentUserRol", currentUserRol ?? "");
    const res = await crearSede(fd);
    setCreating(false);
    if (res.success) {
      setToast({ type: "success", message: "Sede creada exitosamente." });
      setShowCreate(false);
      setForm({ nombre: "", ciudad: "", direccion: "" });
      const s = createClient();
      const { data } = await (s.from("sedes") as any)
        .select("*")
        .order("nombre", { ascending: true });
      setSedes(data ?? []);
    } else {
      setToast({ type: "error", message: res.error ?? "Error al crear sede." });
    }
  }

  async function handleToggle(id: string, currentActivo: boolean) {
    const fd = new FormData();
    fd.set("sedeId", id);
    fd.set("newStatus", String(!currentActivo));
    fd.set("currentUserRol", currentUserRol ?? "");
    const res = await toggleSede(fd);
    if (res.success) {
      setToast({ type: "success", message: "Sede actualizada." });
      setSedes((prev) => prev.map((s) => (s.id === id ? { ...s, activo: !currentActivo } : s)));
    } else {
      setToast({ type: "error", message: res.error ?? "Error al actualizar sede." });
    }
  }

  if (loading) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
              Gestión de Sedes
            </h1>
            <p className="text-base text-gray-500 dark:text-slate-400">
              Administra las sedes de la universidad a nivel nacional.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-[0_4px_16px_rgb(0,0,0,0.08)]"
          >
            <Plus size={18} />
            Nueva Sede
          </button>
        </div>

        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant dark:border-slate-700 bg-surface dark:bg-slate-800/50">
                  <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Sede</th>
                  <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Ciudad</th>
                  <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Dirección</th>
                  <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Estado</th>
                  <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant dark:divide-slate-700">
                {sedes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-md py-8 text-center font-body-md text-body-md text-on-surface-variant dark:text-slate-400">
                      No hay sedes registradas.
                    </td>
                  </tr>
                ) : (
                  sedes.map((s) => (
                    <tr key={s.id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/30 transition-colors h-14">
                      <td className="px-md py-3 flex items-center gap-3 font-label-md text-label-md text-on-surface dark:text-white font-semibold">
                        <Building2 size={18} className="text-on-surface-variant dark:text-slate-400 shrink-0" />
                        {s.nombre}
                      </td>
                      <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant dark:text-slate-300">
                        {s.ciudad ?? "—"}
                      </td>
                      <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant dark:text-slate-300">
                        {s.direccion ?? "—"}
                      </td>
                      <td className="px-md py-3">
                        <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm ${
                          s.activo
                            ? "bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-900/50 dark:text-green-300"
                            : "bg-error-container text-on-error-container dark:bg-red-900/50 dark:text-red-300"
                        }`}>
                          {s.activo ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-md py-3 text-right">
                        <button
                          onClick={() => handleToggle(s.id, s.activo)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 ${
                            s.activo ? "bg-primary" : "bg-gray-300 dark:bg-slate-600"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              s.activo ? "translate-x-[22px]" : "translate-x-[2px]"
                            }`}
                          />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-fadeUp">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border ${
            toast.type === "success"
              ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32] dark:bg-green-900/50 dark:border-green-700 dark:text-green-300"
              : "bg-error-container border-error text-on-error-container dark:bg-red-900/50 dark:border-red-700 dark:text-red-300"
          }`}>
            <span className="font-body-md text-body-md">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        </div>
      )}

      {/* ── Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fadeUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Sede</h3>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Sede Cusco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Ciudad</label>
                <input
                  type="text"
                  value={form.ciudad}
                  onChange={(e) => setForm({ ...form, ciudad: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Cusco"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Dirección</label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Av. Universitaria 123"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowCreate(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {creating ? "Creando..." : "Crear Sede"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
