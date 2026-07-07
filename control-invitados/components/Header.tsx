"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sun, Moon, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function Header({ showLogout }: { showLogout?: boolean }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/staff/ingreso");
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-slate-900 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-b border-gray-100 dark:border-slate-700 h-16">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
        <img
          src="/logo.png"
          alt="Universidad Continental"
          className="h-10 w-auto object-contain dark:brightness-0 dark:invert transition-all duration-300"
        />
        <div className="flex items-center gap-3">
          {showLogout && (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-all shadow-sm cursor-pointer"
            >
              <LogOut size={16} />
              Salir
            </button>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-slate-400"
              aria-label="Cambiar tema"
            >
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
