import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database";

function getRoleBasePath(rol: string | null): string | null {
  if (rol === "admin_general") return "/panel/admin";
  if (rol === "encargado") return "/panel/encargado";
  if (rol === "operario") return "/panel/operario";
  return null;
}

function matchesBase(path: string, base: string) {
  return path === base || path.startsWith(base + "/");
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && request.nextUrl.pathname.startsWith("/panel")) {
    const url = request.nextUrl.clone();
    url.pathname = "/staff/ingreso";
    return NextResponse.redirect(url);
  }

  if (user) {
    const { data: usuario } = await (supabase.from("usuarios") as any)
      .select("rol")
      .eq("id", user.id)
      .single();

    const path = request.nextUrl.pathname;
    const expectedBase = getRoleBasePath(usuario?.rol ?? null);

    if (!expectedBase) {
      const url = request.nextUrl.clone();
      url.pathname = "/staff/ingreso";
      return NextResponse.redirect(url);
    }

    const roleRoutes: Record<string, string[]> = {
      admin_general: [],
      encargado: ["/panel/admin"],
      operario: ["/panel/admin", "/panel/encargado"],
    };

    const forbiddenRoutes = roleRoutes[usuario?.rol ?? ""] ?? [];

    for (const forbidden of forbiddenRoutes) {
      if (matchesBase(path, forbidden)) {
        const url = request.nextUrl.clone();
        url.pathname = expectedBase;
        return NextResponse.redirect(url);
      }
    }
  }

  return supabaseResponse;
}
