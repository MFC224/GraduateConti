"use client";

import { useEffect, useState, useCallback } from "react";
import {
  FileSpreadsheet,
  Calendar,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";


export default function ReportesPage() {
  const [fecha, setFecha] = useState("");
  const [ceremonias, setCeremonias] = useState<any[]>([]);
  const [ceremoniaId, setCeremoniaId] = useState("");
  const [loadingCeremonias, setLoadingCeremonias] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previa, setPrevia] = useState<any[] | null>(null);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [ceremoniasPaginadas, setCeremoniasPaginadas] = useState<any[]>([]);
  const [loadingPaginated, setLoadingPaginated] = useState(false);
  const PAGE_SIZE = 10;

  const fetchCeremoniasPaginadas = useCallback(async () => {
    setLoadingPaginated(true);
    try {
      const s = createClient();
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, count } = await (s.from("ceremonias") as any)
        .select("id, nombre, sede_id, fecha, hora_inicio, estado", { count: "exact" })
        .order("fecha", { ascending: false })
        .order("hora_inicio", { ascending: false })
        .range(from, to);
      setCeremoniasPaginadas(data ?? []);
      if (count !== null) setTotalCount(count);
    } catch {}
    setLoadingPaginated(false);
  }, [page]);

  useEffect(() => {
    fetchCeremoniasPaginadas();
  }, [fetchCeremoniasPaginadas]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function buscarCeremoniasPorFecha(f: string) {
    if (!f) {
      setCeremonias([]);
      setCeremoniaId("");
      setPrevia(null);
      return;
    }
    setLoadingCeremonias(true);
    setCeremoniaId("");
    setPrevia(null);
    try {
      const s = createClient();
      const { data } = await (s.from("ceremonias") as any)
        .select("id, nombre, sede_id, fecha, hora_inicio, estado")
        .eq("fecha", f)
        .order("hora_inicio", { ascending: true });
      setCeremonias(data ?? []);
    } catch {}
    setLoadingCeremonias(false);
  }

  async function fetchReportData(cId: string) {
    const s = createClient();
    const [egresadosRes, invitadosRes] = await Promise.all([
      (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden, equipo_entregado_at, equipo_entregado_por, operario:usuarios!equipo_entregado_por(nombres, apellidos), confirmado_asistencia, toga_devuelta, dni_retenido, dni_devuelto_at")
        .eq("ceremonia_id", cId)
        .order("numero_orden", { ascending: true }),
      (s.from("invitados") as any)
        .select("id, dni, nombres, apellidos, tipo_cupo, estado, ingreso_at, metodo_ingreso, egresado_id")
        .eq("ceremonia_id", cId)
        .order("nombres", { ascending: true }),
    ]);

    const egresados = egresadosRes.data ?? [];
    const invitados = invitadosRes.data ?? [];

    const rows: any[] = [];

    egresados.forEach((e: any) => {
      rows.push({
        Tipo: "Egresado",
        "N° Orden": e.numero_orden ?? "—",
        Nombres: e.nombres,
        Apellidos: e.apellidos,
        DNI: e.dni,
        "Programa Académico": e.programa_academico ?? "—",
        "Confirmó Asistencia": e.confirmado_asistencia ? "SÍ" : "NO",
        "Equipo Entregado": e.equipo_entregado_at ? "SÍ" : "NO",
        "Entregado Por": e.operario ? `${e.operario.nombres} ${e.operario.apellidos}` : "—",
        "Toga Devuelta": e.toga_devuelta ? "SÍ" : "NO",
        "DNI Devuelto": e.dni_devuelto_at ? "SÍ" : "NO",
      });
    });

    const egresadosMap = new Map(egresados.map((e: any) => [e.id, `${e.apellidos}, ${e.nombres}`]));

    invitados.forEach((i: any) => {
      rows.push({
        Tipo: "Invitado",
        "N° Orden": "—",
        Nombres: i.nombres,
        Apellidos: i.apellidos,
        DNI: i.dni,
        "Programa Académico": "—",
        "Confirmó Asistencia": "—",
        "Equipo Entregado": "—",
        "Entregado Por": "—",
        "Toga Devuelta": "—",
        "DNI Devuelto": "—",
        "Invitado de": egresadosMap.get(i.egresado_id) ?? "—",
        "Estado Ingreso":
          i.ingreso_at
            ? "Ingresó"
            : "Registrado",
        "Ingreso At": i.ingreso_at ? new Date(i.ingreso_at).toLocaleString("es-PE") : "—",
        "Método Ingreso": i.metodo_ingreso ?? "—",
      });
    });

    return rows;
  }

  async function handleGenerate() {
    if (!ceremoniaId) {
      setToast({ type: "error", message: "Selecciona una ceremonia." });
      return;
    }
    setGenerating(true);
    setPrevia(null);
    try {
      const rows = await fetchReportData(ceremoniaId);
      setPrevia(rows);

      if (rows.length === 0) {
        setToast({ type: "error", message: "No hay datos registrados en esta ceremonia para exportar." });
        setGenerating(false);
        return;
      }

      const res = await fetch(`/api/reportes/excel?ceremonia_id=${encodeURIComponent(ceremoniaId)}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? `Error del servidor (${res.status})`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.headers.get("Content-Disposition")?.split('filename="')[1]?.split('"')[0] ?? "reporte.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setToast({ type: "success", message: `Reporte exportado: ${rows.length} registros.` });
    } catch (err: any) {
      setToast({ type: "error", message: err?.message ?? "Error al generar el reporte." });
    }
    setGenerating(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
            Reportes
          </h1>
          <p className="text-base text-gray-500 dark:text-slate-400">
            Exporta reportes consolidados de egresados e invitados por ceremonia.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-64">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Filtrar por Fecha
              </label>
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => {
                    setFecha(e.target.value);
                    buscarCeremoniasPorFecha(e.target.value);
                  }}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
              </div>
            </div>

            <div className="w-full md:w-80">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                Ceremonia
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                <select
                  value={ceremoniaId}
                  onChange={(e) => setCeremoniaId(e.target.value)}
                  disabled={!fecha || loadingCeremonias}
                  className="w-full appearance-none border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {loadingCeremonias ? "Buscando..." : !fecha ? "Selecciona una fecha primero" : "Seleccionar ceremonia"}
                  </option>
                  {ceremonias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — {c.hora_inicio?.slice(0, 5) ?? "—"} ({c.estado === "en_curso" ? "En Curso" : "Planificada"})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={!ceremoniaId || generating}
              className="flex items-center gap-2 bg-primary text-on-primary px-6 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_16px_rgb(0,0,0,0.08)]"
            >
              {generating ? (
                <><Loader2 size={18} className="animate-spin" /> Generando...</>
              ) : (
                <><FileSpreadsheet size={18} /> Generar Reporte Excel</>
              )}
            </button>
          </div>

          {ceremonias.length === 0 && fecha && !loadingCeremonias && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-4">
              No se encontraron ceremonias para esta fecha.
            </p>
          )}
        </div>

        {/* Preview */}
        {previa && previa.length > 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-green-600 dark:text-green-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Vista Previa ({previa.length} registros)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                    {Object.keys(previa[0]).map((col) => (
                      <th key={col} className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300 whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {previa.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-4 py-2.5 text-gray-600 dark:text-slate-400 whitespace-nowrap">
                          {val ?? "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {previa.length > 50 && (
                <p className="px-6 py-3 text-sm text-gray-500 dark:text-slate-400 border-t border-gray-100 dark:border-slate-700">
                  Mostrando 50 de {previa.length} registros. El Excel completo se descargó con todos los datos.
                </p>
              )}
            </div>
          </div>
        )}

        {previa && previa.length === 0 && (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-8 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <AlertCircle size={36} className="mx-auto text-gray-300 dark:text-slate-600 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Sin datos</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              No se encontraron egresados ni invitados para esta ceremonia.
            </p>
          </div>
        )}

        {/* Paginated Ceremonies List */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Historial de Ceremonias
            </h3>
            <span className="text-sm text-gray-500 dark:text-slate-400">
              {totalCount} registros
            </span>
          </div>
          {loadingPaginated ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-gray-400" />
            </div>
          ) : ceremoniasPaginadas.length === 0 ? (
            <div className="py-12 text-center text-gray-500 dark:text-slate-400 text-sm">
              No hay ceremonias registradas.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-slate-700/50 border-b border-gray-200 dark:border-slate-700">
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Nombre</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Fecha</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Hora</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300">Estado</th>
                      <th className="px-4 py-3 font-semibold text-gray-700 dark:text-slate-300"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {ceremoniasPaginadas.map((c) => (
                      <tr
                        key={c.id}
                        className={`transition-colors cursor-pointer ${
                          c.id === ceremoniaId
                            ? "bg-indigo-500/10 dark:bg-indigo-500/20 hover:bg-indigo-500/15 dark:hover:bg-indigo-500/25"
                            : "hover:bg-gray-50 dark:hover:bg-slate-700/30"
                        }`}
                        onClick={() => {
                          setFecha(c.fecha);
                          setCeremoniaId(c.id);
                          buscarCeremoniasPorFecha(c.fecha);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        <td className="px-4 py-2.5 text-gray-900 dark:text-white font-medium">
                          {c.nombre}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400">
                          {c.fecha}
                        </td>
                        <td className="px-4 py-2.5 text-gray-600 dark:text-slate-400">
                          {c.hora_inicio?.slice(0, 5) ?? "—"}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            c.estado === "finalizada"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : c.estado === "en_curso"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
                                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                          }`}>
                            {c.estado === "finalizada"
                              ? "Finalizada"
                              : c.estado === "en_curso"
                                ? "En Curso"
                                : "Planificada"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className="text-primary dark:text-primary text-sm font-medium">
                            Reporte
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700">
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Página {page + 1} de {Math.max(1, Math.ceil(totalCount / PAGE_SIZE))}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                  >
                    <ChevronLeft size={16} className="inline mr-1" />
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={(page + 1) * PAGE_SIZE >= totalCount}
                    className="px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                  >
                    Siguiente
                    <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast */}
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
    </div>
  );
}
