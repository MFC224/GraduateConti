"use client";

import { useEffect, useState } from "react";
import { Users, Table, CheckCircle, ShieldCheck, Undo2, Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Metricas = {
  total_egresados: number;
  aforo_libre: number;
  invitados_ingresados: number;
  egresados_con_equipo: number;
  togas_por_devolver: number;
  dnis_en_custodia: number;
};

const CACHE_KEY = "resumen_ceremonia_cache";

export default function ResumenCeremonia({
  ceremoniaId,
}: {
  ceremoniaId: string | null;
}) {
  const [m, setM] = useState<Metricas>({
    total_egresados: 0,
    aforo_libre: 0,
    invitados_ingresados: 0,
    egresados_con_equipo: 0,
    togas_por_devolver: 0,
    dnis_en_custodia: 0,
  });
  const [loading, setLoading] = useState(true);

  async function fetchMetricas() {
    if (!ceremoniaId) return;
    try {
      const s = createClient();
      const { data } = await (s
        .from("v_resumen_ceremonia") as any)
        .select("*")
        .eq("ceremonia_id", ceremoniaId)
        .single();

      const { data: eqData } = await (s
        .from("egresados") as any)
        .select("id", { count: "exact", head: true })
        .eq("ceremonia_id", ceremoniaId)
        .not("equipo_entregado_at", "is", null);

      const { count: egresadosIngresados } = await (s.from("egresados") as any)
        .select("*", { count: "exact", head: true })
        .eq("ceremonia_id", ceremoniaId)
        .or("ingreso_evento.eq.true,confirmado_asistencia.eq.true");

      const { count: togasPendientes } = await (s.from("egresados") as any)
        .select("id", { count: "exact", head: true })
        .eq("ceremonia_id", ceremoniaId)
        .eq("confirmado_asistencia", true)
        .or("toga_devuelta.is.null,toga_devuelta.neq.true");

      const { count: dnisCustodia } = await (s.from("egresados") as any)
        .select("id", { count: "exact", head: true })
        .eq("ceremonia_id", ceremoniaId)
        .eq("dni_retenido", true);

      const base = (data ?? {}) as Metricas;
      const aforoLibreReal = Math.max(0, 180 - (base.invitados_ingresados ?? 0) - (egresadosIngresados ?? 0));
      setM({
        ...base,
        aforo_libre: aforoLibreReal,
        egresados_con_equipo: eqData?.length ?? 0,
        togas_por_devolver: togasPendientes ?? 0,
        dnis_en_custodia: dnisCustodia ?? 0,
      });
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ ...base, aforo_libre: aforoLibreReal, egresados_con_equipo: eqData?.length ?? 0, togas_por_devolver: togasPendientes ?? 0, dnis_en_custodia: dnisCustodia ?? 0 }));
      } catch {}
    } catch {
      try {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached) setM(JSON.parse(cached));
      } catch {}
    } finally {
      setLoading(false);
    }
  }

  /* ───── Realtime subscription ───── */
  useEffect(() => {
    if (!ceremoniaId) return;
    fetchMetricas();

    const s = createClient();
    const channel = s
      .channel("resumen-ceremonia-" + ceremoniaId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "egresados" },
        () => fetchMetricas()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invitados" },
        () => fetchMetricas()
      )
      .subscribe();

    return () => {
      s.removeChannel(channel);
    };
  }, [ceremoniaId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-6 gap-gutter">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant h-32 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Total Egresados",
      value: m.total_egresados,
      icon: Users,
      color: "text-on-surface",
    },
    {
      label: "Aforo Libre",
      value: m.aforo_libre,
      icon: Table,
      color: "text-on-surface",
    },
    {
      label: "Ingresados",
      value: m.invitados_ingresados,
      icon: CheckCircle,
      color: "text-primary",
    },
    {
      label: "Con Equipo",
      value: m.egresados_con_equipo,
      icon: ShieldCheck,
      color: "text-on-surface",
    },
    {
      label: "Togas x Devolver",
      value: m.togas_por_devolver,
      icon: Undo2,
      color: "text-amber-600 dark:text-amber-400",
    },
    {
      label: "DNIs Custodia",
      value: m.dnis_en_custodia,
      icon: Shield,
      color: "text-purple-600 dark:text-purple-400",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-gutter">
      {cards.map((c) => (
        <div
          key={c.label}
          className="bg-surface-container-lowest p-md rounded-xl border border-outline-variant flex flex-col justify-between h-32 hover:bg-surface-container-low transition-colors"
        >
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {c.label}
            </span>
            <div className="w-8 h-8 rounded-full bg-surface-variant flex items-center justify-center">
              <c.icon size={18} className="text-secondary" />
            </div>
          </div>
          <div className={`font-display-lg text-display-lg ${c.color}`}>
            {c.value.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
