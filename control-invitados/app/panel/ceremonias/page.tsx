"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Pencil,
  Trash2,
  Calendar,
  Clock,
  Users,
  UserPlus,
  GraduationCap,
  Building2,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { crearCeremonia, editarCeremonia } from "@/app/actions/ceremonias";

type SedeRow = { id: string; nombre: string };

export default function CeremoniasPage() {
  const router = useRouter();
  const [ceremonias, setCeremonias] = useState<any[]>([]);
  const [sedes, setSedes] = useState<SedeRow[]>([]);
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [currentUserSedeId, setCurrentUserSedeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [form, setForm] = useState({
    nombre: "",
    sede_id: "",
    programa_principal: "",
    fecha: "",
    hora_inicio: "",
    aforo_total_invitados: "",
    cupo_base_invitado: "3",
  });
  const [editingCeremonia, setEditingCeremonia] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
        if (!session?.user?.id) {
          router.replace("/staff/ingreso");
          return;
        }

        const { data: userData } = await (s.from("usuarios") as any)
          .select("rol, sede_id")
          .eq("id", session.user.id)
          .single();

        if (!userData) return;
        setCurrentUserRol(userData.rol);
        setCurrentUserSedeId(userData.sede_id);

        const isAdmin = userData.rol === "admin_general";

        let query = (s.from("ceremonias") as any)
          .select("*, sedes(nombre)")
          .order("fecha", { ascending: false });

        if (!isAdmin && userData.sede_id) {
          query = query.eq("sede_id", userData.sede_id);
        }

        const { data: ceremonies } = await query;
        setCeremonias(ceremonies ?? []);

        const { data: sedesData } = await (s.from("sedes") as any)
          .select("id, nombre")
          .eq("activo", true)
          .order("nombre", { ascending: true });
        setSedes(sedesData ?? []);
      } catch {}
      setLoading(false);
    })();
  }, [router]);

  async function handleCreate() {
    if (!form.nombre || !form.sede_id || !form.fecha || !form.hora_inicio || !form.aforo_total_invitados) {
      setToast({ type: "error", message: "Completa todos los campos obligatorios." });
      return;
    }
    try {
      setCreating(true);
      const fd = new FormData();
      fd.set("currentUserRol", currentUserRol ?? "");
      fd.set("nombre", form.nombre);
      fd.set("sede_id", currentUserRol === "encargado" && currentUserSedeId ? currentUserSedeId : form.sede_id);
      fd.set("programa_principal", form.programa_principal);
      fd.set("fecha", form.fecha);
      fd.set("hora_inicio", form.hora_inicio);
      fd.set("aforo_total_invitados", form.aforo_total_invitados);
      fd.set("cupo_base_invitado", form.cupo_base_invitado);
      const result = await crearCeremonia(fd);
      if (result?.error) throw new Error(result.error);
      setToast({ type: "success", message: "Ceremonia creada exitosamente." });
      setShowCreate(false);
      setForm({ nombre: "", sede_id: "", programa_principal: "", fecha: "", hora_inicio: "", aforo_total_invitados: "", cupo_base_invitado: "3" });
      const s = createClient();
      const isAdmin = currentUserRol === "admin_general";
      let q = (s.from("ceremonias") as any)
        .select("*, sedes(nombre)")
        .order("fecha", { ascending: false });
      if (!isAdmin && currentUserSedeId) q = q.eq("sede_id", currentUserSedeId);
      const { data } = await q;
      setCeremonias(data ?? []);
    } catch (error: any) {
      setToast({ type: "error", message: error?.message ?? "Error al crear ceremonia." });
      console.error("Error al crear:", error);
    } finally {
      setCreating(false);
    }
  }

  function openEdit(c: any) {
    setDeletingId(null);
    setEditingCeremonia(c);
    setForm({
      nombre: c.nombre ?? "",
      sede_id: c.sede_id ?? "",
      programa_principal: c.programa_principal ?? "",
      fecha: c.fecha ?? "",
      hora_inicio: c.hora_inicio ?? "",
      aforo_total_invitados: c.aforo_total_invitados?.toString() ?? "",
      cupo_base_invitado: c.cupo_base_invitado?.toString() ?? "3",
    });
    setEditing(false);
  }

  function closeModal() {
    setDeletingId(null);
    setShowCreate(false);
    setEditing(false);
    setEditingCeremonia(null);
    setForm({ nombre: "", sede_id: "", programa_principal: "", fecha: "", hora_inicio: "", aforo_total_invitados: "", cupo_base_invitado: "3" });
  }

  async function handleEdit() {
    if (!editingCeremonia) return;
    if (!form.nombre || !form.sede_id || !form.fecha || !form.hora_inicio || !form.aforo_total_invitados) {
      setToast({ type: "error", message: "Completa todos los campos obligatorios." });
      return;
    }
    try {
      setEditing(true);
      const fd = new FormData();
      fd.set("id", editingCeremonia.id);
      fd.set("currentUserRol", currentUserRol ?? "");
      fd.set("nombre", form.nombre);
      fd.set("sede_id", form.sede_id);
      fd.set("programa_principal", form.programa_principal);
      fd.set("fecha", form.fecha);
      fd.set("hora_inicio", form.hora_inicio);
      fd.set("aforo_total_invitados", form.aforo_total_invitados);
      fd.set("cupo_base_invitado", form.cupo_base_invitado);
      const result = await editarCeremonia(fd);
      if (result?.error) throw new Error(result.error);
      setToast({ type: "success", message: "Ceremonia actualizada exitosamente." });
      closeModal();
      const s = createClient();
      const isAdmin = currentUserRol === "admin_general";
      let q = (s.from("ceremonias") as any)
        .select("*, sedes(nombre)")
        .order("fecha", { ascending: false });
      if (!isAdmin && currentUserSedeId) q = q.eq("sede_id", currentUserSedeId);
      const { data } = await q;
      setCeremonias(data ?? []);
    } catch (error: any) {
      setToast({ type: "error", message: error?.message ?? "Error al actualizar ceremonia." });
      console.error("Error al editar:", error);
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const s = createClient();
      const { error } = await (s.from("ceremonias") as any).delete().eq("id", id);
      if (error) {
        setToast({ type: "error", message: `Error al borrar: ${error.message}` });
        console.error(error);
        return;
      }
      setCeremonias((prev) => prev.filter((c) => c.id !== id));
      setDeletingId(null);
      setToast({ type: "success", message: "Ceremonia eliminada" });
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Error de red." });
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-PE", { day: "numeric", month: "long", year: "numeric" });
  }

  const isAdmin = currentUserRol === "admin_general";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
              Ceremonias
            </h1>
            <p className="text-base text-gray-500 dark:text-slate-400">
              {isAdmin ? "Gestión de ceremonias de graduación a nivel nacional." : "Ceremonias de tu sede."}
            </p>
          </div>
          {(isAdmin || currentUserRol === "encargado") && (
            <button
              onClick={() => { setDeletingId(null); setShowCreate(true); }}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-[0_4px_16px_rgb(0,0,0,0.08)]"
            >
              <Plus size={18} />
              Nueva Ceremonia
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 h-44 animate-pulse" />
            ))}
          </div>
        ) : ceremonias.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <GraduationCap size={48} className="mx-auto text-gray-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No hay ceremonias</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {isAdmin ? "Crea la primera ceremonia usando el botón superior." : "No hay ceremonias programadas para tu sede."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ceremonias.map((c) => {
              const statusColors: Record<string, string> = {
                planificada: "bg-[#fef7e0] text-[#b06000] dark:bg-amber-900/50 dark:text-amber-300",
                en_curso: "bg-[#e6f4ea] text-[#137333] dark:bg-green-900/50 dark:text-green-300",
                finalizada: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400",
                cancelada: "bg-error-container text-on-error-container dark:bg-red-900/50 dark:text-red-300",
              };
              const statusLabels: Record<string, string> = {
                planificada: "Planificada",
                en_curso: "En Curso",
                finalizada: "Finalizada",
                cancelada: "Cancelada",
              };

              return (
                <div
                  key={c.id}
                  className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-lg transition-shadow duration-200 flex flex-col"
                >
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight flex-1 mr-2">
                      {c.nombre}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 hover:text-primary transition-all"
                            title="Editar ceremonia"
                          >
                            <Pencil size={15} />
                          </button>
                          {c.estado === "finalizada" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (deletingId === c.id) {
                                  handleDelete(c.id);
                                } else {
                                  setDeletingId(c.id);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                deletingId === c.id
                                  ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
                                  : "text-gray-400 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400"
                              }`}
                              title={deletingId === c.id ? "Haz clic de nuevo para borrar" : "Eliminar ceremonia"}
                            >
                              {deletingId === c.id ? (
                                <span className="text-[10px] font-bold px-0.5">¿Seguro?</span>
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          )}
                        </>
                      )}
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColors[c.estado] ?? statusColors.planificada}`}>
                        {statusLabels[c.estado] ?? c.estado}
                      </span>
                    </div>
                  </div>

                  {c.programa_principal && (
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3 line-clamp-1">
                      {c.programa_principal}
                    </p>
                  )}

                  <div className="mt-auto space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <Building2 size={16} className="shrink-0 text-on-surface-variant dark:text-slate-400" />
                      <span>{c.sedes?.nombre ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <Calendar size={16} className="shrink-0 text-on-surface-variant dark:text-slate-400" />
                      <span>{formatDate(c.fecha)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <Clock size={16} className="shrink-0 text-on-surface-variant dark:text-slate-400" />
                      <span>{c.hora_inicio?.slice(0, 5) ?? "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-slate-300">
                      <Users size={16} className="shrink-0 text-on-surface-variant dark:text-slate-400" />
                      <span>Aforo: {c.aforo_total_invitados?.toLocaleString() ?? "—"} personas</span>
                    </div>
                    <Link
                      href={`/panel/ceremonias/${c.id}`}
                      className="flex items-center justify-center gap-2 w-full mt-3 bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-fixed-dim text-sm font-medium px-4 py-2 rounded-xl hover:bg-primary/20 dark:hover:bg-primary/30 transition-all"
                    >
                      <UserPlus size={16} />
                      Gestionar Egresados
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
      {(showCreate || editingCeremonia) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fadeUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editing ? "Editar Ceremonia" : "Nueva Ceremonia"}</h3>
              <button onClick={closeModal} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre de la Ceremonia *</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Ceremonia Ingeniería - Turno Mañana"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sede *</label>
                  {currentUserRol === "encargado" ? (
                    <input
                      type="text"
                      value={sedes.find((s) => s.id === currentUserSedeId)?.nombre ?? "Tu sede"}
                      disabled
                      className="w-full border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                    />
                  ) : (
                    <select
                      value={form.sede_id}
                      onChange={(e) => setForm({ ...form, sede_id: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    >
                      <option value="">Seleccionar sede</option>
                      {sedes.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Programa Principal</label>
                  <input
                    type="text"
                    value={form.programa_principal}
                    onChange={(e) => setForm({ ...form, programa_principal: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    placeholder="Ej: Facultad de Ingeniería"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Hora de Inicio *</label>
                  <input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Aforo Total *</label>
                  <input
                    type="number"
                    min="1"
                    value={form.aforo_total_invitados}
                    onChange={(e) => setForm({ ...form, aforo_total_invitados: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    placeholder="Ej: 500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cupos por Egresado</label>
                  <input
                    type="number"
                    min="1"
                    value={form.cupo_base_invitado}
                    onChange={(e) => setForm({ ...form, cupo_base_invitado: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={closeModal}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={editingCeremonia ? handleEdit : handleCreate}
                disabled={editing || creating}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {(editing || creating) ? (
                  <><Loader2 size={16} className="animate-spin" /> {editing ? "Guardando..." : "Creando..."}</>
                ) : (
                  editingCeremonia ? "Guardar Cambios" : "Crear Ceremonia"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
