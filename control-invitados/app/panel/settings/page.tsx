"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  async function handleUpdatePassword() {
    setToast(null);

    if (!newPassword || newPassword.length < 6) {
      setToast({ type: "error", message: "La contraseña debe tener al menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setToast({ type: "error", message: "Las contraseñas no coinciden." });
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        setToast({ type: "error", message: error.message });
      } else {
        setToast({ type: "success", message: "Contraseña actualizada exitosamente." });
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      setToast({ type: "error", message: "Error al actualizar la contraseña." });
    }
    setLoading(false);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        <div className="max-w-2xl">
          <h1 className="text-2xl md:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Configuración
          </h1>
          <p className="text-base text-gray-500 dark:text-slate-400 mb-8">
            Administra la seguridad de tu cuenta.
          </p>

          <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Seguridad
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
              Actualiza tu contraseña de acceso al sistema.
            </p>

            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repite la contraseña"
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
              </div>

              <button
                onClick={handleUpdatePassword}
                disabled={loading}
                className="flex items-center gap-2 bg-primary text-on-primary px-5 py-2.5 rounded-xl font-medium text-sm hover:bg-primary/90 transition-all disabled:opacity-50 shadow-[0_4px_16px_rgb(0,0,0,0.08)]"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? "Actualizando..." : "Actualizar Contraseña"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed top-4 right-4 z-[100] animate-fadeUp">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-lg border ${
            toast.type === "success"
              ? "bg-[#E8F5E9] border-[#A5D6A7] text-[#2E7D32] dark:bg-green-900/50 dark:border-green-700 dark:text-green-300"
              : "bg-error-container border-error text-on-error-container dark:bg-red-900/50 dark:border-red-700 dark:text-red-300"
          }`}>
            <span className="font-body-md text-body-md">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
