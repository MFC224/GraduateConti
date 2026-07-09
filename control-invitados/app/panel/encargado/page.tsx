"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  FileSpreadsheet,
  Users,
  CalendarCheck,
  ClipboardList,
  Undo2,
  Shield,
  Plus,
  Loader2,
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
import Header from "@/components/Header";

type CeremoniaRow = {
  id: string;
  nombre: string;
  fecha: string;
  estado: string;
};

type EgresadoRow = {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  programa_academico: string | null;
  numero_orden: number | null;
};

export default function EncargadoPanelPage() {
  const router = useRouter();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [ceremonias, setCeremonias] = useState<CeremoniaRow[]>([]);
  const [ceremoniaActiva, setCeremoniaActiva] = useState<string | null>(null);
  const [egresados, setEgresados] = useState<EgresadoRow[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sedeId, setSedeId] = useState<string | null>(null);
  const [consolidatedKPIs, setConsolidatedKPIs] = useState({ totalEgresados: 0, invitadosIngresados: 0, egresadosIngresados: 0, aforoLibre: 0, togasPorDevolver: 0, dnisRetenidos: 0 });
  const [consolidatedLoading, setConsolidatedLoading] = useState(false);
  const [openMenuEgresado, setOpenMenuEgresado] = useState<string | null>(null);
  const [chartData, setChartData] = useState<{ nombre: string; Egresados: number; Invitados: number }[]>([]);
  const [showAddExtratemporal, setShowAddExtratemporal] = useState(false);
  const [extratemporalSaving, setExtratemporalSaving] = useState(false);
  const [extratemporalToast, setExtratemporalToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [siguienteOrden, setSiguienteOrden] = useState(1);
  const [extratemporalForm, setExtratemporalForm] = useState({
    dni: "",
    nombres: "",
    apellidos: "",
    carrera: "",
    numero_orden: 1,
  });
  const carreras = [
    "Ingeniería Civil", "Ingeniería de Sistemas", "Ingeniería Industrial",
    "Ingeniería Electrónica", "Ingeniería Mecánica", "Administración",
    "Contabilidad", "Derecho", "Psicología", "Arquitectura",
  ];

  /* ───── Auth ───── */
  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const { data: { user } } = await s.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: u } = await (s.from("usuarios") as any)
          .select("sede_id")
          .eq("id", user.id)
          .single();
        if (!u) return;
        setSedeId(u.sede_id);

        const { data: c } = await (s.from("ceremonias") as any)
          .select("id, nombre, fecha, estado")
          .eq("sede_id", u.sede_id)
          .in("estado", ["planificada", "en_curso"])
          .order("fecha", { ascending: false });
        if (c?.length) {
          setCeremonias(c as CeremoniaRow[]);
          setCeremoniaActiva(c[0].id);
        }
      } catch {}
    })();
  }, []);

  /* ───── Fetch consolidated KPIs for sede ───── */
  useEffect(() => {
    if (!sedeId) return;
    (async () => {
      setConsolidatedLoading(true);
      try {
        const s = createClient();
        const { data: ceremonies } = await (s.from("ceremonias") as any)
          .select("id")
          .eq("sede_id", sedeId)
          .in("estado", ["planificada", "en_curso"]);
        if (!ceremonies?.length) { setConsolidatedLoading(false); return; }
        const ids = ceremonies.map((c: any) => c.id);

        const { data: resumen } = await (s.from("v_resumen_ceremonia") as any)
          .select("total_egresados, aforo_total_invitados")
          .in("ceremonia_id", ids);

        const { count: consolidatedInvitados } = await (s.from("invitados") as any)
          .select("*", { count: "exact", head: true })
          .in("ceremonia_id", ids)
          .not("ingreso_at", "is", null);

        const { count: consolidatedEgresados } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .in("ceremonia_id", ids)
          .eq("ingreso_evento", true);

        const totals = (resumen ?? []).reduce((acc: any, r: any) => ({
          totalEgresados: acc.totalEgresados + (r.total_egresados ?? 0),
          aforoTotal: acc.aforoTotal + (r.aforo_total_invitados ?? 0),
        }), { totalEgresados: 0, aforoTotal: 0 });

        const consolidatedAforoLibre = Math.max(0, totals.aforoTotal - (consolidatedInvitados ?? 0) - (consolidatedEgresados ?? 0));

        const { count: togas } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .in("ceremonia_id", ids)
          .eq("toga_entregada", true)
          .or("toga_devuelta.is.null,toga_devuelta.neq.true");

        const { count: dnis } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .in("ceremonia_id", ids)
          .eq("dni_retenido", true);

        setConsolidatedKPIs({ totalEgresados: totals.totalEgresados, invitadosIngresados: consolidatedInvitados ?? 0, egresadosIngresados: consolidatedEgresados ?? 0, aforoLibre: consolidatedAforoLibre, togasPorDevolver: togas ?? 0, dnisRetenidos: dnis ?? 0 });
      } catch {} finally { setConsolidatedLoading(false); }
    })();
  }, [sedeId]);

  /* ───── Chart data ───── */
  useEffect(() => {
    if (ceremonias.length === 0) return;
    (async () => {
      const s = createClient();
      const cerIds = ceremonias.map((c) => c.id);

      const { data: resumen } = await (s.from("v_resumen_ceremonia") as any)
        .select("*")
        .in("ceremonia_id", cerIds);

      const { data: egrData } = await (s.from("egresados") as any)
        .select("ceremonia_id, ingreso_evento")
        .in("ceremonia_id", cerIds);

      const attMap: Record<string, number> = {};
      (egrData ?? []).forEach((e: any) => {
        if (e.ingreso_evento) attMap[e.ceremonia_id] = (attMap[e.ceremonia_id] || 0) + 1;
      });

      const { data: invData } = await (s.from("invitados") as any)
        .select("ceremonia_id")
        .in("ceremonia_id", cerIds)
        .not("ingreso_at", "is", null);
      const invAttMap: Record<string, number> = {};
      (invData ?? []).forEach((i: any) => {
        invAttMap[i.ceremonia_id] = (invAttMap[i.ceremonia_id] || 0) + 1;
      });

      const data = (resumen ?? []).map((r: any) => ({
        nombre: r.ceremonia_nombre.length > 18 ? r.ceremonia_nombre.slice(0, 16) + "\u2026" : r.ceremonia_nombre,
        Egresados: attMap[r.ceremonia_id] ?? 0,
        Invitados: invAttMap[r.ceremonia_id] ?? 0,
      }));
      setChartData(data);
    })();
  }, [ceremonias]);

  /* ───── Cerrar menú al hacer clic fuera ───── */
  useEffect(() => {
    if (!openMenuEgresado) return;
    const handler = () => setOpenMenuEgresado(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openMenuEgresado]);

  /* ───── Egresados ───── */
  useEffect(() => {
    if (!ceremoniaActiva) return;
    (async () => {
      const s = createClient();
      const { data } = await (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden")
        .eq("ceremonia_id", ceremoniaActiva)
        .order("numero_orden", { ascending: true });
      if (data) setEgresados(data as EgresadoRow[]);
    })();
  }, [ceremoniaActiva]);

  /* ───── Extratemporal: compute next order ───── */
  useEffect(() => {
    if (showAddExtratemporal && egresados.length > 0) {
      const max = Math.max(...egresados.map((e) => e.numero_orden ?? 0));
      setSiguienteOrden(max + 1);
      setExtratemporalForm((prev) => ({ ...prev, numero_orden: max + 1 }));
    } else if (showAddExtratemporal) {
      setSiguienteOrden(1);
      setExtratemporalForm((prev) => ({ ...prev, numero_orden: 1 }));
    }
  }, [showAddExtratemporal, egresados]);

  async function handleAddExtratemporal() {
    const f = extratemporalForm;
    if (!f.dni || !f.nombres || !f.apellidos || !f.carrera) {
      setExtratemporalToast({ type: "error", message: "Completa todos los campos obligatorios." });
      return;
    }
    if (f.dni.length !== 8 || !/^\d{8}$/.test(f.dni)) {
      setExtratemporalToast({ type: "error", message: "DNI debe tener 8 dígitos numéricos." });
      return;
    }
    setExtratemporalSaving(true);
    try {
      const s = createClient();
      const { error } = await (s.from("egresados") as any).insert([{
        dni: f.dni,
        nombres: f.nombres,
        apellidos: f.apellidos,
        programa_academico: f.carrera,
        numero_orden: f.numero_orden,
        ceremonia_id: ceremoniaActiva,
        es_extratemporal: true,
      }]);
      if (error) { setExtratemporalToast({ type: "error", message: error.message }); return; }
      setShowAddExtratemporal(false);
      setExtratemporalForm({ dni: "", nombres: "", apellidos: "", carrera: "", numero_orden: siguienteOrden + 1 });
      setExtratemporalToast({ type: "success", message: "Egresado extratemporal registrado correctamente." });
      const { data } = await (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden")
        .eq("ceremonia_id", ceremoniaActiva)
        .order("numero_orden", { ascending: true });
      if (data) setEgresados(data as EgresadoRow[]);
    } catch { setExtratemporalToast({ type: "error", message: "Error de red." }); }
    finally { setExtratemporalSaving(false); }
  }

  useEffect(() => {
    if (extratemporalToast) { const t = setTimeout(() => setExtratemporalToast(null), 3500); return () => clearTimeout(t); }
  }, [extratemporalToast]);

  /* ───── Generar Reporte ───── */
  async function generarReporte() {
    if (!ceremoniaActiva) return;
    try {
      const s = createClient();
      const { data: egresadosData } = await (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden, confirmado_asistencia, equipo_entregado_at, equipo_entregado_por, operario:usuarios!equipo_entregado_por(nombres, apellidos), toga_devuelta, dni_retenido, dni_devuelto_at")
        .eq("ceremonia_id", ceremoniaActiva)
        .order("numero_orden", { ascending: true });
      const { data: invitadosData } = await (s.from("invitados") as any)
        .select("id, dni, nombres, apellidos, es_menor_7, tipo_cupo, estado, ingreso_at")
        .eq("ceremonia_id", ceremoniaActiva)
        .order("created_at", { ascending: true });

      const egresadosExcel = (egresadosData ?? []).map((e: any) => ({
        "N° Orden": e.numero_orden ?? "",
        DNI: e.dni,
        Nombres: e.nombres,
        Apellidos: e.apellidos,
        "Programa Académico": e.programa_academico ?? "",
        "Confirmó Asistencia": e.confirmado_asistencia ? "SÍ" : "NO",
        "Equipo Entregado": e.equipo_entregado_at ? "SÍ" : "NO",
        "Entregado Por": e.operario ? `${e.operario.nombres} ${e.operario.apellidos}` : "—",
        "Toga Devuelta": e.toga_devuelta ? "SÍ" : "NO",
        "DNI Devuelto": e.dni_devuelto_at ? "SÍ" : "NO",
      }));

      const invitadosExcel = (invitadosData ?? []).map((i: any) => ({
        DNI: i.dni,
        Nombres: i.nombres,
        Apellidos: i.apellidos,
        "Menor 7 años": i.es_menor_7 ? "Sí" : "No",
        Estado: i.estado === "aprobado" ? "Aprobado" : "Rechazado",
        Ingresó: i.ingreso_at ? "Sí" : "No",
      }));

      const wb = XLSX.utils.book_new();
      const ws1 = XLSX.utils.json_to_sheet(egresadosExcel);
      const ws2 = XLSX.utils.json_to_sheet(invitadosExcel);
      XLSX.utils.book_append_sheet(wb, ws1, "Egresados");
      XLSX.utils.book_append_sheet(wb, ws2, "Invitados");
      XLSX.writeFile(wb, `reporte_ceremonia_${Date.now()}.xlsx`);
    } catch {}
  }

  const filtrados = egresados.filter(
    (e) =>
      e.dni.includes(searchTerm) ||
      e.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.apellidos.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /* ───── Dashboard KPIs ───── */
  const [kpiMetrics, setKpiMetrics] = useState({
    totalEgresados: 0,
    invitadosIngresados: 0,
    egresadosIngresados: 0,
    aforoLibre: 0,
    togasPorDevolver: 0,
    dnisRetenidos: 0,
  });
  const [kpiLoading, setKpiLoading] = useState(false);

  useEffect(() => {
    if (!ceremoniaActiva) return;
    (async () => {
      setKpiLoading(true);
      try {
        const s = createClient();
        const { data: resumen } = await (s.from("v_resumen_ceremonia") as any)
          .select("total_egresados")
          .eq("ceremonia_id", ceremoniaActiva)
          .single();

        const { data: cer } = await (s.from("ceremonias") as any)
          .select("aforo_total_invitados, estado, conteo_final_invitados")
          .eq("id", ceremoniaActiva)
          .single();

        const { count: invitadosDirect } = await (s.from("invitados") as any)
          .select("*", { count: "exact", head: true })
          .eq("ceremonia_id", ceremoniaActiva)
          .not("ingreso_at", "is", null);

        const { count: togas } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .eq("ceremonia_id", ceremoniaActiva)
          .eq("toga_entregada", true)
          .or("toga_devuelta.is.null,toga_devuelta.neq.true");

        const { count: dnis } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .eq("ceremonia_id", ceremoniaActiva)
          .eq("dni_retenido", true);

        const { count: egrIngresados } = await (s.from("egresados") as any)
          .select("*", { count: "exact", head: true })
          .eq("ceremonia_id", ceremoniaActiva)
          .eq("ingreso_evento", true);

        const aforoTotal = cer?.aforo_total_invitados ?? 0;
        const invitadosIngresados = cer?.estado === "finalizada"
          ? (cer.conteo_final_invitados ?? 0)
          : (invitadosDirect ?? 0);

        setKpiMetrics({
          totalEgresados: resumen?.total_egresados ?? 0,
          invitadosIngresados,
          egresadosIngresados: egrIngresados ?? 0,
          aforoLibre: Math.max(0, aforoTotal - invitadosIngresados - (egrIngresados ?? 0)),
          togasPorDevolver: togas ?? 0,
          dnisRetenidos: dnis ?? 0,
        });
      } catch {} finally {
        setKpiLoading(false);
      }
    })();
  }, [ceremoniaActiva]);

  const ceremoniaNombre = ceremonias.find((c) => c.id === ceremoniaActiva)?.nombre ?? "";
  const showConsolidated = !ceremoniaActiva;
  const displayMetrics = showConsolidated ? consolidatedKPIs : kpiMetrics;
  const metricsLoading = showConsolidated ? consolidatedLoading : kpiLoading;

  async function handleLogout() {
    const s = createClient();
    await s.auth.signOut();
    router.push("/staff/ingreso");
  }

  return (
    <div className="bg-surface-container-low dark:bg-slate-950 text-on-surface dark:text-white font-body-md antialiased min-h-screen overflow-hidden flex">
      <Header />
      {/* ── Sidebar ── */}
      <nav className="hidden md:flex flex-col w-64 h-[calc(100vh-64px)] fixed left-0 top-16 p-md gap-base bg-surface-container-lowest dark:bg-slate-900 border-r border-outline-variant dark:border-slate-700 z-40 pointer-events-auto">
        <div className="mb-lg">
          <div className="flex items-center gap-sm mb-xs">
            <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center text-on-primary font-bold text-lg">
              UC
            </div>
            <div className="font-headline-sm text-headline-sm font-bold text-primary dark:text-primary-fixed-dim">
              Graduation Admin
            </div>
          </div>
          <div className="font-label-sm text-label-sm text-on-surface-variant dark:text-slate-400">
            Academic Management
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-xs">
          <button onClick={() => router.push("/panel/encargado")} className="flex items-center gap-sm px-4 py-3 bg-primary-container dark:bg-primary/30 text-on-primary-container dark:text-white font-semibold rounded-lg font-label-md text-label-md cursor-pointer w-full text-left">
            <LayoutDashboard size={20} />
            Dashboard
          </button>
          <button onClick={() => router.push("/panel/egresados")} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all font-label-md text-label-md rounded-lg cursor-pointer w-full text-left">
            <GraduationCap size={20} />
            Egresados
          </button>
          <button onClick={() => router.push("/panel/invitados")} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all font-label-md text-label-md rounded-lg cursor-pointer w-full text-left">
            <Users size={20} />
            Invitados
          </button>
          <button onClick={() => router.push("/panel/ceremonias")} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all font-label-md text-label-md rounded-lg cursor-pointer w-full text-left">
            <Calendar size={20} />
            Ceremonias
          </button>
          <button onClick={() => router.push("/panel/reportes")} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all font-label-md text-label-md rounded-lg cursor-pointer w-full text-left">
            <BarChart3 size={20} />
            Reportes
          </button>
          <button onClick={() => router.push("/panel/settings")} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all font-label-md text-label-md rounded-lg cursor-pointer w-full text-left">
            <Settings size={20} />
            Configuración
          </button>
        </div>

        <div className="mt-auto flex flex-col gap-xs pt-md border-t border-outline-variant dark:border-slate-700">
          <button onClick={generarReporte} className="w-full flex items-center justify-center gap-sm px-4 py-3 bg-surface-container-lowest dark:bg-slate-800 border border-on-surface dark:border-slate-600 text-on-surface dark:text-slate-200 rounded-lg hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors font-label-md text-label-md h-12 cursor-pointer">
            <FileSpreadsheet size={16} />
            Exportar Reporte
          </button>
          <button onClick={handleLogout} className="flex items-center gap-sm px-4 py-3 text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 rounded-lg transition-colors font-label-md text-label-md cursor-pointer w-full text-left">
            <LogOut size={20} />
            Cerrar Sesión
          </button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="flex-1 ml-0 md:ml-64 flex flex-col overflow-y-auto pt-16">
        {/* Header */}
        <header className="px-4 md:px-xl py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fadeUp">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                {ceremoniaNombre || "Panel del Encargado"}
              </h1>
              <div className="relative inline-block">
                <select
                  value={ceremoniaActiva ?? ""}
                  onChange={(e) => setCeremoniaActiva(e.target.value || null)}
                  className="appearance-none bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-2xl pl-3 pr-8 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
                >
                  <option value="">Consolidado General</option>
                  {ceremonias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-slate-500" />
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
              Gestión de egresados e invitados en tiempo real
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={generarReporte}
              className="flex items-center gap-2 px-6 py-3 bg-secondary-container text-on-secondary-container rounded-xl text-sm font-medium h-12 hover:bg-secondary transition-all duration-200 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
            >
              <FileSpreadsheet size={20} />
              Generar reporte
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="px-4 md:px-xl pb-xl flex flex-col gap-xl animate-fadeUp">
          {/* KPIs — 4 metricas principales */}
          {metricsLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-20 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Total Egresados", value: displayMetrics.totalEgresados, icon: Users },
                { label: "Invitados Ingresados", value: displayMetrics.invitadosIngresados, icon: CalendarCheck },
                { label: "Egresados Ingresados", value: displayMetrics.egresadosIngresados, icon: GraduationCap },
                { label: "Ceremonias Activas", value: ceremonias.length, icon: Calendar },
              ].map((c) => (
                <div key={c.label} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-start justify-center gap-1">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight line-clamp-2 pr-1">
                      {c.label}
                    </span>
                    <c.icon size={16} className="text-indigo-500 shrink-0" />
                  </div>
                  <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">{c.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}

          {/* Asistencia por Ceremonia */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Asistencia por Ceremonia
            </h3>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Egresados e Invitados que ingresaron
            </p>
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

          {/* Table */}
          <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gray-50/50 dark:bg-slate-800/50">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Lista de Egresados
              </h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400"
                  />
                  <input
                    className="pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none w-full md:w-64 h-10 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-400"
                    placeholder="Buscar egresados..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                {ceremoniaActiva && (
                  <button
                    onClick={() => setShowAddExtratemporal(true)}
                    className="flex items-center gap-2 bg-primary text-on-primary rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all shadow-[0_4px_16px_rgb(0,0,0,0.08)] cursor-pointer"
                  >
                    <Plus size={16} />
                    Agregar Egresado Extratemporal
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      N°
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      DNI
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Nombres
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Apellidos
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                      Programa
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider text-right">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {filtrados.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-6 py-8 text-center text-sm text-gray-500 dark:text-slate-400"
                      >
                        {searchTerm
                          ? "No se encontraron egresados."
                          : "Aún no hay egresados. Importa un archivo Excel."}
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((e) => (
                      <tr
                        key={e.id}
                        className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors h-14"
                      >
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                          {e.numero_orden ?? "-"}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                          {e.dni}
                        </td>
                        <td className="px-6 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {e.nombres}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                          {e.apellidos}
                        </td>
                        <td className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400">
                          {e.programa_academico ?? "-"}
                        </td>
                        <td className="px-6 py-3 text-right relative">
                          <button
                            onClick={() => setOpenMenuEgresado(openMenuEgresado === e.id ? null : e.id)}
                            className="text-gray-400 dark:text-slate-400 hover:text-primary dark:hover:text-primary-fixed-dim transition-colors cursor-pointer"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {openMenuEgresado === e.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 rounded-xl shadow-lg py-1 min-w-[160px]">
                              <button
                                onClick={() => { router.push(`/panel/ceremonias/${ceremoniaActiva}`); setOpenMenuEgresado(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                Ver detalle
                              </button>
                              <button
                                onClick={() => { router.push(`/panel/egresados?dni=${e.dni}`); setOpenMenuEgresado(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer"
                              >
                                Historial del egresado
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>

        {/* ── Extratemporal Modal ── */}
        {showAddExtratemporal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowAddExtratemporal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full maxw-md mx-4 p-6 animate-fadeUp" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registro Extratemporal</h3>
                <button onClick={() => setShowAddExtratemporal(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">DNI *</label>
                  <input type="text" inputMode="numeric" maxLength={8} value={extratemporalForm.dni}
                    onChange={(e) => setExtratemporalForm({ ...extratemporalForm, dni: e.target.value.replace(/\D/g, "") })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    placeholder="12345678" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombres *</label>
                    <input type="text" value={extratemporalForm.nombres}
                      onChange={(e) => setExtratemporalForm({ ...extratemporalForm, nombres: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                      placeholder="Nombres" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellidos *</label>
                    <input type="text" value={extratemporalForm.apellidos}
                      onChange={(e) => setExtratemporalForm({ ...extratemporalForm, apellidos: e.target.value })}
                      className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                      placeholder="Apellidos" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Carrera *</label>
                  <select value={extratemporalForm.carrera}
                    onChange={(e) => setExtratemporalForm({ ...extratemporalForm, carrera: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  >
                    <option value="">Seleccionar carrera</option>
                    {carreras.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">N° de Orden</label>
                  <input type="number" min={1} value={extratemporalForm.numero_orden}
                    onChange={(e) => setExtratemporalForm({ ...extratemporalForm, numero_orden: parseInt(e.target.value) || 1 })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow" />
                  <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Sugerido: {siguienteOrden}</p>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={() => setShowAddExtratemporal(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleAddExtratemporal} disabled={extratemporalSaving}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                  {extratemporalSaving ? "Guardando..." : "Registrar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Toast ── */}
        {extratemporalToast && (
          <div className="fixed top-4 right-4 z-[100] animate-fadeUp">
            <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border ${
              extratemporalToast.type === "success"
                ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32] dark:bg-green-900/50 dark:border-green-700 dark:text-green-300"
                : "bg-error-container border-error text-on-error-container dark:bg-red-900/50 dark:border-red-700 dark:text-red-300"
            }`}>
              <span className="font-body-md text-body-md">{extratemporalToast.message}</span>
              <button onClick={() => setExtratemporalToast(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">&times;</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
