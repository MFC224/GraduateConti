"use server";

import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { capitalizarNombre } from "@/app/utils/formatters";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function agregarInvitado(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const cookieStore = await cookies();
  const egresadoId = cookieStore.get("egresado_session")?.value;
  if (!egresadoId) {
    return { success: false, error: "Sesión de egresado no válida. Vuelve a ingresar." };
  }

  const dni = (formData.get("dni") as string)?.trim() ?? "";
  const nombres = (formData.get("nombres") as string)?.trim() ?? "";
  const apellidos = (formData.get("apellidos") as string)?.trim() ?? "";
  const esMenor7 = formData.get("es_menor_7") === "true";

  if (!/^\d{1,8}$/.test(dni)) {
    return { success: false, error: "El DNI debe ser numérico y tener máximo 8 dígitos." };
  }
  if (!nombres || !apellidos) {
    return { success: false, error: "Completa todos los campos." };
  }

  const { data: egresado } = await (supabase.from("egresados") as any)
    .select("id, ceremonia_id")
    .eq("id", egresadoId)
    .single();
  if (!egresado) {
    return { success: false, error: "Egresado no encontrado." };
  }

  const { data: ceremonia } = await (supabase.from("ceremonias") as any)
    .select("cupo_base_invitado")
    .eq("id", egresado.ceremonia_id)
    .single();
  const cupoBase = ceremonia?.cupo_base_invitado ?? 3;

  const { count } = await (supabase.from("invitados") as any)
    .select("*", { count: "exact", head: true })
    .eq("egresado_id", egresadoId)
    .eq("estado", "aprobado");

  if ((count ?? 0) >= cupoBase) {
    return {
      success: false,
      error: "Has alcanzado el límite máximo de invitados permitidos.",
    };
  }

  const { data, error } = await (supabase.from("invitados") as any)
    .insert({
      egresado_id: egresadoId,
      ceremonia_id: egresado.ceremonia_id,
      dni,
      nombres: capitalizarNombre(nombres),
      apellidos: capitalizarNombre(apellidos),
      es_menor_7: esMenor7,
      tipo_cupo: "base",
      estado: "aprobado",
    })
    .select("id, dni, nombres, apellidos, es_menor_7, tipo_cupo, estado, qr_token")
    .single();

  if (error) {
    return { success: false, error: "Error al registrar. Verifica que el DNI no esté duplicado." };
  }

  return { success: true, data };
}

export async function editarInvitado(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const cookieStore = await cookies();
  const egresadoId = cookieStore.get("egresado_session")?.value;
  if (!egresadoId) {
    return { success: false, error: "Sesión de egresado no válida. Vuelve a ingresar." };
  }

  const invitadoId = (formData.get("invitadoId") as string)?.trim() ?? "";
  const dni = (formData.get("dni") as string)?.trim() ?? "";
  const nombres = (formData.get("nombres") as string)?.trim() ?? "";
  const apellidos = (formData.get("apellidos") as string)?.trim() ?? "";

  if (!invitadoId) {
    return { success: false, error: "Falta el invitado a editar." };
  }
  if (!/^\d{1,8}$/.test(dni)) {
    return { success: false, error: "El DNI debe ser numérico y tener máximo 8 dígitos." };
  }
  if (!nombres || !apellidos) {
    return { success: false, error: "Completa todos los campos." };
  }

  const { data, error } = await (supabase.from("invitados") as any)
    .update({
      dni,
      nombres: capitalizarNombre(nombres),
      apellidos: capitalizarNombre(apellidos),
    })
    .eq("id", invitadoId)
    .eq("egresado_id", egresadoId)
    .select("id, dni, nombres, apellidos, es_menor_7, tipo_cupo, estado, qr_token")
    .single();

  if (error || !data) {
    return { success: false, error: "No se pudo editar el invitado. Verifica que te pertenezca." };
  }

  return { success: true, data };
}