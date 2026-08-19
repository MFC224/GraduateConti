import { createClient } from "@/lib/supabase/server";

export interface ServerUserInfo {
  userId: string | null;
  rol: "admin_general" | "encargado" | "operario" | null;
  sedeId: string | null;
}

export async function getServerUserInfo(): Promise<ServerUserInfo> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, rol: null, sedeId: null };

    const { data } = await (supabase.from("usuarios") as any)
      .select("rol, sede_id, activo")
      .eq("id", user.id)
      .single();

    if (!data || !data.activo) return { userId: user.id, rol: null, sedeId: null };
    return { userId: user.id, rol: data.rol, sedeId: data.sede_id };
  } catch {
    return { userId: null, rol: null, sedeId: null };
  }
}