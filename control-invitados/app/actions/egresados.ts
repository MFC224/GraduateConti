"use server";

import { createClient } from "@supabase/supabase-js";
import { registrarAuditoria } from "./auditoria";
import { capitalizarNombre } from "@/app/utils/formatters";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const COLUMN_ALIASES: Record<string, string> = {
  numero: "numero_orden",
  numero_orden: "numero_orden",
  dni: "dni",
  apellidos: "apellidos",
  apellido: "apellidos",
  nombres: "nombres",
  nombre: "nombres",
  nombres_completos: "nombres",
  carrera: "programa_academico",
  programa_academico: "programa_academico",
  programa: "programa_academico",
};

function mapearColumnas(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(row)) {
    const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "_").trim();
    const target = COLUMN_ALIASES[normalizedKey];
    if (target && val != null && val !== "") {
      if (!out[target] || out[target] === "") out[target] = val;
    }
  }
  return out;
}

export async function importarEgresadosMasivo(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const ceremoniaId = formData.get("ceremoniaId") as string;
  const raw = formData.get("egresados") as string;

  if (!ceremoniaId || !raw) {
    return { success: false, error: "Faltan datos requeridos." };
  }

  let egresados: any[];
  try {
    egresados = JSON.parse(raw);
  } catch {
    return { success: false, error: "Formato de datos inválido." };
  }

  if (!Array.isArray(egresados) || egresados.length === 0) {
    return { success: false, error: "No hay egresados para importar." };
  }

  const rows = egresados.map((e: any) => {
    const m = mapearColumnas(e);
    return {
      ceremonia_id: ceremoniaId,
      numero_orden: m.numero_orden != null ? parseInt(String(m.numero_orden), 10) : null,
      dni: String(m.dni ?? "").trim(),
      nombres: capitalizarNombre(String(m.nombres ?? "").trim()),
      apellidos: capitalizarNombre(String(m.apellidos ?? "").trim()),
      programa_academico: m.programa_academico ? capitalizarNombre(String(m.programa_academico).trim()) : null,
    };
  });

  const valid = rows.filter((r) => r.dni && r.nombres && r.apellidos);
  if (valid.length === 0) {
    return { success: false, error: "Ninguna fila contenía datos válidos (dni, nombres, apellidos)." };
  }

  const { count: borrados } = await supabase
    .from("egresados")
    .delete({ count: "exact" })
    .eq("ceremonia_id", ceremoniaId);

  const { error } = await supabase.from("egresados").insert(valid);

  if (error) {
    return { success: false, error: error.message };
  }

  const fileName = formData.get("fileName") as string || "desconocido.xlsx";

  registrarAuditoria({
    accion: "reemplazar_lista_excel",
    entidad: "ceremonias",
    entidad_id: ceremoniaId,
    detalle: {
      cantidad_borrados: borrados ?? 0,
      cantidad_ingresados: valid.length,
      archivo: fileName,
    },
  }).catch(() => {});

  return { success: true, error: null, count: valid.length };
}

export async function marcarAlumnoDiscurso(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const egresadoId = formData.get("egresadoId") as string;
  const ceremoniaId = formData.get("ceremoniaId") as string;

  if (!egresadoId || !ceremoniaId) {
    return { success: false, error: "Faltan datos requeridos." };
  }

  const { error: resetError } = await supabase
    .from("egresados")
    .update({ es_discurso: false })
    .eq("ceremonia_id", ceremoniaId)
    .eq("es_discurso", true);

  if (resetError) return { success: false, error: resetError.message };

  const { error: setError } = await supabase
    .from("egresados")
    .update({ es_discurso: true })
    .eq("id", egresadoId)
    .eq("ceremonia_id", ceremoniaId);

  if (setError) return { success: false, error: setError.message };

  registrarAuditoria({
    accion: "marcar_alumno_discurso",
    entidad: "egresados",
    entidad_id: egresadoId,
    detalle: { ceremonia_id: ceremoniaId },
  }).catch(() => {});

  return { success: true, error: null };
}

export async function trasladarEgresadoCeremonia(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const egresadoId = formData.get("egresadoId") as string;
  const nuevaCeremoniaId = formData.get("nuevaCeremoniaId") as string;

  if (!egresadoId || !nuevaCeremoniaId) {
    return { success: false, error: "Faltan datos requeridos." };
  }

  const { data: egresado, error: fetchError } = await supabase
    .from("egresados")
    .select("ceremonia_id")
    .eq("id", egresadoId)
    .single();

  if (fetchError || !egresado) {
    return { success: false, error: "Egresado no encontrado." };
  }

  const { error } = await supabase
    .from("egresados")
    .update({ ceremonia_id: nuevaCeremoniaId })
    .eq("id", egresadoId);

  if (error) return { success: false, error: error.message };

  registrarAuditoria({
    accion: "trasladar_egresado_ceremonia",
    entidad: "egresados",
    entidad_id: egresadoId,
    detalle: { ceremonia_origen: egresado.ceremonia_id, ceremonia_destino: nuevaCeremoniaId },
  }).catch(() => {});

  return { success: true, error: null };
}

export async function actualizarCupoBase(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const ceremoniaId = formData.get("ceremoniaId") as string;
  const cupo = formData.get("cupo") as string;

  if (!ceremoniaId || !cupo) {
    return { success: false, error: "Faltan datos requeridos." };
  }

  const { error } = await supabase
    .from("ceremonias")
    .update({ cupo_base_invitado: parseInt(cupo, 10) })
    .eq("id", ceremoniaId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
