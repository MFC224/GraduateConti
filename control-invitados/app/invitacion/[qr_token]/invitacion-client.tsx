"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, QrCode } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";

type InvitacionData = {
  id: string;
  nombres: string;
  apellidos: string;
  qr_token: string;
  ceremonia_nombre: string;
  ceremonia_fecha: string;
  ceremonia_hora_inicio: string;
  sede_nombre: string;
};

type InvitacionRow = {
  id: string;
  nombres: string;
  apellidos: string;
  egresado_id: string;
  qr_token: string;
  estado: string;
  ceremonias: {
    nombre: string;
    fecha: string;
    hora_inicio: string;
    sedes: { nombre: string } | null;
  } | null;
};

function formatFecha(fecha: string, hora: string): string {
  const d = new Date(fecha + "T" + hora);
  return d.toLocaleDateString("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export default function InvitacionClient() {
  const params = useParams();
  const qrToken = params.qr_token as string;
  const cardRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<InvitacionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const supabase = createClient();
        const { data: row, error: err } = await supabase
          .from("invitados")
          .select(
            "id, nombres, apellidos, egresado_id, qr_token, estado, ceremonias(nombre, fecha, hora_inicio, sedes(nombre))"
          )
          .eq("qr_token", qrToken)
          .single();

        if (err) throw err;
        if (!row) {
          setError("Invitación no encontrada.");
          return;
        }

        const r = row as unknown as InvitacionRow;

        if (r.estado !== "aprobado") {
          setError("Esta invitación no está vigente.");
          return;
        }

        setData({
          id: r.id,
          nombres: r.nombres,
          apellidos: r.apellidos,
          qr_token: r.qr_token,
          ceremonia_nombre: r.ceremonias?.nombre ?? "",
          ceremonia_fecha: r.ceremonias?.fecha ?? "",
          ceremonia_hora_inicio: r.ceremonias?.hora_inicio ?? "",
          sede_nombre: r.ceremonias?.sedes?.nombre ?? "",
        });
      } catch {
        setError("No pudimos cargar la invitación. Intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [qrToken]);

  async function handleDownload() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `invitacion-${data?.qr_token?.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <p className="text-sm text-gray-500">Cargando invitación...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex flex-col items-center justify-center px-4 min-h-[60vh] animate-fadeUp">
          <QrCode className="mx-auto mb-4 text-gray-300" size={64} />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">
            Invitación no disponible
          </h1>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center py-10">
      <Header />
      <div className="flex flex-col items-center justify-center px-4 animate-fadeUp gap-6">
        {/* Invitation Card */}
        <div
          ref={cardRef}
          className="w-full max-w-sm bg-white text-slate-900 shadow-2xl rounded-xl overflow-hidden"
        >
          {/* Top notch */}
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full border-b border-gray-100 z-10" />

          {/* Header */}
          <div className="pt-8 pb-4 px-6 flex flex-col items-center text-center border-b border-gray-100">
            <QrCode className="text-slate-900 mb-2" size={36} />
            <h1 className="text-lg font-semibold text-gray-900 mb-1">
              Invitación Oficial
            </h1>
            <p className="text-sm text-gray-500">
              Presenta este código en la entrada
            </p>
          </div>

          {/* Guest Details */}
          <div className="p-6 flex flex-col gap-3 border-b border-gray-100">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Invitado
              </p>
              <p className="text-base text-gray-900 font-semibold">
                {data!.nombres} {data!.apellidos}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                Ceremonia
              </p>
              <p className="text-sm text-gray-900">
                {data!.ceremonia_nombre}
              </p>
            </div>
            <div className="flex justify-between items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Fecha y Hora
                </p>
                <p className="text-sm text-gray-900">
                  {formatFecha(data!.ceremonia_fecha, data!.ceremonia_hora_inicio)}
                </p>
              </div>
              <div className="flex-1 text-right">
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">
                  Ubicación
                </p>
                <p className="text-sm text-gray-900">
                  {data!.sede_nombre}
                </p>
              </div>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center justify-center bg-gray-50/50">
            <div className="w-48 h-48 bg-gray-900 flex items-center justify-center p-2 rounded-xl relative">
              <div className="w-full h-full bg-white rounded flex items-center justify-center p-1">
                <QRCodeSVG
                  value={data!.qr_token}
                  size={160}
                  bgColor="#ffffff"
                  fgColor="#000000"
                  level="M"
                />
              </div>
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-gray-300 -ml-2 -mt-2" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-gray-300 -mr-2 -mt-2" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-gray-300 -ml-2 -mb-2" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-gray-300 -mr-2 -mb-2" />
            </div>
            <p className="text-xs text-gray-400 mt-4 font-mono">
              ID: {data!.qr_token.slice(0, 8).toUpperCase()}
            </p>
          </div>
        </div>

        {/* Download button — outside captured ref */}
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="w-full max-w-sm flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 h-12 disabled:opacity-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)]"
        >
          <Download size={20} />
          {downloading ? "Descargando..." : "Descargar invitación"}
        </button>
      </div>
    </main>
  );
}
