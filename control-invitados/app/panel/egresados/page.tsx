"use client";

import { useEffect, useState } from "react";
import { Search, Users, GraduationCap, UserCheck, Shield, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";

export default function EgresadosPage() {
  const [egresados, setEgresados] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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

        let query = (s.from("egresados") as any)
          .select("id, dni, nombres, apellidos, programa_academico, numero_orden, confirmado_asistencia, toga_devuelta, ceremonia_id, ceremonias(nombre, sede_id)")
          .order("apellidos", { ascending: true });

        if (userData?.rol === "encargado" && userData?.sede_id) {
          const { data: cIds } = await (s.from("ceremonias") as any)
            .select("id")
            .eq("sede_id", userData.sede_id);
          const ids = (cIds ?? []).map((c: any) => c.id);
          if (ids.length > 0) query = query.in("ceremonia_id", ids);
          else query = query.is("ceremonia_id", null);
        }

        const { data } = await query;
        setEgresados(data ?? []);
      } catch {} finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtrados = egresados.filter((e) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return e.dni.includes(t) || e.apellidos?.toLowerCase().includes(t);
  });

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
              {" "}{!loading && `${filtrados.length} registros`}
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por DNI o Apellidos..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder-gray-400 dark:placeholder-slate-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-primary" />
          </div>
        ) : (
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
                  {filtrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500 dark:text-slate-400">
                        {searchTerm ? "No se encontraron egresados." : "No hay egresados registrados."}
                      </td>
                    </tr>
                  ) : (
                    filtrados.map((e) => (
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
        )}
      </div>
    </div>
  );
}
