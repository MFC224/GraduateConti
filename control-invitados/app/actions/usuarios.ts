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

export async function crearUsuario(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const nombres = formData.get("nombres") as string;
  const apellidos = formData.get("apellidos") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const dni = formData.get("dni") as string;
  const rol = formData.get("rol") as string;
  const sede_id = formData.get("sede_id") as string;
  const currentUserRol = formData.get("currentUserRol") as string;
  const currentUserSedeId = formData.get("currentUserSedeId") as string;

  if (!nombres || !apellidos || !email || !password || !rol) {
    return { success: false, error: "Completa todos los campos obligatorios." };
  }

  /* ── RBAC: who can create what ── */
  if (currentUserRol === "admin_general") {
    if (!["admin_general", "encargado", "operario"].includes(rol)) {
      return { success: false, error: "Rol no válido." };
    }
  } else if (currentUserRol === "encargado") {
    if (rol !== "operario") {
      return { success: false, error: "Como encargado solo puedes crear operarios." };
    }
    if (!currentUserSedeId) {
      return { success: false, error: "No tienes una sede asignada." };
    }
  } else {
    return { success: false, error: "No tienes permisos para crear usuarios." };
  }

  const effectiveSedeId = currentUserRol === "encargado" ? currentUserSedeId : (sede_id || null);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { nombres, apellidos, rol },
    }
  );

  if (authError) {
    return { success: false, error: authError.message };
  }

  const { error: insertError } = await supabase.from("usuarios").insert({
    id: authData.user.id,
    nombres,
    apellidos,
    dni: dni || null,
    rol,
    sede_id: effectiveSedeId,
    activo: true,
  });

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return { success: false, error: insertError.message };
  }

  return { success: true, error: null };
}

export async function toggleUserStatus(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const userId = formData.get("userId") as string;
  const newStatus = formData.get("newStatus") === "true";
  const currentUserRol = formData.get("currentUserRol") as string;
  const currentUserSedeId = formData.get("currentUserSedeId") as string;
  const targetUserRol = formData.get("targetUserRol") as string;
  const targetUserSedeId = formData.get("targetUserSedeId") as string;

  if (!userId) {
    return { success: false, error: "ID de usuario no proporcionado." };
  }

  /* ── RBAC: who can toggle whom ── */
  if (currentUserRol === "admin_general") {
    /* admin_general can toggle any user */
  } else if (currentUserRol === "encargado") {
    if (targetUserRol !== "operario") {
      return { success: false, error: "No tienes permisos para modificar este usuario." };
    }
    if (!currentUserSedeId || targetUserSedeId !== currentUserSedeId) {
      return { success: false, error: "Solo puedes modificar operarios de tu misma sede." };
    }
  } else {
    return { success: false, error: "No tienes permisos para esta acción." };
  }

  const { error } = await supabase.from("usuarios").update({ activo: newStatus }).eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  registrarAuditoria({
    accion: "cambiar_estado_usuario",
    entidad: "usuarios",
    entidad_id: userId,
    detalle: { activo: newStatus },
  }).catch(() => {});

  return { success: true, error: null };
}
