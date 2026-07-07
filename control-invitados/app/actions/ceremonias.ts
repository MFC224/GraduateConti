"use server";

import { createClient } from "@supabase/supabase-js";
import { registrarAuditoria } from "./auditoria";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function crearCeremonia(formData: FormData) {
  try {
    const supabase = getAdminClient();
    if (!supabase) return { error: "Configuración del servidor faltante." };

    const currentUserRol = formData.get("currentUserRol") as string;
    if (currentUserRol !== "admin_general" && currentUserRol !== "encargado") {
      return { error: "No tienes permiso para crear ceremonias." };
    }

    const nombre = formData.get("nombre") as string;
    const sede_id = formData.get("sede_id") as string;
    const programa_principal = formData.get("programa_principal") as string;
    const fecha = formData.get("fecha") as string;
    const hora_inicio = formData.get("hora_inicio") as string;
    const aforo_total_invitados = formData.get("aforo_total_invitados") as string;
    const cupo_base_invitado = formData.get("cupo_base_invitado") as string;

    if (!nombre || !sede_id || !fecha || !hora_inicio || !aforo_total_invitados) {
      return { error: "Completa todos los campos obligatorios." };
    }

    const { data, error } = await supabase.from("ceremonias").insert({
      nombre,
      sede_id,
      programa_principal: programa_principal || null,
      fecha,
      hora_inicio,
      aforo_total_invitados: parseInt(aforo_total_invitados, 10),
      cupo_base_invitado: cupo_base_invitado ? parseInt(cupo_base_invitado, 10) : 3,
      estado: "planificada",
    }).select("id").single();

    if (error) {
      console.error(error);
      return { error: error.message };
    }

    registrarAuditoria({
      accion: "crear_ceremonia",
      entidad: "ceremonias",
      entidad_id: data?.id,
      detalle: { nombre, aforo_total_invitados: parseInt(aforo_total_invitados, 10) },
    }).catch(() => {});

    return { error: null };
  } catch (error: any) {
    console.error("Error inesperado en crearCeremonia:", error);
    return { error: error?.message ?? "Error interno del servidor." };
  }
}

export async function editarCeremonia(formData: FormData) {
  try {
    const supabase = getAdminClient();
    if (!supabase) return { error: "Configuración del servidor faltante." };

    const currentUserRol = formData.get("currentUserRol") as string;
    if (currentUserRol !== "admin_general") {
      return { error: "Solo admin_general puede editar ceremonias." };
    }

    const id = formData.get("id") as string;
    if (!id) return { error: "ID de ceremonia no proporcionado." };

    const campos: Record<string, unknown> = {};
    const mapeo: [string, string][] = [
      ["nombre", "nombre"],
      ["sede_id", "sede_id"],
      ["programa_principal", "programa_principal"],
      ["fecha", "fecha"],
      ["hora_inicio", "hora_inicio"],
      ["estado", "estado"],
    ];
    for (const [key, col] of mapeo) {
      const val = formData.get(key) as string;
      if (val !== null) campos[col] = val;
    }
    const aforo = formData.get("aforo_total_invitados") as string;
    if (aforo) campos.aforo_total_invitados = parseInt(aforo, 10);
    const cupo = formData.get("cupo_base_invitado") as string;
    if (cupo) campos.cupo_base_invitado = parseInt(cupo, 10);

    if (Object.keys(campos).length === 0) {
      return { error: "No hay campos para actualizar." };
    }

    const { error } = await supabase.from("ceremonias").update(campos).eq("id", id);

    if (error) {
      console.error(error);
      return { error: error.message };
    }

    registrarAuditoria({
      accion: "editar_ceremonia",
      entidad: "ceremonias",
      entidad_id: id,
      detalle: campos,
    }).catch(() => {});

    return { error: null };
  } catch (error: any) {
    console.error("Error inesperado en editarCeremonia:", error);
    return { error: error?.message ?? "Error interno del servidor." };
  }
}

export async function finalizarCeremonia(formData: FormData) {
  try {
    const supabase = getAdminClient();
    if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

    const ceremoniaId = formData.get("ceremoniaId") as string;
    if (!ceremoniaId) return { success: false, error: "ID de ceremonia no proporcionado." };

    const { count: invitadosIngresados } = await (supabase as any)
      .from("invitados")
      .select("*", { count: "exact", head: true })
      .eq("ceremonia_id", ceremoniaId)
      .not("ingreso_at", "is", null);

    const { error: updateError } = await supabase
      .from("ceremonias")
      .update({ estado: "finalizada", conteo_final_invitados: invitadosIngresados ?? 0 })
      .eq("id", ceremoniaId);

    if (updateError) return { success: false, error: updateError.message };

    const { error: deleteError } = await supabase
      .from("invitados")
      .delete()
      .eq("ceremonia_id", ceremoniaId);

    if (deleteError) return { success: false, error: deleteError.message };

    registrarAuditoria({
      accion: "finalizar_ceremonia",
      entidad: "ceremonias",
      entidad_id: ceremoniaId,
      detalle: { conteo_final_invitados: invitadosIngresados ?? 0 },
    }).catch(() => {});

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error?.message ?? "Error interno del servidor." };
  }
}

export async function actualizarAutoridades(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const ceremoniaId = formData.get("ceremoniaId") as string;
  const autoridadesRaw = formData.get("autoridades") as string;

  if (!ceremoniaId || !autoridadesRaw) {
    return { success: false, error: "Faltan datos requeridos." };
  }

  let autoridades: any[];
  try {
    autoridades = JSON.parse(autoridadesRaw);
  } catch {
    return { success: false, error: "Formato de autoridades inválido." };
  }

  if (!Array.isArray(autoridades)) {
    return { success: false, error: "Autoridades debe ser un arreglo." };
  }

  const { error } = await supabase
    .from("ceremonias")
    .update({ autoridades })
    .eq("id", ceremoniaId);

  if (error) return { success: false, error: error.message };

  registrarAuditoria({
    accion: "actualizar_autoridades",
    entidad: "ceremonias",
    entidad_id: ceremoniaId,
    detalle: { cantidad: autoridades.length },
  }).catch(() => {});

  return { success: true, error: null };
}
