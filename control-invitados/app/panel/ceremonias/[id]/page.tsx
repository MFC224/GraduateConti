"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import {
  ArrowLeft,
  Upload,
  Users,
  Building2,
  Calendar,
  Clock,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  Star,
  Trophy,
  Plus,
  Trash2,
  UserCheck,
  Mic,
  ArrowLeftRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PanelSidebar from "@/components/PanelSidebar";
import { importarEgresadosMasivo, actualizarCupoBase, marcarAlumnoDiscurso, trasladarEgresadoCeremonia } from "@/app/actions/egresados";
import { actualizarAutoridades, finalizarCeremonia } from "@/app/actions/ceremonias";

export default function CeremoniaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [ceremonia, setCeremonia] = useState<any>(null);
  const [egresados, setEgresados] = useState<any[]>([]);
  const [egresadosCount, setEgresadosCount] = useState(0);
  const [currentUserRol, setCurrentUserRol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [importState, setImportState] = useState<"idle" | "parsing" | "confirm" | "importing" | "done" | "error">("idle");
  const [parsedRows, setParsedRows] = useState<any[]>([]);
  const [importMsg, setImportMsg] = useState("");
  const [importFileName, setImportFileName] = useState("");
  const [recommendedCupo, setRecommendedCupo] = useState<number | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [showAddAutoridad, setShowAddAutoridad] = useState(false);
  const [nuevaAutoridadCargo, setNuevaAutoridadCargo] = useState("");
  const [nuevaAutoridadNombre, setNuevaAutoridadNombre] = useState("");
  const [updatingDiscurso, setUpdatingDiscurso] = useState<string | null>(null);

  const [showTransfer, setShowTransfer] = useState(false);
  const [transferEgresado, setTransferEgresado] = useState<any>(null);
  const [otherCeremonias, setOtherCeremonias] = useState<any[]>([]);
  const [transferTarget, setTransferTarget] = useState("");

  const [showExtratemporal, setShowExtratemporal] = useState(false);
  const [extratemporalSaving, setExtratemporalSaving] = useState(false);
  const [extratemporalForm, setExtratemporalForm] = useState({
    dni: "", nombres: "", apellidos: "", carrera: "", numero_orden: 1,
  });
  const [siguienteOrden, setSiguienteOrden] = useState(1);
  const carrerasDetalle = [
    "Ingeniería Civil", "Ingeniería de Sistemas", "Ingeniería Industrial",
    "Ingeniería Electrónica", "Ingeniería Mecánica", "Administración",
    "Contabilidad", "Derecho", "Psicología", "Arquitectura",
  ];

  const autoridades: { cargo: string; nombre: string }[] = ceremonia?.autoridades ?? [];

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function fetchData() {
    try {
      const s = createClient();
      const { data: cer } = await (s.from("ceremonias") as any)
        .select("*, sedes(nombre)")
        .eq("id", id)
        .single();
      if (!cer) { router.replace("/panel/ceremonias"); return; }
      setCeremonia(cer);

      const { data: egs } = await (s.from("egresados") as any)
        .select("id, dni, nombres, apellidos, programa_academico, numero_orden, es_discurso")
        .eq("ceremonia_id", id)
        .order("numero_orden", { ascending: true });
      setEgresados(egs ?? []);
      setEgresadosCount(egs?.length ?? 0);
    } catch {}
  }

  useEffect(() => {
    (async () => {
      try {
        const s = createClient();

        const { data: { session } } = await s.auth.getSession();
        if (!session?.user?.id) { router.replace("/staff/ingreso"); return; }

        const { data: userData } = await (s.from("usuarios") as any)
          .select("rol")
          .eq("id", session.user.id)
          .single();
        if (userData) setCurrentUserRol(userData.rol);

        await fetchData();
      } catch {}
      setLoading(false);
    })();
  }, [id, router]);

  const COLUMN_ALIASES: Record<string, string> = {
    numero: "numero_orden",
    numero_orden: "numero_orden",
    dni: "dni",
    apellidos: "apellidos",
    apellido: "apellidos",
    nombres: "nombres",
    nombre: "nombres",
    nombres_completos: "nombres",
    carrera: "carrera",
    programa_academico: "carrera",
    programa: "carrera",
  };

  function mapearFila(row: Record<string, unknown>): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(row)) {
      const normalizedKey = key.toLowerCase().replace(/[\s_-]+/g, "_").trim();
      const target = COLUMN_ALIASES[normalizedKey];
      if (target && val != null && val !== "") {
        if (!out[target] || out[target] === "") out[target] = val;
      }
    }
    return out;
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFileName(file.name);
    setImportState("parsing");
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        const mapped = json.map((row: any, i: number) => {
          const m = mapearFila(row);
          return {
            numero_orden: m.numero_orden != null ? String(m.numero_orden) : String(i + 1),
            dni: String(m.dni ?? "").trim(),
            apellidos: String(m.apellidos ?? "").trim(),
            nombres: String(m.nombres ?? "").trim(),
            carrera: String(m.carrera ?? "").trim(),
          };
        });

        const valid = mapped.filter((r) => r.dni && r.nombres && r.apellidos);
        setParsedRows(valid);
        setImportState(valid.length > 0 ? "confirm" : "error");
        if (valid.length === 0) setImportMsg("No se encontraron filas válidas en el archivo.");
        else {
          const recomendado = Math.floor((ceremonia?.aforo_total_invitados ?? 0) / valid.length);
          setRecommendedCupo(recomendado > 0 ? recomendado : null);
        }
      } catch {
        setImportState("error");
        setImportMsg("Error al leer el archivo. Verifica que sea un .xlsx válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function handleImport() {
    if (egresados.length > 0) {
      const ok = window.confirm(
        "Esta ceremonia ya tiene una lista de egresados. Al subir un nuevo Excel, se borrarán los datos anteriores y sus invitados registrados. ¿Estás seguro de continuar?"
      );
      if (!ok) {
        setImportState("idle");
        setParsedRows([]);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
    }
    setImportState("importing");
    const fd = new FormData();
    fd.set("ceremoniaId", id);
    fd.set("egresados", JSON.stringify(parsedRows));
    fd.set("fileName", importFileName);
    const res = await importarEgresadosMasivo(fd);
    if (res.success) {
      setImportState("done");
      setImportMsg(`Se importaron ${res.count ?? parsedRows.length} egresados exitosamente.`);
      await fetchData();
      setToast({ type: "success", message: `${res.count ?? parsedRows.length} egresados importados.` });
    } else {
      setImportState("error");
      setImportMsg(res.error ?? "Error al importar.");
      setToast({ type: "error", message: res.error ?? "Error al importar." });
    }
  }

  async function handleOpenTransfer(egresado: any) {
    setTransferEgresado(egresado);
    setTransferTarget("");
    try {
      const s = createClient();
      const { data } = await (s.from("ceremonias") as any)
        .select("id, nombre, fecha")
        .neq("id", id)
        .eq("estado", "planificada")
        .order("fecha", { ascending: true });
      setOtherCeremonias(data ?? []);
    } catch {}
    setShowTransfer(true);
  }

  async function handleConfirmTransfer() {
    if (!transferEgresado || !transferTarget) return;
    const fd = new FormData();
    fd.set("egresadoId", transferEgresado.id);
    fd.set("nuevaCeremoniaId", transferTarget);
    const res = await trasladarEgresadoCeremonia(fd);
    if (res.success) {
      setEgresados((prev) => prev.filter((e: any) => e.id !== transferEgresado.id));
      setEgresadosCount((prev) => prev - 1);
      setToast({ type: "success", message: "Egresado reasignado a otra ceremonia." });
      setShowTransfer(false);
      setTransferEgresado(null);
    } else {
      setToast({ type: "error", message: res.error ?? "Error al reasignar." });
    }
  }

  async function handleUpdateCupo(cupo: number) {
    const fd = new FormData();
    fd.set("ceremoniaId", id);
    fd.set("cupo", String(cupo));
    const res = await actualizarCupoBase(fd);
    if (res.success) {
      setCeremonia((prev: any) => ({ ...prev, cupo_base_invitado: cupo }));
      setToast({ type: "success", message: `Cupo base actualizado a ${cupo} invitados por egresado.` });
    } else {
      setToast({ type: "error", message: res.error ?? "Error al actualizar." });
    }
  }

  if (loading) return null;

  const isAdmin = currentUserRol === "admin_general";

  async function handleAddAutoridad() {
    if (!nuevaAutoridadCargo.trim() || !nuevaAutoridadNombre.trim()) return;
    const updated = [...autoridades, { cargo: nuevaAutoridadCargo.trim(), nombre: nuevaAutoridadNombre.trim() }];
    const fd = new FormData();
    fd.set("ceremoniaId", id);
    fd.set("autoridades", JSON.stringify(updated));
    const res = await actualizarAutoridades(fd);
    if (res.success) {
      setCeremonia((prev: any) => ({ ...prev, autoridades: updated }));
      setNuevaAutoridadCargo("");
      setNuevaAutoridadNombre("");
      setShowAddAutoridad(false);
      setToast({ type: "success", message: "Autoridad agregada." });
    } else {
      setToast({ type: "error", message: res.error ?? "Error al agregar autoridad." });
    }
  }

  async function handleRemoveAutoridad(index: number) {
    const updated = autoridades.filter((_: any, i: number) => i !== index);
    const fd = new FormData();
    fd.set("ceremoniaId", id);
    fd.set("autoridades", JSON.stringify(updated));
    const res = await actualizarAutoridades(fd);
    if (res.success) {
      setCeremonia((prev: any) => ({ ...prev, autoridades: updated }));
      setToast({ type: "success", message: "Autoridad eliminada." });
    } else {
      setToast({ type: "error", message: res.error ?? "Error al eliminar autoridad." });
    }
  }

  async function handleMarcarDiscurso(egresadoId: string) {
    setUpdatingDiscurso(egresadoId);
    const fd = new FormData();
    fd.set("egresadoId", egresadoId);
    fd.set("ceremoniaId", id);
    const res = await marcarAlumnoDiscurso(fd);
    if (res.success) {
      setEgresados((prev: any[]) =>
        prev.map((e) => ({ ...e, es_discurso: e.id === egresadoId }))
      );
      setToast({ type: "success", message: "Alumno de discurso actualizado." });
    } else {
      setToast({ type: "error", message: res.error ?? "Error al marcar alumno." });
    }
    setUpdatingDiscurso(null);
  }

  async function handleFinalizar() {
    if (!window.confirm("¿Estás seguro de finalizar esta ceremonia?\n\nSe eliminarán todos los invitados registrados y no se podrá modificar la lista de egresados. Esta acción es irreversible.")) return;
    const fd = new FormData();
    fd.set("ceremoniaId", id);
    const res = await finalizarCeremonia(fd);
    if (res.success) {
      setToast({ type: "success", message: "Ceremonia finalizada exitosamente." });
      await fetchData();
    } else {
      setToast({ type: "error", message: res.error ?? "Error al finalizar ceremonia." });
    }
  }

  async function handleAddExtratemporalDetalle() {
    const f = extratemporalForm;
    if (!f.dni || !f.nombres || !f.apellidos || !f.carrera) {
      setToast({ type: "error", message: "Completa todos los campos obligatorios." });
      return;
    }
    if (f.dni.length !== 8 || !/^\d{8}$/.test(f.dni)) {
      setToast({ type: "error", message: "DNI debe tener 8 dígitos numéricos." });
      return;
    }
    setExtratemporalSaving(true);
    try {
      const s = createClient();
      const { error } = await (s.from("egresados") as any).insert([{
        dni: f.dni, nombres: f.nombres, apellidos: f.apellidos,
        programa_academico: f.carrera, numero_orden: f.numero_orden,
        ceremonia_id: id, es_extratemporal: true,
      }]);
      if (error) { setToast({ type: "error", message: error.message }); return; }
      setShowExtratemporal(false);
      setExtratemporalForm({ dni: "", nombres: "", apellidos: "", carrera: "", numero_orden: siguienteOrden + 1 });
      setToast({ type: "success", message: "Egresado extratemporal registrado correctamente." });
      await fetchData();
    } catch { setToast({ type: "error", message: "Error de red." }); }
    finally { setExtratemporalSaving(false); }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-on-background antialiased">
      <PanelSidebar />
      <div className="flex-1 overflow-y-auto p-8 animate-fadeUp">
        {/* Back */}
        <button
          onClick={() => router.push("/panel/ceremonias")}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Volver a Ceremonias
        </button>

        {/* Ceremony Summary */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {ceremonia?.nombre}
              </h1>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {ceremonia?.sedes?.nombre} — {ceremonia?.programa_principal ?? "Sin programa"}
              </p>
            </div>
            <div className="flex items-center gap-3 self-start">
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                ceremonia?.estado === "planificada" ? "bg-[#fef7e0] text-[#b06000] dark:bg-amber-900/50 dark:text-amber-300" :
                ceremonia?.estado === "en_curso" ? "bg-[#e6f4ea] text-[#137333] dark:bg-green-900/50 dark:text-green-300" :
                "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400"
              }`}>
                {ceremonia?.estado === "planificada" ? "Planificada" : ceremonia?.estado === "en_curso" ? "En Curso" : "Finalizada"}
              </span>
              {(ceremonia?.estado === "planificada" || ceremonia?.estado === "en_curso") && (
                <button
                  onClick={handleFinalizar}
                  className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all shadow-sm"
                >
                  Finalizar Ceremonia
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <Calendar size={18} className="text-on-surface-variant dark:text-slate-400 shrink-0" />
              <span>{ceremonia?.fecha ? new Date(ceremonia.fecha + "T00:00:00").toLocaleDateString("es-PE") : "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <Clock size={18} className="text-on-surface-variant dark:text-slate-400 shrink-0" />
              <span>{ceremonia?.hora_inicio?.slice(0, 5) ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <Users size={18} className="text-on-surface-variant dark:text-slate-400 shrink-0" />
              <span>Aforo: {ceremonia?.aforo_total_invitados?.toLocaleString() ?? "—"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300">
              <Building2 size={18} className="text-on-surface-variant dark:text-slate-400 shrink-0" />
              <span>{egresadosCount} egresados</span>
            </div>
          </div>
        </div>

        {/* Bloque A: Mesa de Honor */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Trophy size={20} className="text-primary" />
                Mesa de Honor
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                Autoridades que presidirán la ceremonia.
              </p>
            </div>
            <button
              onClick={() => setShowAddAutoridad(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all"
            >
              <Plus size={16} />
              Añadir Autoridad
            </button>
          </div>

          {autoridades.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
              No hay autoridades registradas. Añade la primera autoridad.
            </p>
          ) : (
            <div className="space-y-2">
              {autoridades.map((a: { cargo: string; nombre: string }, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-4 py-3 rounded-xl bg-surface-container-low dark:bg-slate-700/50 hover:bg-surface-container dark:hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed dark:bg-primary/30 flex items-center justify-center">
                      <Users size={16} className="text-primary dark:text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{a.nombre}</p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{a.cargo}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAutoridad(i)}
                    className="p-2 rounded-lg text-gray-400 hover:text-error hover:bg-error-container dark:hover:bg-red-900/50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bloque B: Lista de Egresados */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Users size={20} className="text-primary" />
                Lista de Egresados
              </h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {egresadosCount} egresados importados. Marca al alumno del discurso.
              </p>
            </div>
          </div>

          {egresados.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-8">
              No hay egresados importados. Usa el importador de Excel más arriba.
            </p>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-slate-700 rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-300 font-medium">N°</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-300 font-medium">DNI</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-300 font-medium">Apellidos</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-300 font-medium">Nombres</th>
                    <th className="px-4 py-3 text-left text-gray-600 dark:text-slate-300 font-medium">Carrera</th>
                    <th className="px-4 py-3 text-center text-gray-600 dark:text-slate-300 font-medium">Discurso</th>
                    <th className="px-4 py-3 text-center text-gray-600 dark:text-slate-300 font-medium">Turno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                  {egresados.map((e) => (
                    <tr
                      key={e.id}
                      className={`hover:bg-gray-50 dark:hover:bg-slate-700/30 transition-colors ${
                        e.es_discurso ? "bg-purple-50 dark:bg-purple-900/20" : ""
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{e.numero_orden ?? "—"}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{e.dni}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{e.apellidos}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{e.nombres}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-slate-300">{e.programa_academico ?? "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleMarcarDiscurso(e.id)}
                          disabled={updatingDiscurso === e.id}
                          className={`p-2 rounded-lg transition-all ${
                            e.es_discurso
                              ? "bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200"
                              : "text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/30"
                          }`}
                          title={e.es_discurso ? "Alumno del discurso" : "Marcar como alumno del discurso"}
                        >
                          {updatingDiscurso === e.id ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Mic size={18} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenTransfer(e)}
                          className="p-2 rounded-lg text-gray-400 hover:text-primary hover:bg-primary-fixed dark:hover:bg-primary/30 transition-all"
                          title="Reasignar turno"
                        >
                          <ArrowLeftRight size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Excel Upload */}
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Importar Egresados
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">
            Sube un archivo Excel (.xlsx) con las columnas: DNI, APELLIDOS, NOMBRES, CARRERA (opcional), NUMERO (opcional).
          </p>

          {importState === "idle" && (
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-2xl p-10 text-center cursor-pointer hover:border-primary dark:hover:border-primary/50 transition-colors"
            >
              <Upload size={40} className="mx-auto text-gray-300 dark:text-slate-500 mb-4" />
              <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
                Haz clic para seleccionar archivo .xlsx
              </p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-1">
                o arrastra el archivo aquí
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleFile}
              />
            </div>
          )}

          {importState === "parsing" && (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300 py-6">
              <Loader2 size={20} className="animate-spin text-primary" />
              Leyendo archivo...
            </div>
          )}

          {importState === "confirm" && (
            <div>
              <div className="bg-primary-fixed dark:bg-primary/20 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-3">
                  <FileSpreadsheet size={20} className="text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {parsedRows.length} egresados listos para importar
                    </p>
                    {recommendedCupo && ceremonia && (
                      <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">
                        Para un aforo de {ceremonia.aforo_total_invitados?.toLocaleString()}, se recomiendan <strong>{recommendedCupo}</strong> invitados por persona
                        (cupo actual: {ceremonia.cupo_base_invitado}).
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview table */}
              <div className="overflow-x-auto mb-4 max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-slate-300 font-medium">N°</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-slate-300 font-medium">DNI</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-slate-300 font-medium">Nombres</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-slate-300 font-medium">Apellidos</th>
                      <th className="px-3 py-2 text-left text-gray-600 dark:text-slate-300 font-medium">Carrera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-slate-700">
                    {parsedRows.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-slate-700/30">
                        <td className="px-3 py-2 text-gray-900 dark:text-white">{r.numero_orden}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{r.dni}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{r.nombres}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{r.apellidos}</td>
                        <td className="px-3 py-2 text-gray-700 dark:text-slate-300">{r.carrera || "—"}</td>
                      </tr>
                    ))}
                    {parsedRows.length > 10 && (
                      <tr>
                        <td colSpan={5} className="px-3 py-2 text-center text-xs text-gray-400 dark:text-slate-500">
                          ... y {parsedRows.length - 10} más
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Recommended cupo */}
              {recommendedCupo && ceremonia && recommendedCupo !== ceremonia.cupo_base_invitado && (
                <div className="flex items-center gap-3 bg-[#E8F5E9] dark:bg-green-900/30 text-[#2E7D32] dark:text-green-300 rounded-xl px-4 py-3 mb-4">
                  <AlertCircle size={18} className="shrink-0" />
                  <div className="text-sm flex-1">
                    <span className="font-medium">Recomendación:</span> {recommendedCupo} invitados por egresado.
                  </div>
                  <button
                    onClick={() => handleUpdateCupo(recommendedCupo)}
                    className="text-sm font-medium text-primary hover:underline whitespace-nowrap"
                  >
                    Actualizar cupo
                  </button>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setImportState("idle"); setParsedRows([]); if (fileRef.current) fileRef.current.value = ""; }}
                  className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleImport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all"
                >
                  <Upload size={16} />
                  Importar {parsedRows.length} egresados
                </button>
              </div>
            </div>
          )}

          {importState === "importing" && (
            <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-slate-300 py-6">
              <Loader2 size={20} className="animate-spin text-primary" />
              Importando egresados...
            </div>
          )}

          {importState === "done" && (
            <div className="bg-[#E8F5E9] dark:bg-green-900/30 text-[#2E7D32] dark:text-green-300 rounded-xl p-4 flex items-center gap-3">
              <CheckCircle size={20} className="shrink-0" />
              <span className="text-sm">{importMsg}</span>
              <button
                onClick={async () => {
                  setImportState("idle");
                  setParsedRows([]);
                  if (fileRef.current) fileRef.current.value = "";
                  await fetchData();
                }}
                className="ml-auto text-sm font-medium text-primary hover:underline"
              >
                Importar otro
              </button>
            </div>
          )}

          {importState === "error" && (
            <div className="bg-error-container dark:bg-red-900/50 text-on-error-container dark:text-red-300 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle size={20} className="shrink-0" />
              <span className="text-sm">{importMsg}</span>
              <button
                onClick={() => { setImportState("idle"); setParsedRows([]); if (fileRef.current) fileRef.current.value = ""; }}
                className="ml-auto text-sm font-medium text-primary hover:underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {isAdmin && (
        <div className="bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Registro Extratemporal</h3>
              <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                Agrega egresados de último minuto a esta ceremonia.
              </p>
            </div>
            <button
              onClick={() => {
                const max = egresados.reduce((max, e) => Math.max(max, e.numero_orden ?? 0), 0);
                setSiguienteOrden(max + 1);
                setExtratemporalForm((prev) => ({ ...prev, numero_orden: max + 1 }));
                setShowExtratemporal(true);
              }}
              className="flex items-center gap-2 bg-primary text-on-primary rounded-full px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-all shadow-[0_4px_16px_rgb(0,0,0,0.08)] cursor-pointer"
            >
              <Plus size={16} />
              Agregar Egresado Extratemporal
            </button>
          </div>
        </div>
        )}
      </div>

      {/* Modal: Añadir Autoridad */}
      {showAddAutoridad && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Añadir Autoridad</h3>
              <button onClick={() => setShowAddAutoridad(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Cargo</label>
                <input
                  type="text"
                  value={nuevaAutoridadCargo}
                  onChange={(e) => setNuevaAutoridadCargo(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Rector"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombre completo</label>
                <input
                  type="text"
                  value={nuevaAutoridadNombre}
                  onChange={(e) => setNuevaAutoridadNombre(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="Ej: Dr. Juan Pérez López"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowAddAutoridad(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddAutoridad}
                disabled={!nuevaAutoridadCargo.trim() || !nuevaAutoridadNombre.trim()}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reasignar Turno */}
      {showTransfer && transferEgresado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Reasignar Turno</h3>
              <button onClick={() => setShowTransfer(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="bg-surface-container-low dark:bg-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {transferEgresado.nombres} {transferEgresado.apellidos}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400">
                DNI: {transferEgresado.dni} — N° {transferEgresado.numero_orden ?? "—"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                Selecciona la ceremonia de destino
              </label>
              {otherCeremonias.length === 0 ? (
                <p className="text-sm text-gray-400 dark:text-slate-500">No hay otras ceremonias planificadas.</p>
              ) : (
                <select
                  value={transferTarget}
                  onChange={(e) => setTransferTarget(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                >
                  <option value="">Seleccionar...</option>
                  {otherCeremonias.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} — {c.fecha ? new Date(c.fecha + "T00:00:00").toLocaleDateString("es-PE") : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setShowTransfer(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmTransfer}
                disabled={!transferTarget}
                className="px-5 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <ArrowLeftRight size={16} />
                Reasignar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Extratemporal Modal ── */}
      {isAdmin && showExtratemporal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowExtratemporal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fadeUp" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Registro Extratemporal</h3>
              <button onClick={() => setShowExtratemporal(false)} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">DNI *</label>
                <input type="text" inputMode="numeric" maxLength={8} value={extratemporalForm.dni}
                  onChange={(e) => setExtratemporalForm({ ...extratemporalForm, dni: e.target.value.replace(/\D/g, "") })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                  placeholder="12345678" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombres *</label>
                  <input type="text" value={extratemporalForm.nombres}
                    onChange={(e) => setExtratemporalForm({ ...extratemporalForm, nombres: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    placeholder="Nombres" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellidos *</label>
                  <input type="text" value={extratemporalForm.apellidos}
                    onChange={(e) => setExtratemporalForm({ ...extratemporalForm, apellidos: e.target.value })}
                    className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                    placeholder="Apellidos" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Carrera *</label>
                <select value={extratemporalForm.carrera}
                  onChange={(e) => setExtratemporalForm({ ...extratemporalForm, carrera: e.target.value })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                >
                  <option value="">Seleccionar carrera</option>
                  {carrerasDetalle.map((c) => (<option key={c} value={c}>{c}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">N° de Orden</label>
                <input type="number" min={1} value={extratemporalForm.numero_orden}
                  onChange={(e) => setExtratemporalForm({ ...extratemporalForm, numero_orden: parseInt(e.target.value) || 1 })}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow" />
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">Sugerido: {siguienteOrden}</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowExtratemporal(false)}
                className="px-4 py-2 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleAddExtratemporalDetalle} disabled={extratemporalSaving}
                className="px-4 py-2 rounded-xl bg-primary text-on-primary text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer">
                {extratemporalSaving ? "Guardando..." : "Registrar"}
              </button>
            </div>
          </div>
        </div>
      )}

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
