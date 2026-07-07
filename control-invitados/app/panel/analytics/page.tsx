"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { ChevronDown } from "lucide-react";

type ResumenRow = {
  ceremonia_id: string;
  ceremonia_nombre: string;
  aforo_total_invitados: number;
  total_egresados: number;
  invitados_aprobados: number;
  invitados_ingresados: number;
  aforo_libre: number;
  sede_nombre: string;
};

const COLORS = {
  egresados: "#7c3aed",
  invitados: "#f59e0b",
  ingresados: "#22c55e",
  aprobados: "#f59e0b",
  libre: "#94a3b8",
};

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-gray-600 dark:text-slate-400" style={{ color: p.color }}>
          {p.name}: {p.value.toLocaleString()}
        </p>
      ))}
    </div>
  );
}

function PieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
      <p className="text-gray-600 dark:text-slate-400" style={{ color: d.color }}>
        {d.payload.value.toLocaleString()} ({d.payload.pct}%)
      </p>
    </div>
  );
}



export default function AnalyticsPage() {
  const [resumenes, setResumenes] = useState<ResumenRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCeremoniaId, setSelectedCeremoniaId] = useState<string>("");


  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const hoy = new Date().toISOString().split("T")[0];

        const { data: ceremonies } = await (s.from("ceremonias") as any)
          .select("id, nombre, fecha, hora_inicio, estado, sede_id")
          .or(`estado.in.(planificada,en_curso),fecha.gte.${hoy}`)
          .order("fecha", { ascending: true });

        if (!ceremonies?.length) {
          setLoading(false);
          return;
        }

        const ids = ceremonies.map((c: any) => c.id);

        const [resData, sedesData] = await Promise.all([
          (s.from("v_resumen_ceremonia") as any).select("*").in("ceremonia_id", ids),
          (s.from("sedes") as any).select("id, nombre").eq("activo", true),
        ]);

        const sedeNombre = Object.fromEntries((sedesData?.data ?? []).map((se: any) => [se.id, se.nombre]));

        const rows: ResumenRow[] = (resData?.data ?? []).map((r: any) => {
          const cer = ceremonies.find((c: any) => c.id === r.ceremonia_id);
          return {
            ceremonia_id: r.ceremonia_id,
            ceremonia_nombre: r.ceremonia_nombre,
            aforo_total_invitados: r.aforo_total_invitados,
            total_egresados: r.total_egresados,
            invitados_aprobados: r.invitados_aprobados,
            invitados_ingresados: r.invitados_ingresados,
            aforo_libre: r.aforo_libre,
            sede_nombre: sedeNombre[cer?.sede_id] ?? "—",
          };
        });

        setResumenes(rows);
        if (rows.length > 0) setSelectedCeremoniaId(rows[0].ceremonia_id);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const selected = resumenes.find((r) => r.ceremonia_id === selectedCeremoniaId);

  const pieData = selected
    ? [
        { name: "Ingresados", value: selected.invitados_ingresados, pct: selected.aforo_total_invitados ? Math.round((selected.invitados_ingresados / selected.aforo_total_invitados) * 100) : 0, color: COLORS.ingresados },
        { name: "Aprobados (sin llegar)", value: Math.max(0, selected.invitados_aprobados - selected.invitados_ingresados), pct: selected.aforo_total_invitados ? Math.round((Math.max(0, selected.invitados_aprobados - selected.invitados_ingresados) / selected.aforo_total_invitados) * 100) : 0, color: COLORS.aprobados },
        { name: "Aforo Libre", value: Math.max(0, selected.aforo_libre), pct: selected.aforo_total_invitados ? Math.round((selected.aforo_libre / selected.aforo_total_invitados) * 100) : 0, color: COLORS.libre },
      ].filter((d) => d.value > 0)
    : [];

  const barData = resumenes.map((r) => ({
    name: r.ceremonia_nombre.length > 20 ? r.ceremonia_nombre.slice(0, 20) + "…" : r.ceremonia_nombre,
    "Total Egresados": r.total_egresados,
    "Invitados Ingresados": r.invitados_ingresados,
  }));

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-1">
            Analytics
          </h1>
          <p className="text-base text-gray-500 dark:text-slate-400">
            Visualiza métricas y ocupación de ceremonias activas.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-6 h-80 animate-pulse" />
            ))}
          </div>
        ) : resumenes.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-12 text-center shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <p className="text-gray-500 dark:text-slate-400">No hay ceremonias activas para mostrar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Asistencia por Ceremonia */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Comparación de Asistencia
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
                Total egresados vs invitados ingresados por ceremonia.
              </p>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={barData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <YAxis tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 13, paddingTop: 12 }} />
                  <Bar dataKey="Total Egresados" fill={COLORS.egresados} radius={[6, 6, 0, 0]} maxBarSize={48} />
                  <Bar dataKey="Invitados Ingresados" fill={COLORS.invitados} radius={[6, 6, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Aforo Donut */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Estado del Aforo
                </h3>
                <div className="relative">
                  <select
                    value={selectedCeremoniaId}
                    onChange={(e) => setSelectedCeremoniaId(e.target.value)}
                    className="appearance-none border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl pl-3 pr-8 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {resumenes.map((r) => (
                      <option key={r.ceremonia_id} value={r.ceremonia_id}>{r.ceremonia_nombre}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 pointer-events-none" />
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
                {selected?.sede_nombre} — Aforo total: {selected?.aforo_total_invitados.toLocaleString() ?? "—"}
              </p>
              {pieData.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-16">No hay datos de aforo.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={110}
                      dataKey="value"
                      nameKey="name"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: 13, paddingTop: 8 }}
                      formatter={(value) => <span className="text-gray-700 dark:text-slate-300">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Summary cards */}
            <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Resumen Global
              </h3>
              <div className="space-y-4">
                {[
                  { label: "Ceremonias Activas", value: resumenes.length, color: "text-primary" },
                  { label: "Total Egresados", value: resumenes.reduce((s, r) => s + r.total_egresados, 0), color: "text-[#7c3aed]" },
                  { label: "Invitados Ingresados", value: resumenes.reduce((s, r) => s + r.invitados_ingresados, 0), color: "text-[#22c55e]" },
                  { label: "Invitados Aprobados", value: resumenes.reduce((s, r) => s + r.invitados_aprobados, 0), color: "text-[#f59e0b]" },
                  { label: "Aforo Libre Total", value: resumenes.reduce((s, r) => s + Math.max(0, r.aforo_libre), 0), color: "text-[#94a3b8]" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">{item.label}</span>
                    <span className={`text-lg font-bold ${item.color}`}>{item.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
