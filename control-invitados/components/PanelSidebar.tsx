"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  GraduationCap,
  Calendar,
  BarChart3,
  FileSpreadsheet,
  Building2,
  Settings,
  HelpCircle,
  LogOut,
  Sun,
  Moon,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { href: "/panel/egresados", icon: GraduationCap, label: "Egresados" },
  { href: "/panel/invitados", icon: Users, label: "Invitados" },
  { href: "/panel/ceremonias", icon: Calendar, label: "Ceremonias" },
  { href: "/panel/reportes", icon: BarChart3, label: "Reportes" },
  { href: "/panel/settings", icon: Settings, label: "Configuración" },
];

export default function PanelSidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [userRol, setUserRol] = useState<string | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const { data: { session } } = await s.auth.getSession();
        if (session?.user?.id) {
          const { data } = await (s.from("usuarios") as any)
            .select("rol")
            .eq("id", session.user.id)
            .single();
          if (data) setUserRol(data.rol);
        }
      } catch {}
    })();
  }, []);

  const router = useRouter();

  async function handleLogout() {
    try {
      const s = createClient();
      await s.auth.signOut();
      router.push("/staff/ingreso");
      router.refresh();
    } catch {}
  }

  const isAdmin = userRol === "admin_general";
  const dashboardHref = isAdmin ? "/panel/admin" : "/panel/encargado";

  return (
    <aside className="hidden md:flex flex-col w-64 shrink-0 h-full p-md gap-base bg-surface-container-lowest dark:bg-slate-900 border-r border-outline-variant dark:border-slate-700">
      <div className="mb-lg flex items-center gap-sm px-4">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-lg">
          UC
        </div>
        <div>
          <h1 className="font-headline-sm text-headline-sm font-bold text-primary dark:text-primary-fixed-dim">
            Graduation Admin
          </h1>
          <p className="font-label-sm text-label-sm text-on-surface-variant dark:text-slate-400">
            {isAdmin ? "Administración" : "Gestión Académica"}
          </p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-xs">
        {userRol && (
          <Link
            href={dashboardHref}
            className={`flex items-center gap-md px-4 py-3 rounded-lg font-label-md text-label-md transition-all ${
              pathname === dashboardHref
                ? "bg-primary-container dark:bg-primary/30 text-on-primary-container dark:text-white font-semibold"
                : "text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700"
            }`}
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
        )}
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-md px-4 py-3 rounded-lg font-label-md text-label-md transition-all ${
                isActive
                  ? "bg-primary-container dark:bg-primary/30 text-on-primary-container dark:text-white font-semibold"
                  : "text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/panel/sedes"
            className={`flex items-center gap-md px-4 py-3 rounded-lg font-label-md text-label-md transition-all ${
              pathname === "/panel/sedes"
                ? "bg-primary-container dark:bg-primary/30 text-on-primary-container dark:text-white font-semibold"
                : "text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700"
            }`}
          >
            <Building2 size={20} />
            <span>Sedes</span>
          </Link>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-xs">
        <div className="flex items-center justify-between px-4 py-2 rounded-lg text-on-surface-variant dark:text-slate-300">
          <span className="font-label-md text-label-sm">Tema</span>
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-lg hover:bg-surface-container-high dark:hover:bg-slate-700 transition-colors"
              aria-label="Toggle dark mode"
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
        <Link
          href="/panel/reportes"
          className={`flex items-center justify-center gap-md px-4 py-3 rounded-xl font-label-md text-label-md w-full mb-md transition-all bg-primary text-on-primary dark:bg-primary/80 hover:bg-primary-container hover:text-on-primary-container dark:hover:bg-primary/60 ${
            pathname === "/panel/reportes" ? "bg-primary-container text-on-primary-container dark:bg-primary/30 dark:text-white" : ""
          }`}
        >
          <FileSpreadsheet size={20} />
          <span>Export Reports</span>
        </Link>
        <button
          onClick={() => setIsHelpOpen(true)}
          className="flex items-center gap-md w-full px-4 py-3 rounded-lg text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all"
        >
          <HelpCircle size={20} />
          <span className="font-label-md text-label-md">Help</span>
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-md w-full px-4 py-3 rounded-lg text-on-surface-variant dark:text-slate-300 hover:bg-surface-container-high dark:hover:bg-slate-700 transition-all"
        >
          <LogOut size={20} />
          <span className="font-label-md text-label-md">Logout</span>
        </button>
      </div>
      {/* Help Slide-over */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsHelpOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white dark:bg-slate-900 shadow-xl transform transition-transform">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-slate-700">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-sm">
                  UC
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Centro de Ayuda</h2>
              </div>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
              >
                <X size={20} className="text-gray-500 dark:text-slate-400" />
              </button>
            </div>

            <div className="overflow-y-auto h-[calc(100%-73px)] p-6 space-y-8">
              {/* Section 1: Guía Rápida */}
              <section>
                <h3 className="text-sm font-semibold text-primary dark:text-primary uppercase tracking-wider mb-4">
                  Guía Rápida
                </h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      📷 Cámara QR en negro
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      Verifica los permisos de tu navegador haciendo clic en el candado junto a la URL y recarga la página.
                    </p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                      🎯 Finalizar Ceremonia
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                      Utiliza este botón solo al terminar el evento. Eliminará los registros físicos de los invitados por privacidad, conservando solo los números totales.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2: Glosario */}
              <section>
                <h3 className="text-sm font-semibold text-primary dark:text-primary uppercase tracking-wider mb-4">
                  Glosario de Estados
                </h3>
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-1">
                    🎓 Togas por Devolver
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-slate-400 leading-relaxed">
                    Egresados que ya ingresaron, dejaron su DNI, pero aún no han devuelto el equipo.
                  </p>
                </div>
              </section>

              {/* Section 3: Soporte */}
              <section>
                <h3 className="text-sm font-semibold text-primary dark:text-primary uppercase tracking-wider mb-4">
                  Soporte Técnico
                </h3>
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl p-4">
                  <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed">
                    Si el problema persiste, contacte al administrador del sistema o a la Oficina de Grados y Títulos.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
