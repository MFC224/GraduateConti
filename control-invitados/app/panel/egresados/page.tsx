"use client";

import { useEffect, useState, useCallback } from "react";
import { Search, UserCheck, Shield, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";

const PAGE_SIZE = 20;

export default function EgresadosPage() {
  const [egresados, setEgresados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedCeremoniaId, setSelectedCeremoniaId] = useState<string | "todas">("todas");
  const [ceremonias, setCeremonias] = useState<{ id: string; nombre: string }[]>([]);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [userSedeId, setUserSedeId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const { data: { session } } = await s.auth.getSession();
        if (!session?.user?.id) return;

        const { data: userData } = await (s.from("usuarios") as any)
          .select("rol, sede_id")
          .eq("id", session.user.id)
          .single();
        if (userData) {
          setUserRol(userData.rol);
          setUserSedeId(userData.sede_id);
        }

        let cerQuery = (s.from("ceremonias") as any)
          .select("id, nombre")
          .order("fecha", { ascending: false });

        if (userData?.rol === "encargado" && userData?.sede_id) {
          cerQuery = cerQuery.eq("sede_id", userData.sede_id);
        }

        const { data: cerData } = await cerQuery;
        setCeremonias(cerData ?? []);
      } catch {}
    })();
  }, []);

  const fetchEgresados = useCallback(async () => {
    setLoading(true);
    try {
      const s = createClient();
      const term = searchTerm.trim();
      let query = (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden, confirmado_asistencia, toga_devuelta, ceremonia_id, ceremonias(nombre, sede_id)", { count: "exact" });

      if (selectedCeremoniaId !== "todas") {
        query = query.eq("ceremonia_id", selectedCeremoniaId);
      } else if (userRol === "encargado" && userSedeId) {
        const { data: cIds } = await (s.from("ceremonias") as any)
          .select("id")
          .eq("sede_id", userSedeId);
        const ids = (cIds ?? []).map((c: any) => c.id);
        if (ids.length > 0) query = query.in("ceremonia_id", ids);
        else query = query.is("ceremonia_id", null);
      }

      if (/^\d{1,8}$/.test(term)) {
        query = query.eq("dni", term);
      } else if (term) {
        query = query.ilike("apellidos", `%${term}%`);
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, count } = await query
        .order("apellidos", { ascending: true })
        .range(from, to);

      setEgresados(data ?? []);
      setTotalCount(count ?? 0);
    } catch {} finally {
      setLoading(false);
    }
  }, [searchTerm, currentPage, selectedCeremoniaId, userRol, userSedeId]);

  useEffect(() => {
    fetchEgresados();
  }, [fetchEgresados]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function handleSearch(value: string) {
    setSearchTerm(value);
    setCurrentPage(0);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
              Base Central de Egresados
            </h1>
            <p className="text-base text-gray-500 dark:text-slate-400">
              {userRol === "admin_general" ? "Todos los egresados del sistema." : "Egresados de tu sede."}
              {" "}{totalCount} registro(s)
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 items-end w-full md:w-auto">
            <div className="w-full md:w-64">
              <label className="block text-xs font-medium text-gray-500 dark:text-slate-400 mb-1">
                Filtrar por Ceremonia
              </label>
              <select
                value={selectedCeremoniaId}
                onChange={(e) => {
                  setSelectedCeremoniaId(e.target.value);
                  setCurrentPage(0);
                }}
                className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
              >
                <option value="todas">Todas las ceremonias</option>
                {ceremonias.map((c) => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </div>
            <div className="relative w-full md:w-80">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Buscar por DNI o Apellidos..."
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-gray-400 dark:placeholder-slate-500"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-700 rounded-2xl overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">N°</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">DNI</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Egresado</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Carrera</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Ceremonia</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Asistencia</th>
                      <th className="px-4 py-3 text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Toga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {egresados.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                          {searchTerm ? "No se encontraron egresados." : "No hay egresados registrados."}
                        </td>
                      </tr>
                    ) : (
                      egresados.map((e) => (
                        <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{e.numero_orden ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-slate-300">{e.dni}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 dark:text-white font-medium">{e.apellidos}, {e.nombres}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{e.programa_academico ?? "—"}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-slate-400">{e.ceremonias?.nombre ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              e.confirmado_asistencia
                                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                : "bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-400"
                            }`}>
                              <UserCheck size={14} />
                              {e.confirmado_asistencia ? "SÍ" : "NO"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                              e.toga_devuelta
                                ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                                : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                            }`}>
                              <Shield size={14} />
                              {e.toga_devuelta ? "Devuelta" : "Pendiente"}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-slate-700">
                <span className="text-sm text-gray-500 dark:text-slate-400">
                  Mostrando {currentPage * PAGE_SIZE + 1} - {Math.min((currentPage + 1) * PAGE_SIZE, totalCount)} de {totalCount} egresados
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                  >
                    <ChevronLeft size={16} className="inline mr-1" /> Anterior
                  </button>
                  <button
                    onClick={() => setCurrentPage((p) => p + 1)}
                    disabled={(currentPage + 1) * PAGE_SIZE >= totalCount}
                    className="px-4 py-2 border rounded-lg text-sm font-medium transition-all hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300"
                  >
                    Siguiente <ChevronRight size={16} className="inline ml-1" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
