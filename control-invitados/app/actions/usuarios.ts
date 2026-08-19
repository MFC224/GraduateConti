"use server";

import { createClient } from "@supabase/supabase-js";
import { registrarAuditoria } from "./auditoria";
import { getServerUserInfo } from "@/lib/rbac";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function friendlyAuthError(message: string): string {
  if (/already been registered|already exists|duplicate/i.test(message)) {
    return "El correo ya está registrado en el sistema. Usa otro correo o verifica el estado del personal.";
  }
  if (/password/i.test(message)) {
    return "La contraseña no cumple los requisitos del sistema.";
  }
  return message;
}

export async function crearUsuario(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const session = await getServerUserInfo();
  if (!session.userId || !session.rol) {
    return { success: false, error: "Sesión no válida o usuario inactivo." };
  }

  const nombres = formData.get("nombres") as string;
  const apellidos = formData.get("apellidos") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const dni = formData.get("dni") as string;
  const rol = formData.get("rol") as string;
  const sede_id = formData.get("sede_id") as string;

  if (!nombres || !apellidos || !email || !password || !rol) {
    return { success: false, error: "Completa todos los campos obligatorios." };
  }

  /* ── RBAC: who can create what (rol verificado en servidor) ── */
  if (session.rol === "admin_general") {
    if (!["admin_general", "encargado", "operario"].includes(rol)) {
      return { success: false, error: "Rol no válido." };
    }
  } else if (session.rol === "encargado") {
    if (rol !== "operario") {
      return { success: false, error: "Como encargado solo puedes crear operarios." };
    }
    if (!session.sedeId) {
      return { success: false, error: "No tienes una sede asignada." };
    }
  } else {
    return { success: false, error: "No tienes permisos para crear usuarios." };
  }

  const effectiveSedeId = session.rol === "encargado" ? session.sedeId : (sede_id || null);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser(
    {
      email,
      password,
      email_confirm: true,
      user_metadata: { nombres, apellidos, rol },
    }
  );

  if (authError) {
    return { success: false, error: friendlyAuthError(authError.message) };
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

  registrarAuditoria({
    accion: "crear_usuario",
    entidad: "usuarios",
    entidad_id: authData.user.id,
    detalle: { rol, sede_id: effectiveSedeId },
  }).catch(() => {});

  return { success: true, error: null };
}

export async function toggleUserStatus(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const session = await getServerUserInfo();
  if (!session.userId || !session.rol) {
    return { success: false, error: "Sesión no válida o usuario inactivo." };
  }

  const userId = formData.get("userId") as string;
  const newStatus = formData.get("newStatus") === "true";

  if (!userId) {
    return { success: false, error: "ID de usuario no proporcionado." };
  }

  if (userId === session.userId) {
    return { success: false, error: "No puedes cambiar tu propio estado." };
  }

  const { data: target } = await (supabase.from("usuarios") as any)
    .select("rol, sede_id")
    .eq("id", userId)
    .single();

  if (!target) {
    return { success: false, error: "Usuario no encontrado." };
  }

  /* ── RBAC: who can toggle whom (verificado en servidor) ── */
  if (session.rol === "admin_general") {
    /* admin_general can toggle any user */
  } else if (session.rol === "encargado") {
    if (target.rol !== "operario") {
      return { success: false, error: "No tienes permisos para modificar este usuario." };
    }
    if (!session.sedeId || target.sede_id !== session.sedeId) {
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

export async function eliminarUsuario(formData: FormData) {
  const supabase = getAdminClient();
  if (!supabase) return { success: false, error: "Configuración del servidor faltante." };

  const session = await getServerUserInfo();
  if (!session.userId || !session.rol) {
    return { success: false, error: "Sesión no válida o usuario inactivo." };
  }

  if (session.rol !== "admin_general") {
    return { success: false, error: "Solo admin_general puede eliminar usuarios." };
  }

  const userId = formData.get("userId") as string;
  if (!userId) return { success: false, error: "ID de usuario no proporcionado." };

  if (userId === session.userId) {
    return { success: false, error: "No puedes eliminar tu propia cuenta." };
  }

  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    return { success: false, error: `Error al eliminar la autenticación: ${deleteAuthError.message}` };
  }

  const { error: deleteError } = await supabase.from("usuarios").delete().eq("id", userId);
  if (deleteError) {
    return { success: false, error: deleteError.message };
  }

  registrarAuditoria({
    accion: "eliminar_usuario",
    entidad: "usuarios",
    entidad_id: userId,
  }).catch(() => {});

  return { success: true, error: null };
}