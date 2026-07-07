"use server";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function registrarAuditoria(params: {
  accion: string;
  entidad: string;
  entidad_id?: string;
  detalle?: Record<string, unknown>;
}) {
  const supabase = getAdminClient();
  if (!supabase) return;

  let usuario_id: string | null = null;
  try {
    const serverSupabase = await createServerClient();
    const { data } = await serverSupabase.auth.getUser();
    usuario_id = data.user?.id ?? null;
  } catch {}

  await supabase.from("auditoria").insert({
    usuario_id,
    accion: params.accion,
    entidad: params.entidad,
    entidad_id: params.entidad_id || null,
    detalle: params.detalle ?? null,
  });
}
