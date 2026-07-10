"use client";

import { useEffect, useState } from "react";
import MobileBottomNav from "@/components/MobileBottomNav";
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  Settings,
  Users,
  CalendarCheck,
  ClipboardList,
  ChevronDown,
  UserPlus,
  Shield,
  Undo2,
  Trash2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { crearUsuario, toggleUserStatus } from "@/app/actions/usuarios";

type SedeRow = { id: string; nombre: string; ciudad: string | null };

type CeremoniaConResumen = {
  ceremonia_id: string;
  ceremonia_nombre: string;
  aforo_total_invitados: number;
  cupo_base_invitado: number;
  total_egresados: number;
  egresados_confirmados: number;
  egresados_ingresados: number;
  invitados_aprobados: number;
  invitados_en_espera: number;
  invitados_ingresados: number;
  aforo_libre: number;
  sede_nombre: string;
};

type CeremoniaDetalle = {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
  estado: string;
  sede_nombre: string;
};

function formatFechaCorta(fecha: string): { mes: string; dia: string } {
  const d = new Date(fecha);
  const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return { mes: meses[d.getMonth()], dia: String(d.getDate()) };
}

export default function AdminPanelPage() {
  const [sedes, setSedes] = useState<SedeRow[]>([]);
  const [sedeSeleccionada, setSedeSeleccionada] = useState<string | null>(null);
  const [resumenes, setResumenes] = useState<CeremoniaConResumen[]>([]);
  const [ceremoniasProximas, setCeremoniasProximas] = useState<CeremoniaDetalle[]>([]);
  const [totalTogasPorDevolver, setTotalTogasPorDevolver] = useState(0);
  const [totalDnisEnCustodia, setTotalDnisEnCustodia] = useState(0);
  const [totalEgresadosIngresados, setTotalEgresadosIngresados] = useState(0);
  const [ceremoniasActivas, setCeremoniasActivas] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedCeremoniaId, setSelectedCeremoniaId] = useState<string | null>(null);
  const [perCeremonyTogas, setPerCeremonyTogas] = useState(0);
  const [perCeremonyDnis, setPerCeremonyDnis] = useState(0);
  const [perCeremonyEgresadosIngresados, setPerCeremonyEgresadosIngresados] = useState(0);
  const [directInvitadosIngresados, setDirectInvitadosIngresados] = useState(0);
  const [directInvitadosLoading, setDirectInvitadosLoading] = useState(false);
  const [selectedCeremonyMeta, setSelectedCeremonyMeta] = useState<{ estado: string; conteo_final_invitados: number } | null>(null);
  const [perCeremonyEgrAttendance, setPerCeremonyEgrAttendance] = useState<Record<string, number>>({});
  const [perCeremonyInvAttendance, setPerCeremonyInvAttendance] = useState<Record<string, number>>({});

  const ceremonyOptions = resumenes.map(r => ({ id: r.ceremonia_id, nombre: r.ceremonia_nombre }));

  useEffect(() => {
    if (!selectedCeremoniaId) return;
    (async () => {
      const s = createClient();
      const { count: togas } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .eq("ceremonia_id", selectedCeremoniaId)
        .eq("toga_entregada", true)
        .or("toga_devuelta.is.null,toga_devuelta.neq.true");
      const { count: dnis } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .eq("ceremonia_id", selectedCeremoniaId)
        .eq("dni_retenido", true);
      const { count: egrIngresados } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .eq("ceremonia_id", selectedCeremoniaId)
        .eq("ingreso_evento", true);
      setPerCeremonyTogas(togas ?? 0);
      setPerCeremonyDnis(dnis ?? 0);
      setPerCeremonyEgresadosIngresados(egrIngresados ?? 0);
    })();
  }, [selectedCeremoniaId]);

  useEffect(() => {
    if (!selectedCeremoniaId) { setSelectedCeremonyMeta(null); return; }
    (async () => {
      const s = createClient();
      const { data } = await (s.from("ceremonias") as any)
        .select("estado, conteo_final_invitados")
        .eq("id", selectedCeremoniaId)
        .single();
      if (data) setSelectedCeremonyMeta(data);
    })();
  }, [selectedCeremoniaId]);

  useEffect(() => {
    (async () => {
      setDirectInvitadosLoading(true);
      try {
        const s = createClient();
        let query = (s.from("invitados") as any).select("*", { count: "exact", head: true }).not("ingreso_at", "is", null);
        if (selectedCeremoniaId) {
          query = query.eq("ceremonia_id", selectedCeremoniaId);
        } else {
          const ceremonyIds = resumenes.map(r => r.ceremonia_id);
          if (ceremonyIds.length > 0) query = query.in("ceremonia_id", ceremonyIds);
          else { setDirectInvitadosIngresados(0); setDirectInvitadosLoading(false); return; }
        }
        const { count } = await query;
        setDirectInvitadosIngresados(count ?? 0);
      } catch {} finally { setDirectInvitadosLoading(false); }
    })();
  }, [selectedCeremoniaId, resumenes]);

  /* ───── Current user session ───── */
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [currentUserSedeId, setCurrentUserSedeId] = useState<string | null>(null);

  /* ───── User management ───── */
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [sedesMap, setSedesMap] = useState<Record<string, string>>({});
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [newUser, setNewUser] = useState({
    nombres: "",
    apellidos: "",
    email: "",
    password: "password123",
    dni: "",
    rol: "",
    sede_id: "",
  });

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchUsuarios() {
    try {
      const s = createClient();
      const { data } = await (s.from("usuarios") as any)
        .select("id, nombres, apellidos, dni, rol, sede_id, activo, sedes(nombre)")
        .order("nombres", { ascending: true });
      setUsuarios(data ?? []);
    } catch {}
  }

  async function handleToggleUser(userId: string, currentActivo: boolean, targetRol: string, targetSedeId: string | null) {
    const fd = new FormData();
    fd.set("userId", userId);
    fd.set("newStatus", String(!currentActivo));
    fd.set("currentUserRol", currentUserRol ?? "");
    fd.set("currentUserSedeId", currentUserSedeId ?? "");
    fd.set("targetUserRol", targetRol);
    fd.set("targetUserSedeId", targetSedeId ?? "");
    const res = await toggleUserStatus(fd);
    if (res.success) {
      setToast({ type: "success", message: "Usuario actualizado." });
      fetchUsuarios();
    } else {
      setToast({ type: "error", message: res.error ?? "Error al actualizar usuario." });
    }
  }

  async function handleCreateUser() {
    if (!newUser.nombres || !newUser.apellidos || !newUser.email) {
      setToast({ type: "error", message: "Completa todos los campos obligatorios." });
      return;
    }
    setCreating(true);
    const fd = new FormData();
    fd.set("nombres", newUser.nombres);
    fd.set("apellidos", newUser.apellidos);
    fd.set("email", newUser.email);
    fd.set("password", newUser.password);
    fd.set("dni", newUser.dni);
    fd.set("rol", newUser.rol);
    fd.set("sede_id", newUser.sede_id);
    fd.set("currentUserRol", currentUserRol ?? "");
    fd.set("currentUserSedeId", currentUserSedeId ?? "");
    const res = await crearUsuario(fd);
    setCreating(false);
    if (res.success) {
      setToast({ type: "success", message: "Usuario creado exitosamente." });
      setShowCreateUser(false);
      const defaultRol = currentUserRol === "admin_general" ? "encargado" : "operario";
      setNewUser({ nombres: "", apellidos: "", email: "", password: "password123", dni: "", rol: defaultRol, sede_id: currentUserRol === "encargado" ? currentUserSedeId ?? "" : "" });
      fetchUsuarios();
    } else {
      setToast({ type: "error", message: res.error ?? "Error al crear usuario." });
    }
  }

  async function handleDeleteUser(userId: string, userName: string) {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar a "${userName}" permanentemente?`)) return;
    try {
      const s = createClient();
      const { error } = await (s.from("usuarios") as any).delete().eq("id", userId);
      if (error) { setToast({ type: "error", message: error.message }); return; }
      setUsuarios((prev) => prev.filter((u: any) => u.id !== userId));
      setToast({ type: "success", message: "Usuario eliminado." });
    } catch { setToast({ type: "error", message: "Error de red." }); }
  }

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();

        const { data: { session } } = await s.auth.getSession();
        if (session?.user?.id) {
          const { data: userData } = await (s.from("usuarios") as any)
            .select("rol, sede_id")
            .eq("id", session.user.id)
            .single();
          if (userData) {
            setCurrentUserRol(userData.rol);
            setCurrentUserSedeId(userData.sede_id);
            setNewUser((prev) => ({
              ...prev,
              rol: userData.rol === "admin_general" ? "encargado" : "operario",
              sede_id: userData.rol === "encargado" ? userData.sede_id ?? "" : "",
            }));
          }
        }

        const { data: sedesData } = await (s.from("sedes") as any)
          .select("id, nombre, ciudad")
          .eq("activo", true)
          .order("nombre", { ascending: true });
        setSedes(sedesData ?? []);
        setSedesMap(Object.fromEntries((sedesData ?? []).map((se: SedeRow) => [se.id, se.nombre])));

        await cargarDatos(s, null);
        fetchUsuarios();
      } catch {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const s = createClient();
      await cargarDatos(s, sedeSeleccionada);
    })();
  }, [sedeSeleccionada]);

  async function cargarDatos(s: ReturnType<typeof createClient>, sedeId: string | null) {
    try {
      const hoy = new Date().toISOString().split("T")[0];
      let query = (s.from("ceremonias") as any)
        .select("id, nombre, fecha, hora_inicio, estado, sede_id")
        .or(`estado.in.(planificada,en_curso),fecha.gte.${hoy}`);

      if (sedeId) query = query.eq("sede_id", sedeId);
      const { data: ceremonies } = await query.order("fecha", { ascending: true });

      if (!ceremonies?.length) {
        setResumenes([]);
        setCeremoniasProximas([]);
        return;
      }

      const ceremonyIds = ceremonies.map((c: { id: string }) => c.id);

      const { data: resumenesData } = await (s.from("v_resumen_ceremonia") as any)
        .select("*")
        .in("ceremonia_id", ceremonyIds);

      const { data: sedesMap } = await (s.from("sedes") as any)
        .select("id, nombre")
        .eq("activo", true);
      const sedeNombre = Object.fromEntries((sedesMap ?? []).map((se: SedeRow) => [se.id, se.nombre]));

      const resumenesConSede: CeremoniaConResumen[] = (resumenesData ?? []).map((r: any) => {
        const cer = ceremonies.find((c: { id: string }) => c.id === r.ceremonia_id);
        return { ...r, sede_nombre: sedeNombre[cer?.sede_id] ?? "—" };
      });
      setResumenes(resumenesConSede);

      const { data: egrData } = await (s.from("egresados") as any)
        .select("ceremonia_id, ingreso_evento")
        .in("ceremonia_id", ceremonyIds);
      const attMap: Record<string, number> = {};
      (egrData ?? []).forEach((e: any) => {
        if (e.ingreso_evento) {
          attMap[e.ceremonia_id] = (attMap[e.ceremonia_id] || 0) + 1;
        }
      });
      setPerCeremonyEgrAttendance(attMap);

      const { data: invData } = await (s.from("invitados") as any)
        .select("ceremonia_id")
        .in("ceremonia_id", ceremonyIds)
        .not("ingreso_at", "is", null);
      const invAttMap: Record<string, number> = {};
      (invData ?? []).forEach((i: any) => {
        invAttMap[i.ceremonia_id] = (invAttMap[i.ceremonia_id] || 0) + 1;
      });
      setPerCeremonyInvAttendance(invAttMap);

      const proximas = ceremonies.slice(0, 10)
        .map((c: any) => ({
          id: c.id,
          nombre: c.nombre,
          fecha: c.fecha,
          hora_inicio: c.hora_inicio,
          estado: c.estado,
          sede_nombre: sedeNombre[c.sede_id] ?? "—",
        }));
      setCeremoniasProximas(proximas);
      setCeremoniasActivas(ceremonies.length);

      const { count: togasPendientes } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .in("ceremonia_id", ceremonyIds)
        .eq("toga_entregada", true)
        .or("toga_devuelta.is.null,toga_devuelta.neq.true");
      setTotalTogasPorDevolver(togasPendientes ?? 0);

      const { count: dnisCustodia } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .in("ceremonia_id", ceremonyIds)
        .eq("dni_retenido", true);
      setTotalDnisEnCustodia(dnisCustodia ?? 0);

      const { count: egrIngresadosTotal } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .in("ceremonia_id", ceremonyIds)
        .eq("ingreso_evento", true);
      setTotalEgresadosIngresados(egrIngresadosTotal ?? 0);
    } catch {}
  }

  const filteredResumenes = selectedCeremoniaId 
    ? resumenes.filter(r => r.ceremonia_id === selectedCeremoniaId) 
    : resumenes;
  const displayTotalEgresados = filteredResumenes.reduce((s, r) => s + r.total_egresados, 0);
  const displayInvitadosIngresados = selectedCeremonyMeta?.estado === "finalizada"
    ? (selectedCeremonyMeta.conteo_final_invitados ?? 0)
    : directInvitadosIngresados;
  const displayEgresadosIngresados = selectedCeremoniaId ? perCeremonyEgresadosIngresados : totalEgresadosIngresados;
  const displayAforo = filteredResumenes.reduce((s, r) => s + r.aforo_total_invitados, 0);
  const displayAforoLibre = Math.max(0, displayAforo - displayInvitadosIngresados - displayEgresadosIngresados);
  const displayTogas = selectedCeremoniaId ? perCeremonyTogas : totalTogasPorDevolver;
  const displayDnis = selectedCeremoniaId ? perCeremonyDnis : totalDnisEnCustodia;

  const chartData = resumenes.map((r) => ({
    nombre: r.ceremonia_nombre.length > 18 ? r.ceremonia_nombre.slice(0, 16) + "\u2026" : r.ceremonia_nombre,
    Egresados: perCeremonyEgrAttendance[r.ceremonia_id] ?? 0,
    Invitados: perCeremonyInvAttendance[r.ceremonia_id] ?? 0,
  }));

  return (
    <>
    <div className="flex h-screen md:min-h-screen bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />

      {/* ── Main Content Area ── */}
      <div className="flex-1 overflow-y-auto p-8 pb-24 md:pb-8 animate-fadeUp">
        {/* ── Executive Dashboard ── */}
        <section className="mb-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Executive Overview
              </h2>
              <p className="text-base text-gray-500 dark:text-slate-400">
                Estado y ocupación de ceremonias multi-sede.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <label className="sr-only" htmlFor="sede-selector">
                Seleccionar Sede
              </label>
              <select
                id="sede-selector"
                value={sedeSeleccionada ?? ""}
                onChange={(e) => setSedeSeleccionada(e.target.value || null)}
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl px-4 py-3 pr-10 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
              >
                <option value="">Todas las sedes (Consolidado)</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}{s.ciudad ? ` — ${s.ciudad}` : ""}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400 dark:text-slate-500">
                <ChevronDown size={20} />
              </div>
            </div>
          </div>

            {/* ── Ceremony Selector ── */}
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap">
                📍 Vista de Dashboard:
              </span>
              <div className="relative">
                <select
                  value={selectedCeremoniaId ?? ""}
                  onChange={(e) => setSelectedCeremoniaId(e.target.value || null)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm transition-colors cursor-pointer appearance-none pr-8"
                >
                  <option value="">Consolidado General</option>
                  {ceremonyOptions.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute inset-y-0 right-2 top-1/2 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Key Metrics — 4 compact KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Total Egresados", value: displayTotalEgresados, icon: Users },
                  { label: "Invitados Ingresados", value: displayInvitadosIngresados, icon: CalendarCheck },
                  { label: "Egresados Ingresados", value: displayEgresadosIngresados, icon: GraduationCap },
                  { label: "Ceremonias Activas", value: ceremoniasActivas, icon: Calendar },
                ].map((c) => (
                  <div key={c.label} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-start justify-center gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight line-clamp-2 pr-1">
                        {c.label}
                      </span>
                      <c.icon size={16} className="text-indigo-500 shrink-0" />
                    </div>
                    {c.value !== null ? (
                      <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                        {c.value.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-base md:text-lg font-bold text-slate-400 dark:text-slate-500">
                        Por evento
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Chart + Events */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Asistencia General por Ceremonia */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Asistencia por Ceremonia
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                      Egresados e Invitados que ingresaron
                    </p>
                  <div className="flex-1">
                    {chartData.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
                        No hay datos disponibles.
                      </p>
                    ) : (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis
                            dataKey="nombre"
                            tick={{ fontSize: 11 }}
                            angle={-20}
                            textAnchor="end"
                            height={60}
                          />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip
                            contentStyle={{
                              background: "#fff",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                              fontSize: "13px",
                            }}
                          />
                          <Legend wrapperStyle={{ fontSize: "12px" }} />
                          <Bar dataKey="Egresados" fill="#22c55e" name="Egresados" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Invitados" fill="#2563eb" name="Invitados" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Upcoming Events */}
                <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Ceremonias Activas
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400">
                      Próximas ceremonias
                    </p>
                  </div>
                  <div className="flex flex-col gap-3">
                    {ceremoniasProximas.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-8">
                        No hay ceremonias activas.
                      </p>
                    ) : (
                      ceremoniasProximas.map((c) => {
                        const { mes, dia } = formatFechaCorta(c.fecha);
                        const statusColor =
                          c.estado === "en_curso"
                            ? "bg-[#e6f4ea] text-[#137333]"
                            : "bg-[#fef7e0] text-[#b06000]";
                        return (
                          <div
                            key={c.id}
                            className="flex items-center gap-4 p-3 border border-gray-100 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-all duration-200"
                          >
                            <div className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 p-2 rounded-xl text-center min-w-[60px]">
                              <div className="text-xs uppercase font-medium">
                                {mes}
                              </div>
                              <div className="text-xl font-bold leading-none">
                                {dia}
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {c.nombre}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-slate-400 truncate">
                                {c.sede_nombre} • {c.hora_inicio?.slice(0, 5) ?? "—"}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${statusColor}`}
                            >
                              {c.estado === "en_curso" ? "En Curso" : "Planificada"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {/* ── User Management Section ── */}
        <section>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h2 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
                Gestión de Personal
              </h2>
              <p className="text-base text-gray-500 dark:text-slate-400">
                Administra encargados y operarios del sistema.
              </p>
            </div>
            <button
              onClick={() => setShowCreateUser(true)}
              className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all shadow-[0_4px_16px_rgb(0,0,0,0.08)]"
            >
              <UserPlus size={18} />
              Nuevo Usuario
            </button>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant dark:border-slate-700 bg-surface dark:bg-slate-800/50">
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Nombres</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Apellidos</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">DNI</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Rol</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Sede</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold">Estado</th>
                    <th className="px-md py-3 font-label-md text-label-md text-on-surface-variant dark:text-slate-400 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant dark:divide-slate-700">
                  {usuarios.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-md py-8 text-center font-body-md text-body-md text-on-surface-variant dark:text-slate-400">
                        No hay usuarios registrados.
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-surface-container-low dark:hover:bg-slate-700/30 transition-colors h-14">
                        <td className="px-md py-3 font-label-md text-label-md text-on-surface dark:text-white font-semibold">{u.nombres}</td>
                        <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant dark:text-slate-300">{u.apellidos}</td>
                        <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant dark:text-slate-300">{u.dni ?? "—"}</td>
                        <td className="px-md py-3">
                          <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm ${
                            u.rol === "admin_general" ? "bg-primary-fixed text-on-primary-fixed dark:bg-primary/30 dark:text-white" :
                            u.rol === "encargado" ? "bg-secondary-container text-on-secondary-container dark:bg-secondary/30 dark:text-white" :
                            "bg-surface-container-highest text-on-surface-variant dark:bg-slate-700 dark:text-slate-300"
                          }`}>
                            {u.rol === "admin_general" ? "Admin" : u.rol === "encargado" ? "Encargado" : "Operario"}
                          </span>
                        </td>
                        <td className="px-md py-3 font-body-md text-body-md text-on-surface-variant dark:text-slate-300">
                          {u.sedes?.nombre ?? "Todas"}
                        </td>
                        <td className="px-md py-3">
                          <span className={`px-2 py-1 rounded-full font-label-sm text-label-sm ${u.activo ? "bg-[#E8F5E9] text-[#2E7D32] dark:bg-green-900/50 dark:text-green-300" : "bg-error-container text-on-error-container dark:bg-red-900/50 dark:text-red-300"}`}>
                            {u.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="px-md py-3 text-right flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleUser(u.id, u.activo, u.rol, u.sede_id)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 shrink-0 ${
                              u.activo ? "bg-primary" : "bg-gray-300 dark:bg-slate-600"
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                u.activo ? "translate-x-[22px]" : "translate-x-[2px]"
                              }`}
                            />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id, `${u.nombres} ${u.apellidos}`)}
                            className="p-1.5 rounded-lg text-gray-400 dark:text-slate-500 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>

    <MobileBottomNav
      items={[
        { href: "/panel/admin", icon: LayoutDashboard, label: "Dashboard" },
        { href: "/panel/egresados", icon: GraduationCap, label: "Egresados" },
        { href: "/panel/ceremonias", icon: Calendar, label: "Ceremonias" },
        { href: "/panel/settings", icon: Settings, label: "Config" },
      ]}
    />

    {/* ── Toast Notification ── */}
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

    {/* ── Modal: Crear Usuario ── */}
    {showCreateUser && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-fadeUp max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Crear Nuevo Usuario</h3>
            <button onClick={() => setShowCreateUser(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombres *</label>
                <input
                  type="text"
                  value={newUser.nombres}
                  onChange={(e) => setNewUser({ ...newUser, nombres: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Nombres"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellidos *</label>
                <input
                  type="text"
                  value={newUser.apellidos}
                  onChange={(e) => setNewUser({ ...newUser, apellidos: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Apellidos"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Email *</label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                placeholder="correo@ejemplo.com"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Contraseña temporal</label>
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">DNI</label>
                <input
                  type="text"
                  value={newUser.dni}
                  onChange={(e) => setNewUser({ ...newUser, dni: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Rol *</label>
                {currentUserRol === "admin_general" ? (
                  <select
                    value={newUser.rol}
                    onChange={(e) => setNewUser({ ...newUser, rol: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  >
                    <option value="admin_general">Admin General</option>
                    <option value="encargado">Encargado</option>
                    <option value="operario">Operario</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value="Operario"
                    disabled
                    className="w-full border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                  />
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Sede</label>
                {currentUserRol === "encargado" ? (
                  <input
                    type="text"
                    value={sedesMap[currentUserSedeId ?? ""] ?? "Sin sede"}
                    disabled
                    className="w-full border border-gray-200 dark:border-slate-600 bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400 rounded-xl px-4 py-2.5 text-sm cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={newUser.sede_id}
                    onChange={(e) => setNewUser({ ...newUser, sede_id: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  >
                    <option value="">Todas las sedes</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => setShowCreateUser(false)}
              className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateUser}
              disabled={creating}
              className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? "Creando..." : "Crear Usuario"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
