import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

const PURPLE = "7030A0";
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: PURPLE } };
const THIN_BORDER = {
  top: { style: "thin" as const },
  left: { style: "thin" as const },
  bottom: { style: "thin" as const },
  right: { style: "thin" as const },
};

function parseTime(timeStr: string): number {
  const parts = timeStr.split(":");
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1] ?? "0", 10);
}

export async function GET(request: NextRequest) {
  try {
    const ceremoniaId = request.nextUrl.searchParams.get("ceremonia_id");
    if (!ceremoniaId) {
      return NextResponse.json({ error: "Falta ceremonia_id" }, { status: 400 });
    }

    const supabase = getAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Error de configuración del servidor" }, { status: 500 });
    }

    const { data: ceremonia, error: cerError } = await supabase
      .from("ceremonias")
      .select("id, nombre, hora_inicio")
      .eq("id", ceremoniaId)
      .single();

    if (cerError || !ceremonia) {
      return NextResponse.json({ error: "Ceremonia no encontrada" }, { status: 404 });
    }

    const { data: egresados, error: egrError } = await supabase
      .from("egresados")
      .select(
        "numero_orden, dni, nombres, apellidos, programa_academico, ingreso_evento, toga_entregada, hora_toga_entregada, toga_devuelta, dni_retenido"
      )
      .eq("ceremonia_id", ceremoniaId)
      .order("numero_orden", { ascending: true, nullsFirst: false });

    if (egrError) {
      return NextResponse.json({ error: egrError.message }, { status: 500 });
    }

    const workbook = new ExcelJS.Workbook();

    // ── Sheet 1: Detalle de Asistencia ──
    const sheet1 = workbook.addWorksheet("Detalle de Asistencia");

    sheet1.columns = [
      { header: "N° Orden", key: "orden", width: 12 },
      { header: "DNI Bachiller", key: "dni", width: 16 },
      { header: "Apellidos y Nombres", key: "nombre", width: 38 },
      { header: "Carrera", key: "carrera", width: 32 },
      { header: "Asistencia", key: "asistencia", width: 14 },
      { header: "Hora de Ingreso", key: "hora_ingreso", width: 16 },
      { header: "Toga Entregada", key: "toga_entregada", width: 17 },
      { header: "Estado Toga/DNI", key: "estado_toga", width: 22 },
      { header: "Obs. Internas", key: "obs", width: 28 },
    ];

    const headerRow = sheet1.getRow(1);
    headerRow.height = 24;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFF" }, size: 11, name: "Calibri" };
      cell.fill = HEADER_FILL;
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = THIN_BORDER;
    });

    sheet1.views = [{ state: "frozen", ySplit: 1 }];

    for (const egr of egresados as any[]) {
      const togaEntregada = egr.toga_entregada ? "SÍ" : "NO";

      let estadoToga = "—";
      if (egr.ingreso_evento) {
        if (egr.toga_devuelta && !egr.dni_retenido) estadoToga = "OK";
        else if (egr.dni_retenido) estadoToga = "DNI retenido";
        else if (!egr.toga_devuelta) estadoToga = "Toga pendiente";
      }

      const horaToga = egr.hora_toga_entregada
        ? new Date(egr.hora_toga_entregada).toLocaleTimeString("es-PE", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Lima",
          })
        : "—";

      sheet1.addRow({
        orden: egr.numero_orden ?? "—",
        dni: egr.dni,
        nombre: `${egr.apellidos}, ${egr.nombres}`,
        carrera: egr.programa_academico ?? "—",
        asistencia: egr.ingreso_evento ? "SÍ" : "NO",
        hora_ingreso: horaToga,
        toga_entregada: togaEntregada,
        estado_toga: estadoToga,
        obs: "",
      });
    }

    // ── Sheet 2: Resumen Ejecutivo ──
    const sheet2 = workbook.addWorksheet("Resumen Ejecutivo");

    const totalEgresados = egresados?.length ?? 0;
    const asistenciaReal = (egresados as any[])?.filter((e) => e.ingreso_evento).length ?? 0;
    const togasDevueltas = (egresados as any[])?.filter((e) => e.toga_devuelta).length ?? 0;
    const togasPendientes = (egresados as any[])?.filter((e) => e.ingreso_evento && !e.toga_devuelta).length ?? 0;
    const dnisRetenidos = (egresados as any[])?.filter((e) => e.dni_retenido).length ?? 0;

    const ceremonyStartMinutes = parseTime(ceremonia.hora_inicio ?? "00:00");
    let primeros30 = 0;
    let tarde = 0;

    for (const egr of egresados as any[]) {
      if (egr.ingreso_evento && egr.hora_toga_entregada) {
        const t = new Date(egr.hora_toga_entregada);
        const minutes = t.getHours() * 60 + t.getMinutes();
        if (minutes <= ceremonyStartMinutes + 30) {
          primeros30++;
        } else {
          tarde++;
        }
      }
    }

    const sectionFont = { bold: true, size: 13, color: { argb: PURPLE }, name: "Calibri" };
    const sectionFill = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "F2F2F2" } };
    const labelStyle = { font: { bold: true, size: 11, color: { argb: "333333" }, name: "Calibri" } };
    const valueStyle = { font: { bold: true, size: 16, color: { argb: PURPLE }, name: "Calibri" }, alignment: { horizontal: "center" as const } };

    sheet2.columns = [{ width: 42 }, { width: 24 }];

    const addKpiSection = (title: string, rows: [string, string][]) => {
      const titleRow = sheet2.addRow([title, ""]);
      titleRow.height = 26;
      titleRow.getCell(1).font = sectionFont;
      titleRow.getCell(1).fill = sectionFill;
      sheet2.mergeCells(`A${titleRow.number}:B${titleRow.number}`);

      rows.forEach(([label, value]) => {
        const row = sheet2.addRow([label, value]);
        row.getCell(1).font = labelStyle.font;
        row.getCell(2).font = valueStyle.font;
        row.getCell(2).alignment = valueStyle.alignment;
      });
    };

    addKpiSection("INDICADORES GLOBALES", [
      ["Total Graduados Convocados", String(totalEgresados)],
      ["Asistencia Real", String(asistenciaReal)],
      ["Togas Entregadas y Devueltas", String(togasDevueltas)],
      ["DNIs Retenidos / Togas Pendientes", `${dnisRetenidos} / ${togasPendientes}`],
    ]);

    sheet2.addRow([]);

    addKpiSection("FLUJO DE TIEMPO", [
      ["Check-in primeros 30 min del inicio", String(primeros30)],
      ["Llegaron tarde", String(tarde)],
    ]);

    const buffer = await workbook.xlsx.writeBuffer();

    const nombreCeremonia = ceremonia.nombre
      .replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ\s-]/g, "")
      .replace(/\s+/g, "_");
    const filename = `Reporte_Ceremonia_${nombreCeremonia}.xlsx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.byteLength),
      },
    });
  } catch (err: any) {
    console.error("Error generando reporte:", err);
    return NextResponse.json(
      { error: err?.message ?? "Error interno del servidor" },
      { status: 500 }
    );
  }
}
