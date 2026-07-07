"use server";

import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function crearSede(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const currentUserRol = formData.get("currentUserRol") as string;
  if (currentUserRol !== "admin_general") {
    return { success: false, error: "Solo admin_general puede crear sedes." };
  }

  const nombre = formData.get("nombre") as string;
  const ciudad = formData.get("ciudad") as string;
  const direccion = formData.get("direccion") as string;

  if (!nombre) {
    return { success: false, error: "El nombre de la sede es obligatorio." };
  }

  const { error } = await supabase.from("sedes").insert({
    nombre,
    ciudad: ciudad || null,
    direccion: direccion || null,
    activo: true,
  });

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

export async function toggleSede(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const currentUserRol = formData.get("currentUserRol") as string;
  if (currentUserRol !== "admin_general") {
    return { success: false, error: "Solo admin_general puede modificar sedes." };
  }

  const sedeId = formData.get("sedeId") as string;
  const newStatus = formData.get("newStatus") === "true";

  if (!sedeId) {
    return { success: false, error: "ID de sede no proporcionado." };
  }

  const { error } = await supabase.from("sedes").update({ activo: newStatus }).eq("id", sedeId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
