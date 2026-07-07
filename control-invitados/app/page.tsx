"use client";

import { useRouter } from "next/navigation";
import { GraduationCap, ShieldCheck } from "lucide-react";

export default function LandingPage() {
  const router = useRouter();

  return (
    <main className="w-full max-w-lg mx-auto text-center flex flex-col items-center justify-center gap-xl py-xl">
      <div className="w-20 h-20 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-sm">
        <GraduationCap size={44} className="text-on-primary" />
      </div>

      <div>
        <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-sm">
          Sistema de Control de Ceremonias
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-sm mx-auto">
          Gestión de invitados, control de acceso y seguimiento en tiempo real para tus ceremonias de graduación.
        </p>
      </div>

      <div className="flex flex-col gap-md w-full max-w-xs">
        <button
          onClick={() => router.push("/egresado/ingreso")}
          className="w-full h-14 bg-primary text-on-primary rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-3 hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm"
        >
          <GraduationCap size={24} />
          Portal del Egresado
        </button>

        <button
          onClick={() => router.push("/staff/ingreso")}
          className="w-full h-14 border-2 border-outline text-on-surface rounded-xl font-headline-sm text-headline-sm flex items-center justify-center gap-3 hover:bg-surface-container-low transition-colors"
        >
          <ShieldCheck size={24} />
          Acceso Staff
        </button>
      </div>

      <p className="font-label-sm text-label-sm text-on-surface-variant mt-md">
        Universidad Continental
      </p>
    </main>
  );
}
