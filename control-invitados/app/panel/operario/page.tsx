"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  Search,
  QrCode,
  User,
  CheckCircle,
  AlertCircle,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  PlusCircle,
  Shield,
  Undo2,
  Users,
  Scan,
  Calendar,
  ChevronDown,
  Table,
  FileText,
  Lock,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Header from "@/components/Header";
import { capitalizarNombre } from "@/app/utils/formatters";

const OFFLINE_QUEUE_KEY = "offline_ingresos";
const SCANNER_ELEMENT_ID = "qr-scanner";

function toPeruTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function nowPeruISO(): string {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "America/Lima" })
  ).toISOString();
}

type EgresadoConInvitados = {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string;
  numero_orden: number | null;
  equipo_entregado_at: string | null;
  equipo_entregado_por: string | null;
  dni_retenido: boolean;
  dni_devuelto_at: string | null;
  toga_devuelta: boolean;
  confirmado_asistencia: boolean;
  ingreso_evento: boolean;
  toga_entregada: boolean;
  hora_toga_entregada: string | null;
  hora_toga_devuelta: string | null;
  observaciones: string | null;
  invitados: {
    id: string;
    nombres: string;
    apellidos: string;
    dni: string;
    estado: string;
    ingreso_at: string | null;
    qr_token: string;
  }[];
};

type CeremoniaSelect = {
  id: string;
  nombre: string;
  fecha: string;
  hora_inicio: string;
};

type TabId = "egresados" | "invitados";

export default function OperarioPanelPage() {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ceremoniasDisponibles, setCeremoniasDisponibles] = useState<CeremoniaSelect[]>([]);
  const [selectedCeremoniaId, setSelectedCeremoniaId] = useState<string | null>(null);
  const [ceremoniaLoading, setCeremoniaLoading] = useState(true);
  const [alert, setAlert] = useState<{
    type: "error" | "success" | "info";
    message: string;
  } | null>(null);

  /* ───── Tabs ───── */
  const [activeTab, setActiveTab] = useState<TabId>("egresados");

  /* ───── Buscador egresados ───── */
  const [searchTerm, setSearchTerm] = useState("");
  const [ordenSearchTerm, setOrdenSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<EgresadoConInvitados[]>([]);
  const [selectedEgresado, setSelectedEgresado] = useState<EgresadoConInvitados | null>(null);
  const [searching, setSearching] = useState(false);

  /* ───── Invitados list ───── */
  const [updatingInv, setUpdatingInv] = useState<string | null>(null);

  /* ───── Observaciones por egresado ───── */
  const [observacionesNota, setObservacionesNota] = useState("");

  useEffect(() => {
    setObservacionesNota(selectedEgresado?.observaciones ?? "");
  }, [selectedEgresado]);

  /* ───── Last minute guest modal ───── */
  const [showLastMinuteModal, setShowLastMinuteModal] = useState(false);
  const [lmDni, setLmDni] = useState("");
  const [lmNombres, setLmNombres] = useState("");
  const [lmApellidos, setLmApellidos] = useState("");
  const [lmSubmitting, setLmSubmitting] = useState(false);

  /* ───── DNI manual search (Tab Invitados) ───── */
  const [dniSearchTerm, setDniSearchTerm] = useState("");
  const [dniSearchResult, setDniSearchResult] = useState<any>(null);
  const [dniSearching, setDniSearching] = useState(false);

  const [fullEgresadosList, setFullEgresadosList] = useState<any[]>([]);
  const [fullInvitadosList, setFullInvitadosList] = useState<any[]>([]);
  const [ceremonyDetails, setCeremonyDetails] = useState<{ aforo_total_invitados: number; asientos_bloqueados: number } | null>(null);
  const [dataLoading, setDataLoading] = useState(false);

  /* ───── Ajuste manual de aforo (asientos_bloqueados) ───── */
  const [showAforoControl, setShowAforoControl] = useState(false);
  const [manualBlockInput, setManualBlockInput] = useState("");

  async function handleAdjustAforo(delta: number) {
    if (!selectedCeremoniaId || !ceremonyDetails) return;
    const nuevo = Math.max(0, (ceremonyDetails.asientos_bloqueados ?? 0) + delta);
    try {
      const s = createClient();
      await (s.from("ceremonias") as any)
        .update({ asientos_bloqueados: nuevo })
        .eq("id", selectedCeremoniaId);
      setCeremonyDetails({ ...ceremonyDetails, asientos_bloqueados: nuevo });
      setAlert({ type: "success", message: `Aforo bloqueado ajustado a ${nuevo} asientos.` });
    } catch {
      setAlert({ type: "error", message: "Error de red al ajustar aforo." });
    }
  }

  /* ───── Filtro rápido desde KPIs ───── */
  const [filtroMetrica, setFiltroMetrica] = useState<'todos' | 'togas_pendientes' | 'dni_retenidos' | 'ingresados'>('todos');

  const totalEgresados = fullEgresadosList.length;
  const invitadosIngresados = fullInvitadosList.filter(inv => inv.ingreso_at !== null).length;
  const egresadosIngresados = fullEgresadosList.filter(egr => egr.ingreso_evento === true || egr.confirmado_asistencia === true).length;
  const aforoLibre = Math.max(0, 180 - invitadosIngresados - egresadosIngresados - (ceremonyDetails?.asientos_bloqueados ?? 0));
  const togasPorDevolver = fullEgresadosList.filter(egr => egr.toga_entregada === true && egr.toga_devuelta === false).length;
  const dniRetenidos = fullEgresadosList.filter(egr => egr.dni_retenido === true).length;

  const egresadosAMostrar = fullEgresadosList.filter(egr => {
    const cumpleBusqueda = searchTerm
      ? (egr.dni.includes(searchTerm) || `${egr.nombres} ${egr.apellidos}`.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    let cumpleMetrica = true;
    if (filtroMetrica === 'togas_pendientes') cumpleMetrica = (egr.toga_entregada === true && egr.toga_devuelta === false);
    if (filtroMetrica === 'dni_retenidos') cumpleMetrica = (egr.dni_retenido === true);
    if (filtroMetrica === 'ingresados') cumpleMetrica = (egr.ingreso_evento === true);
    return cumpleBusqueda && cumpleMetrica;
  });

  const numerosFaltantes = fullEgresadosList
    .filter(egr => egr.ingreso_evento === false && egr.numero_orden != null)
    .map(egr => ({ id: egr.id, numero_orden: egr.numero_orden as number }))
    .sort((a, b) => a.numero_orden - b.numero_orden);

  async function selectByNumeroOrden(numero: number) {
    const egresado = fullEgresadosList.find(egr => egr.numero_orden === numero);
    if (!egresado) {
      setAlert({ type: "error", message: `N° de orden ${numero} no encontrado.` });
      return;
    }
    try {
      const s = createClient();
      const { data: invs } = await (s.from("invitados") as any)
        .select("id, nombres, apellidos, dni, estado, ingreso_at, qr_token")
        .eq("egresado_id", egresado.id);
      setSelectedEgresado({ ...egresado, invitados: invs ?? [] });
    } catch {
      setAlert({ type: "error", message: "Error al buscar invitados." });
    }
  }

  /* ───── Offline detection ───── */
  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  /* ───── Sync offline queue ───── */
  async function syncOfflineQueue(): Promise<boolean> {
    const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
    if (!raw) return true;
    const items = JSON.parse(raw);
    if (!items.length) return true;
    setSyncing(true);
    const s = createClient();
    for (const item of items) {
      const { error } = await (s.from("invitados") as any)
        .update({ ingreso_at: item.ingreso_at, ingresado_por: item.ingresado_por ?? currentUserId, metodo_ingreso: item.metodo_ingreso ?? "manual" })
        .eq("id", item.invitado_id)
        .is("ingreso_at", null);
      if (error) { setSyncing(false); return false; }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
    setSyncing(false);
    return true;
  }

  useEffect(() => {
    if (!online) return;
    syncOfflineQueue().then((ok) => { if (ok) fetchAllCeremonyData(); });
  }, [online]);

  /* ───── Load auth & ceremonies ───── */
  useEffect(() => {
    (async () => {
      try {
        const s = createClient();
        const { data: { user } } = await s.auth.getUser();
        if (!user) return;
        setCurrentUserId(user.id);

        const { data: usuario } = await (s.from("usuarios") as any)
          .select("sede_id")
          .eq("id", user.id)
          .single();

        let query = (s.from("ceremonias") as any)
          .select("id, nombre, fecha, hora_inicio")
          .in("estado", ["planificada", "en_curso"])
          .order("fecha", { ascending: true })
          .order("hora_inicio", { ascending: true });

        if (usuario?.sede_id) {
          query = query.eq("sede_id", usuario.sede_id);
        }

        const { data: ceremonies } = await query;
        const list = (ceremonies ?? []) as CeremoniaSelect[];
        setCeremoniasDisponibles(list);

        if (list.length > 0) {
          const now = new Date();
          let closest = list[0];
          let minDiff = Infinity;
          for (const c of list) {
            const cDate = new Date(`${c.fecha}T${c.hora_inicio}`);
            const diff = Math.abs(cDate.getTime() - now.getTime());
            if (diff < minDiff) { minDiff = diff; closest = c; }
          }
          setSelectedCeremoniaId(closest.id);
        }
        setCeremoniaLoading(false);
      } catch { setCeremoniaLoading(false); }
    })();
  }, []);

  /* ───── Re-fetch when ceremony changes ───── */
  useEffect(() => {
    if (!selectedCeremoniaId) return;
    fetchAllCeremonyData();
  }, [selectedCeremoniaId]);

  async function fetchAllCeremonyData() {
    if (!selectedCeremoniaId) return;
    setDataLoading(true);
    try {
      const s = createClient();
      const [egresadosRes, invitadosRes, ceremoniaRes] = await Promise.all([
        (s.from("egresados") as any)
          .select("id, nombres, apellidos, dni, numero_orden, equipo_entregado_at, dni_retenido, toga_devuelta, confirmado_asistencia, ingreso_evento, toga_entregada, hora_toga_entregada, hora_toga_devuelta, observaciones")
          .eq("ceremonia_id", selectedCeremoniaId),
        (s.from("invitados") as any)
          .select("id, egresado_id, nombres, apellidos, dni, estado, ingreso_at, qr_token")
          .eq("ceremonia_id", selectedCeremoniaId),
        (s.from("ceremonias") as any)
          .select("aforo_total_invitados, asientos_bloqueados")
          .eq("id", selectedCeremoniaId)
          .single(),
      ]);
      if (egresadosRes.data) setFullEgresadosList(egresadosRes.data);
      if (invitadosRes.data) setFullInvitadosList(invitadosRes.data);
      if (ceremoniaRes.data) setCeremonyDetails(ceremoniaRes.data);
    } catch {}
    setDataLoading(false);
  }

  /* ───── Real-time search egresados ───── */
  async function doSearch() {
    const term = searchTerm.trim();
    if (!term || !selectedCeremoniaId) return;
    setSearching(true);
    setSelectedEgresado(null);
    try {
      const s = createClient();
      let query = (s.from("egresados") as any)
        .select("id, nombres, apellidos, dni, numero_orden, equipo_entregado_at, equipo_entregado_por, dni_retenido, dni_devuelto_at, toga_devuelta, confirmado_asistencia, ingreso_evento, toga_entregada, hora_toga_entregada, hora_toga_devuelta, observaciones")
        .eq("ceremonia_id", selectedCeremoniaId);
      if (/^\d{1,8}$/.test(term)) {
        query = query.eq("dni", term);
      } else {
        query = query.ilike("apellidos", `%${term}%`);
      }
      const { data: egresados } = await query.limit(10);
      if (!egresados || egresados.length === 0) {
        setSearchResults([]);
        setAlert({ type: "info", message: "Ningún egresado coincide con la búsqueda." });
        setSearching(false);
        return;
      }
      const egsWithInv = await Promise.all(
        egresados.map(async (e: any) => {
          const { data: invs } = await (s.from("invitados") as any)
            .select("id, nombres, apellidos, dni, estado, ingreso_at, qr_token")
            .eq("egresado_id", e.id);
          return { ...e, invitados: invs ?? [] };
        })
      );
      setSearchResults(egsWithInv);
      setAlert(null);
    } catch {}
    setSearching(false);
  }

  /* ───── DNI search in Tab Invitados ───── */
  async function doDniSearch() {
    const term = dniSearchTerm.trim();
    if (!term || !selectedCeremoniaId) return;
    setDniSearching(true);
    setDniSearchResult(null);
    try {
      const s = createClient();
      const { data } = await (s.from("invitados") as any)
        .select("id, egresado_id, nombres, apellidos, dni, estado, ingreso_at, qr_token")
        .eq("ceremonia_id", selectedCeremoniaId)
        .eq("dni", term)
        .maybeSingle();
      if (!data) {
        setAlert({ type: "info", message: "No se encontró invitado con ese DNI." });
      } else {
        setDniSearchResult(data);
      }
    } catch {} finally {
      setDniSearching(false);
    }
  }

  /* ───── QR Scanner ───── */
  const [scannerRequested, setScannerRequested] = useState(false);

  useEffect(() => {
    if (!scannerRequested) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled || scannerRef.current) return;
      try {
        const el = document.getElementById(SCANNER_ELEMENT_ID);
        if (!el) return;
        const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID);
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (cancelled) return;
            await stopScanner();
            setScannerRequested(false);
            const token = decodedText.trim();
            try {
              const s = createClient();
              const { data } = await (s.from("invitados") as any)
                .select("id, egresado_id, nombres, apellidos, ingreso_at, egresados!egresado_id(nombres, apellidos)")
                .eq("qr_token", token)
                .single();
              if (!data) { setAlert({ type: "error", message: "QR no válido." }); return; }
              if (data.ingreso_at) { setAlert({ type: "error", message: `Ya ingresó a las ${toPeruTime(data.ingreso_at)}.` }); return; }
              const invNombre = `${data.nombres} ${data.apellidos}`;
              const egrNombre = data.egresados ? `${data.egresados.nombres} ${data.egresados.apellidos}` : "—";
              await markInvEntry(data.id, "qr", { invitadoNombre: invNombre, egresadoNombre: egrNombre, egresadoId: data.egresado_id });
            } catch { setAlert({ type: "error", message: "Error al leer QR." }); }
          },
          () => {}
        );
        if (!cancelled) setScannerActive(true);
      } catch {
        if (!cancelled) setAlert({ type: "error", message: "No se pudo iniciar la cámara." });
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [scannerRequested]);

  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;
    try { await scannerRef.current.stop(); await scannerRef.current.clear(); } catch {}
    scannerRef.current = null;
    setScannerActive(false);
  }, []);

  useEffect(() => () => { stopScanner(); }, [stopScanner]);

  /* ───── Marcar ingreso de invitado (síncrono estricto) ───── */
  async function markInvEntry(invId: string, metodo: "qr" | "dni" | "manual", qrFeedback?: { invitadoNombre: string; egresadoNombre: string; egresadoId: string }) {
    if (updatingInv) return;
    setUpdatingInv(invId);
    const ingresoAt = nowPeruISO();
    try {
      if (!online) {
        const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || "[]");
        queue.push({ invitado_id: invId, ingreso_at: ingresoAt, ingresado_por: currentUserId, metodo_ingreso: metodo });
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
        const syncOk = await syncOfflineQueue();
        if (syncOk) {
          if (selectedEgresado) {
            const updated = selectedEgresado.invitados.map((inv) =>
              inv.id === invId ? { ...inv, ingreso_at: ingresoAt } : inv
            );
            setSelectedEgresado({ ...selectedEgresado, invitados: updated });
          }
          if (dniSearchResult?.id === invId) {
            setDniSearchResult({ ...dniSearchResult, ingreso_at: ingresoAt });
          }
          setFullInvitadosList(prev => prev.map(inv => inv.id === invId ? { ...inv, ingreso_at: ingresoAt } : inv));
          fetchAllCeremonyData();
          qrFeedback
            ? setAlert({ type: "success", message: `Ingreso exitoso: ${qrFeedback.invitadoNombre}` })
            : setAlert({ type: "success", message: "Ingreso registrado." });
        } else {
          setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
        }
        setUpdatingInv(null);
        return;
      }

      const s = createClient();
      const { error } = await (s.from("invitados") as any)
        .update({ ingreso_at: ingresoAt, ingresado_por: currentUserId, metodo_ingreso: metodo })
        .eq("id", invId)
        .is("ingreso_at", null);
      if (error) {
        setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
        setUpdatingInv(null);
        return;
      }

      if (selectedEgresado) {
        const updated = selectedEgresado.invitados.map((inv) =>
          inv.id === invId ? { ...inv, ingreso_at: ingresoAt } : inv
        );
        setSelectedEgresado({ ...selectedEgresado, invitados: updated });
      }
      if (dniSearchResult?.id === invId) {
        setDniSearchResult({ ...dniSearchResult, ingreso_at: ingresoAt });
      }
      setFullInvitadosList(prev => prev.map(inv => inv.id === invId ? { ...inv, ingreso_at: ingresoAt } : inv));
      if (qrFeedback) {
        const { count: totalIngresados } = await (s.from("invitados") as any)
          .select("*", { count: "exact", head: true })
          .eq("egresado_id", qrFeedback.egresadoId)
          .not("ingreso_at", "is", null);
        setAlert({ type: "success", message: `Ingreso exitoso: ${qrFeedback.invitadoNombre} | Egresado: ${qrFeedback.egresadoNombre} | Invitados adentro: ${totalIngresados ?? 0}` });
      } else {
        setAlert({ type: "success", message: "Ingreso registrado." });
      }
      fetchAllCeremonyData();
    } catch {
      setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
    }
    setUpdatingInv(null);
  }

  /* ───── Acciones del egresado ───── */
  async function handleMarcarIngreso() {
    if (!selectedEgresado) return;
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ ingreso_evento: true })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, ingreso_evento: true });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, ingreso_evento: true } : egr));
      fetchAllCeremonyData();
    } catch {}
  }

  async function handleAnularIngreso() {
    if (!selectedEgresado) return;
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ ingreso_evento: false })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, ingreso_evento: false });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, ingreso_evento: false } : egr));
      fetchAllCeremonyData();
      setAlert({ type: "success", message: "Ingreso anulado. El egresado vuelve a la lista de faltantes." });
    } catch {
      setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
    }
  }

  async function handleSaveObservaciones() {
    if (!selectedEgresado) return;
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ observaciones: observacionesNota || null })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, observaciones: observacionesNota || null });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, observaciones: observacionesNota || null } : egr));
      setAlert({ type: "success", message: "Observación guardada." });
    } catch {
      setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
    }
  }

  async function handleEntregarToga() {
    if (!selectedEgresado) return;
    const now = nowPeruISO();
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ toga_entregada: true, hora_toga_entregada: now, equipo_entregado_por: currentUserId, dni_retenido: true })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, toga_entregada: true, hora_toga_entregada: now, equipo_entregado_por: currentUserId, dni_retenido: true });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, toga_entregada: true, hora_toga_entregada: now, equipo_entregado_por: currentUserId, dni_retenido: true } : egr));
      fetchAllCeremonyData();
    } catch {}
  }

  async function handleDevolverToga() {
    if (!selectedEgresado) return;
    const now = nowPeruISO();
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ toga_devuelta: true, hora_toga_devuelta: now, dni_retenido: false, dni_devuelto_at: now })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, toga_devuelta: true, hora_toga_devuelta: now, dni_retenido: false, dni_devuelto_at: now });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, toga_devuelta: true, hora_toga_devuelta: now, dni_retenido: false, dni_devuelto_at: now } : egr));
      fetchAllCeremonyData();
    } catch {}
  }

  async function handleUndoDevolucion() {
    if (!selectedEgresado) return;
    try {
      const s = createClient();
      await (s.from("egresados") as any)
        .update({ toga_devuelta: false, hora_toga_devuelta: null })
        .eq("id", selectedEgresado.id);
      setSelectedEgresado({ ...selectedEgresado, toga_devuelta: false, hora_toga_devuelta: null });
      setFullEgresadosList(prev => prev.map(egr => egr.id === selectedEgresado.id ? { ...egr, toga_devuelta: false, hora_toga_devuelta: null } : egr));
      fetchAllCeremonyData();
      setAlert({ type: "success", message: "Devolución anulada correctamente." });
    } catch {
      setAlert({ type: "error", message: "Error de red, intenta de nuevo." });
    }
  }

  /* ───── Last minute guest (vinculado al egresado seleccionado) ───── */
  async function addLastMinuteGuest() {
    const dni = lmDni.trim();
    const nombres = capitalizarNombre(lmNombres.trim());
    const apellidos = capitalizarNombre(lmApellidos.trim());
    if (!/^\d{8}$/.test(dni)) { setAlert({ type: "error", message: "DNI inválido — debe tener exactamente 8 dígitos." }); return; }
    if (!nombres) { setAlert({ type: "error", message: "Ingresa los nombres del invitado." }); return; }
    if (!apellidos) { setAlert({ type: "error", message: "Ingresa los apellidos del invitado." }); return; }
    if (!selectedEgresado) { setAlert({ type: "error", message: "Selecciona un egresado primero." }); return; }
    if (!selectedCeremoniaId) { setAlert({ type: "error", message: "No hay ceremonia activa." }); return; }
    if (!online) { setAlert({ type: "error", message: "Sin conexión a internet — no se puede registrar invitados sin conexión." }); return; }
    setLmSubmitting(true);
    try {
      const s = createClient();

      const { data: existing } = await (s.from("invitados") as any)
        .select("id, nombres, apellidos")
        .eq("ceremonia_id", selectedCeremoniaId)
        .eq("dni", dni)
        .maybeSingle();
      if (existing) {
        setAlert({ type: "error", message: `Ya existe un invitado con ese DNI: ${existing.nombres} ${existing.apellidos}.` });
        setLmSubmitting(false);
        return;
      }

      const ingresoAt = nowPeruISO();
      const { data: newInv, error } = await (s.from("invitados") as any).insert({
        egresado_id: selectedEgresado.id,
        ceremonia_id: selectedCeremoniaId,
        dni,
        nombres,
        apellidos,
        tipo_cupo: "base",
        estado: "aprobado",
        ingreso_at: ingresoAt,
        ingresado_por: currentUserId,
        metodo_ingreso: "manual",
      }).select("id, nombres, apellidos, dni, estado, ingreso_at, qr_token").single();

      if (error) { setAlert({ type: "error", message: "Error al registrar." }); setLmSubmitting(false); return; }

      const updatedInvitados = [...selectedEgresado.invitados, newInv];
      setSelectedEgresado({ ...selectedEgresado, invitados: updatedInvitados });
      setFullInvitadosList(prev => [...prev, newInv]);
      setLmDni(""); setLmNombres(""); setLmApellidos("");
      setShowLastMinuteModal(false);
      setLmSubmitting(false);
      setAlert({ type: "success", message: `Invitado de último minuto registrado con ingreso confirmado para ${selectedEgresado.nombres}.` });
      fetchAllCeremonyData();
    } catch { setAlert({ type: "error", message: "Error al registrar." }); setLmSubmitting(false); }
  }

  /* ───── Tab styles ───── */
  const tabClass = (tab: TabId) =>
    `flex-1 h-12 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
      activeTab === tab
        ? "bg-primary text-white shadow-lg"
        : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-300 border-2 border-gray-200 dark:border-slate-600 hover:border-primary"
    }`;

  console.log("Egresados cargados:", fullEgresadosList.length, "Mostrando por filtros:", egresadosAMostrar.length, "Filtro:", filtroMetrica, "Búsqueda:", searchTerm);

  return (
    <div className="min-h-screen bg-background dark:bg-slate-950 text-on-background dark:text-white antialiased flex flex-col">
      <Header showLogout />

      <main className="w-full max-w-4xl mx-auto px-4 md:px-lg pt-24 pb-32 flex flex-col gap-6 flex-1 animate-fadeUp">
        {/* ── Selector de Ceremonia ── */}
        {ceremoniaLoading ? (
          <div className="h-16 bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-2xl animate-pulse" />
        ) : ceremoniasDisponibles.length > 0 ? (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 whitespace-nowrap shrink-0">
              📍 Ceremonia Activa:
            </span>
            <div className="relative flex-1 max-w-md">
              <select
                value={selectedCeremoniaId ?? ""}
                onChange={(e) => setSelectedCeremoniaId(e.target.value || null)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2.5 shadow-sm transition-colors cursor-pointer appearance-none"
              >
                {ceremoniasDisponibles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre} — {new Date(c.fecha).toLocaleDateString("es-PE")} {c.hora_inicio?.slice(0, 5)}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full h-16 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-600 rounded-2xl flex items-center justify-center gap-3 px-5">
            <AlertCircle size={22} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <p className="text-base font-semibold text-amber-800 dark:text-amber-200">
              No hay ceremonias activas. Contacta al encargado.
            </p>
          </div>
        )}

        {/* ── Guard: sin ceremonia seleccionada ── */}
        {!selectedCeremoniaId && !ceremoniaLoading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Calendar size={64} className="text-gray-300 dark:text-slate-600 mb-4" />
            <h2 className="text-2xl font-bold text-gray-500 dark:text-slate-400 mb-2">
              Por favor seleccione una ceremonia
            </h2>
            <p className="text-base text-gray-400 dark:text-slate-500">
              Selecciona una ceremonia del listado superior para iniciar el control de puerta.
            </p>
          </div>
        )}

        {selectedCeremoniaId && (
        <>
        {/* ── Tabs ── */}
        <section className="flex gap-3">
          <button onClick={() => { setActiveTab("egresados"); stopScanner(); setScannerRequested(false); }} className={tabClass("egresados")}>
            <Users size={20} />
            Egresados (Togas y DNIs)
          </button>
          <button onClick={() => { setActiveTab("invitados"); }} className={tabClass("invitados")}>
            <Scan size={20} />
            Invitados (QR y Búsqueda)
          </button>
        </section>

        {/* ── Online/offline badge ── */}
        <div className="flex items-center gap-2 text-sm">
          {online ? (
            <><Wifi size={16} className="text-green-600" /><span className="text-green-700 font-medium">En línea</span></>
          ) : (
            <><WifiOff size={16} className="text-red-500" /><span className="text-red-600 font-medium">Sin conexión</span></>
          )}
          {syncing && (
            <span className="flex items-center gap-1 text-sm text-primary ml-3">
              <Loader2 size={14} className="animate-spin" /> Sincronizando...
            </span>
          )}
        </div>

        {/* ════════════ TAB 1: EGRESADOS ════════════ */}
        {activeTab === "egresados" && (
          <>
            {/* ── Números Faltantes (botonera interactiva) ── */}
            {numerosFaltantes.length > 0 && (
              <section className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider">
                    Faltan ingresar ({numerosFaltantes.length})
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {numerosFaltantes.map(({ id, numero_orden }) => (
                    <button
                      key={id}
                      onClick={() => selectByNumeroOrden(numero_orden)}
                      className="w-10 h-10 rounded-lg bg-surface-container-high hover:bg-primary/10 text-on-surface border border-outline/20 font-bold transition-colors active:scale-95 shadow-sm text-sm flex items-center justify-center"
                    >
                      {numero_orden}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Buscadores */}
            <section className="flex gap-3">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search className="text-gray-400 dark:text-slate-400" size={20} />
                </div>
                <input
                  aria-label="Buscar por DNI o Apellidos"
                  className="w-full h-14 pl-11 pr-4 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-600 rounded-2xl text-lg text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Buscar por DNI o Apellidos..."
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doSearch(); }}
                />
              </div>
              <div className="relative w-36 shrink-0">
                <input
                  aria-label="Buscar por N° de Orden"
                  className="w-full h-14 px-4 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-600 rounded-2xl text-lg text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 text-center"
                  placeholder="N° Orden"
                  type="text"
                  inputMode="numeric"
                  value={ordenSearchTerm}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, "");
                    setOrdenSearchTerm(v);
                  }}
                  onKeyDown={async (e) => {
                    if (e.key !== "Enter") return;
                    const num = parseInt(ordenSearchTerm, 10);
                    if (isNaN(num)) return;
                    setOrdenSearchTerm("");
                    await selectByNumeroOrden(num);
                  }}
                />
              </div>
            </section>

            {/* ── Filtro activo banner ── */}
            {filtroMetrica !== 'todos' && (
              <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-xl px-4 py-2.5">
                <span className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                  <span>⚠️</span> Mostrando solo: <strong>{
                    filtroMetrica === 'togas_pendientes' ? 'Togas por Devolver' :
                    filtroMetrica === 'dni_retenidos' ? 'DNIs Retenidos' :
                    'Ingresados'
                  }</strong>
                </span>
                <button
                  onClick={() => { setFiltroMetrica('todos'); setSelectedEgresado(null); setOrdenSearchTerm(""); setSearchTerm(""); }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors"
                >
                  Quitar filtro
                </button>
              </div>
            )}

            {/* ── Resultados filtrados (búsqueda + KPI) ── */}
            {(searchTerm.trim() || filtroMetrica !== 'todos') && !selectedEgresado && (
              <section className="flex flex-col gap-2">
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{egresadosAMostrar.length} egresado(s)</p>
                {egresadosAMostrar.map((eg) => (
                  <button
                    key={eg.id}
                    onClick={async () => {
                      const s = createClient();
                      const { data: invs } = await (s.from("invitados") as any)
                        .select("id, nombres, apellidos, dni, estado, ingreso_at, qr_token")
                        .eq("egresado_id", eg.id);
                      setSelectedEgresado({ ...eg, invitados: invs ?? [] });
                    }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{eg.numero_orden ?? "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{eg.apellidos}, {eg.nombres}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">DNI: {eg.dni}</p>
                    </div>
                  </button>
                ))}
                {egresadosAMostrar.length === 0 && (
                  <p className="text-center text-gray-400 dark:text-slate-500 py-4">Ningún egresado coincide con este filtro.</p>
                )}
              </section>
            )}

            {/* Server search results (con invitados) */}
            {searchResults.length > 0 && !selectedEgresado && (
              <section className="flex flex-col gap-2">
                <p className="text-sm text-gray-500 dark:text-slate-400 font-medium">{searchResults.length} resultado(s) — presiona para ver detalles</p>
                {searchResults.map((eg) => (
                  <button
                    key={eg.id}
                    onClick={() => { setSelectedEgresado(eg); setSearchResults([]); setSearchTerm(""); }}
                    className="w-full bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-2xl p-5 text-left hover:border-primary hover:shadow-lg transition-all flex items-center gap-4"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                      <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{eg.numero_orden ?? "?"}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{eg.apellidos}, {eg.nombres}</p>
                      <p className="text-sm text-gray-500 dark:text-slate-400">DNI: {eg.dni} — {eg.invitados.length} invitado(s)</p>
                    </div>
                  </button>
                ))}
              </section>
            )}

            {searching && (
              <div className="flex items-center justify-center gap-3 py-4">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="text-gray-500 dark:text-slate-400">Buscando...</span>
              </div>
            )}

            {/* ── Tarjeta de egresado seleccionado ── */}
            {selectedEgresado && (
              <section className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-3xl p-6 shadow-xl">
                {/* Header */}
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-20 h-20 rounded-3xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl font-black text-purple-700 dark:text-purple-300">{selectedEgresado.numero_orden ?? "?"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate flex items-center gap-2">
                      {selectedEgresado.apellidos}, {selectedEgresado.nombres}
                      {selectedEgresado.observaciones && (
                        <span title="Tiene observaciones" className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-bold">
                          <FileText size={12} /> Nota
                        </span>
                      )}
                    </h2>
                    <p className="text-base text-gray-500 dark:text-slate-400">DNI: {selectedEgresado.dni}</p>
                  </div>
                </div>

                {/* ── FASE DE ENTRADA ── */}
                {!selectedEgresado.toga_devuelta && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      Fase de Entrada
                    </h3>
                    <div className="flex flex-col gap-3">
                      {/* RSVP label — solo informativo */}
                      {selectedEgresado.confirmado_asistencia && (
                        <div className="w-full h-14 rounded-2xl bg-green-100 dark:bg-green-900/40 border-2 border-green-400 text-green-800 dark:text-green-200 text-base font-bold flex items-center justify-center gap-3">
                          <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                          RSVP: Confirmó Asistencia
                        </div>
                      )}

                      {/* Marcar / Anular Ingreso a Campus */}
                      {selectedEgresado.ingreso_evento ? (
                        <button
                          onClick={handleAnularIngreso}
                          className="w-full h-14 rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-base font-bold flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all cursor-pointer"
                        >
                          <XCircle size={24} />
                          Anular Ingreso
                        </button>
                      ) : (
                        <button
                          onClick={handleMarcarIngreso}
                          className="w-full h-14 rounded-2xl border-2 border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-slate-300 text-base font-bold flex items-center justify-center gap-3 hover:border-primary transition-all cursor-pointer"
                        >
                          <User size={24} className="text-gray-300 dark:text-slate-500" />
                          Marcar Ingreso a Campus
                        </button>
                      )}

                      {/* Entregar Toga y Retener DNI */}
                      <button
                        onClick={handleEntregarToga}
                        disabled={selectedEgresado.toga_entregada}
                        className={`w-full h-14 rounded-2xl border-2 text-base font-bold flex items-center justify-center gap-3 transition-all ${
                          selectedEgresado.toga_entregada
                            ? "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-400 text-yellow-800 dark:text-yellow-200"
                            : "bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-300 hover:border-primary"
                        } ${selectedEgresado.toga_entregada ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <Shield size={24} className={
                          selectedEgresado.toga_entregada
                            ? "text-yellow-600 dark:text-yellow-400"
                            : "text-gray-300 dark:text-slate-500"
                        } />
                        {selectedEgresado.toga_entregada
                          ? `Toga Entregada — DNI Retenido ${toPeruTime(selectedEgresado.hora_toga_entregada)}`
                          : "Entregar Toga y Retener DNI"}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── FASE DE SALIDA ── */}
                {selectedEgresado.toga_entregada && !selectedEgresado.toga_devuelta && (
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      Fase de Salida
                    </h3>
                    <button
                      onClick={handleDevolverToga}
                      className="w-full h-20 rounded-2xl border-2 border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xl font-black flex items-center justify-center gap-3 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all shadow-lg cursor-pointer"
                    >
                      <Undo2 size={32} className="text-amber-600 dark:text-amber-400" />
                      Recibir Toga y Devolver DNI
                    </button>
                  </div>
                )}

                {/* ── EQUIPO COMPLETADO ── */}
                {selectedEgresado.toga_devuelta && (
                  <div className="mb-6">
                    <div className="p-4 rounded-2xl bg-green-100 dark:bg-green-900/40 border-2 border-green-400 text-green-800 dark:text-green-200 flex items-center gap-3 mb-3">
                      <CheckCircle size={28} className="text-green-600 dark:text-green-400 shrink-0" />
                      <div>
                        <p className="text-lg font-bold">Proceso Completado</p>
                        <p className="text-sm">
                          Toga Recibida — DNI Devuelto {toPeruTime(selectedEgresado.hora_toga_devuelta)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleUndoDevolucion}
                      className="w-full h-14 rounded-2xl border-2 border-red-400 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 text-base font-bold flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all cursor-pointer"
                    >
                      <Undo2 size={24} />
                      Anular Devolución
                    </button>
                  </div>
                )}

                {/* ── Observaciones Internas ── */}
                <div className="border-t-2 border-gray-100 dark:border-slate-700 pt-5 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <FileText size={18} />
                    Observaciones Internas
                  </h3>
                  <textarea
                    value={observacionesNota}
                    onChange={(e) => setObservacionesNota(e.target.value)}
                    placeholder="Ej: Dejó pasaporte en vez de DNI, no trajo invitados, etc."
                    rows={3}
                    className="w-full resize-none rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-surface-container-lowest text-sm text-gray-900 dark:text-white p-3 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder-gray-400 dark:placeholder-slate-500 transition-all"
                  />
                  <button
                    onClick={handleSaveObservaciones}
                    disabled={observacionesNota === (selectedEgresado.observaciones ?? "")}
                    className="mt-2 h-10 px-5 rounded-xl border-2 border-primary/40 text-primary font-bold text-sm flex items-center gap-2 hover:bg-primary/5 hover:border-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CheckCircle size={16} />
                    Guardar Nota
                  </button>
                </div>

                {/* ── Invitados ── */}
                <div className="border-t-2 border-gray-100 dark:border-slate-700 pt-5">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users size={22} />
                    Invitados ({selectedEgresado.invitados.length})
                  </h3>
                  {selectedEgresado.invitados.length === 0 ? (
                    <p className="text-sm text-gray-400 dark:text-slate-500 text-center py-4">Este egresado no ha registrado invitados.</p>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedEgresado.invitados.map((inv) => {
                        const yaIngreso = !!inv.ingreso_at;
                        return (
                          <div
                            key={inv.id}
                            className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                              yaIngreso
                                ? "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600"
                                : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600"
                            }`}
                          >
                            <div className="flex-1 min-w-0 mr-3">
                              <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                                {inv.nombres} {inv.apellidos}
                              </p>
                              <p className="text-sm text-gray-500 dark:text-slate-400">
                                DNI: {inv.dni}
                                {inv.ingreso_at && ` — Ingresó: ${toPeruTime(inv.ingreso_at)}`}
                              </p>
                            </div>
                            <button
                              onClick={() => markInvEntry(inv.id, "manual")}
                              disabled={updatingInv === inv.id || yaIngreso}
                              className={`h-14 px-6 rounded-xl text-base font-bold flex items-center gap-2 transition-all flex-shrink-0 ${
                                yaIngreso
                                  ? "bg-green-500 text-white cursor-default"
                                  : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-green-500 hover:text-white border-2 border-gray-200 dark:border-slate-600 hover:border-green-500"
                              } ${updatingInv === inv.id ? "opacity-50" : ""}`}
                            >
                              {updatingInv === inv.id ? (
                                <Loader2 size={22} className="animate-spin" />
                              ) : yaIngreso ? (
                                <><CheckCircle size={22} /> Ingresó</>
                              ) : (
                                "Marcar Ingreso"
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* ── Agregar Invitado de Último Minuto ── */}
                  <button
                    disabled={!online}
                    onClick={() => {
                      if (!online) {
                        setAlert({ type: "error", message: "Sin conexión a internet. Conéctate para registrar invitados de último minuto." });
                        return;
                      }
                      setShowLastMinuteModal(true);
                    }}
                    className="mt-4 w-full h-14 rounded-2xl border-2 border-dashed border-primary/50 text-primary font-bold text-base flex items-center justify-center gap-2 hover:bg-primary/5 hover:border-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    ➕ Agregar Invitado de Último Minuto
                  </button>
                </div>

                {/* Cerrar */}
                <button
                  onClick={() => { setSelectedEgresado(null); setSearchResults([]); setSearchTerm(""); setOrdenSearchTerm(""); }}
                  className="mt-5 w-full h-12 rounded-xl border-2 border-gray-200 dark:border-slate-600 text-gray-500 dark:text-slate-400 font-medium text-base hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cerrar — Buscar otro egresado
                </button>
              </section>
            )}
          </>
        )}

        {/* ════════════ TAB 2: INVITADOS ════════════ */}
        {activeTab === "invitados" && (
          <>
            {/* QR Scanner */}
            <section className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => {
                    if (scannerActive) { stopScanner(); setScannerRequested(false); }
                    else { setScannerRequested(true); }
                  }}
                  className={`flex-1 h-14 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${
                    scannerActive
                      ? "bg-red-500 text-white hover:bg-red-600"
                      : "bg-primary text-white hover:bg-primary/90"
                  }`}
                >
                  {scannerActive ? <XCircle size={24} /> : <QrCode size={24} />}
                  {scannerActive ? "Detener Escáner" : "Iniciar Escáner QR"}
                </button>
              </div>

              {/* Scanner viewfinder — wrapper forzado con fondo blanco y video full */}
              <div className={`${scannerActive ? "block" : "hidden"} w-full max-w-sm mx-auto bg-white rounded-lg overflow-hidden relative z-50 [&_video]:!object-cover [&_video]:!w-full [&_video]:!h-full border border-gray-300`}>
                <div id={SCANNER_ELEMENT_ID} className="w-full min-h-[300px]" />
              </div>
            </section>

            {/* O BÚSQUEDA MANUAL POR DNI */}
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-400" />
                <input
                  aria-label="Buscar invitado por DNI"
                  className="w-full h-14 pl-12 pr-4 bg-white dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-600 rounded-2xl text-lg text-gray-900 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none placeholder-gray-400 dark:placeholder-slate-500"
                  placeholder="Buscar invitado por DNI..."
                  type="text"
                  inputMode="numeric"
                  value={dniSearchTerm}
                  onChange={(e) => setDniSearchTerm(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") doDniSearch(); }}
                />
              </div>
              <button
                onClick={doDniSearch}
                disabled={dniSearching}
                className="h-14 px-6 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                {dniSearching ? <Loader2 size={20} className="animate-spin" /> : <Search size={20} />}
                Buscar
              </button>
            </div>

            {/* DNI search result */}
            {dniSearchResult && (
              <div className="bg-white dark:bg-slate-900 border-2 border-gray-100 dark:border-slate-700 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{dniSearchResult.nombres} {dniSearchResult.apellidos}</p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">DNI: {dniSearchResult.dni}</p>
                </div>
                <button
                  onClick={() => markInvEntry(dniSearchResult.id, "dni")}
                  disabled={updatingInv === dniSearchResult.id || !!dniSearchResult.ingreso_at}
                  className={`h-14 px-6 rounded-xl text-base font-bold flex items-center gap-2 transition-all flex-shrink-0 ${
                    dniSearchResult.ingreso_at
                      ? "bg-green-500 text-white cursor-default"
                      : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-green-500 hover:text-white border-2 border-gray-200 dark:border-slate-600 hover:border-green-500"
                  } ${updatingInv === dniSearchResult.id ? "opacity-50" : ""}`}
                >
                  {updatingInv === dniSearchResult.id ? (
                    <Loader2 size={22} className="animate-spin" />
                  ) : dniSearchResult.ingreso_at ? (
                    <><CheckCircle size={22} /> Ingresó</>
                  ) : (
                    "Marcar Ingreso"
                  )}
                </button>
              </div>
            )}
          </>
        )}

        {/* ── Alert ── */}
        {alert && (
          <section className="w-full">
            <div className={`p-4 rounded-2xl flex items-start gap-3 w-full border-2 shadow-lg ${
              alert.type === "error" ? "bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-600" : alert.type === "success" ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-600" : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-600"
            }`}>
              <AlertCircle size={22} className={`mt-0.5 shrink-0 ${alert.type === "error" ? "text-red-500" : alert.type === "success" ? "text-green-500" : "text-gray-400 dark:text-slate-400"}`} />
              <div className="flex flex-1 items-start justify-between gap-2">
                <span className={`text-base font-medium leading-relaxed ${
                  alert.type === "error" ? "text-red-700 dark:text-red-300" : alert.type === "success" ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"
                }`}>{alert.message}</span>
                <button onClick={() => setAlert(null)} className="p-1 hover:opacity-60 shrink-0 mt-0.5"><XCircle size={18} /></button>
              </div>
            </div>
          </section>
        )}

        {/* ── Metrics ── */}
        {dataLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 h-20 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {([
              { label: "Total Egresados", value: totalEgresados, icon: Users, filtro: 'todos' as const },
              { label: "Invitados Ingresados", value: invitadosIngresados, icon: CheckCircle, filtro: null },
              { label: "Aforo Libre", value: aforoLibre, icon: Table, filtro: null },
              { label: "Togas por Devolver", value: togasPorDevolver, icon: Undo2, filtro: 'togas_pendientes' as const },
              { label: "DNIs Retenidos", value: dniRetenidos, icon: Shield, filtro: 'dni_retenidos' as const },
            ] as { label: string; value: number; icon: any; filtro: 'todos' | 'togas_pendientes' | 'dni_retenidos' | null }[]).map((c) => {
              const handleClick = () => {
                if (c.label === "Total Egresados") {
                  setShowAforoControl(false);
                  setSearchTerm("");
                  setOrdenSearchTerm("");
                  setSelectedEgresado(null);
                  setFiltroMetrica("todos");
                  return;
                }
                if (c.label === "Aforo Libre") {
                  setShowAforoControl(prev => !prev);
                  return;
                }
                setShowAforoControl(false);
                setSelectedEgresado(null);
                const f = c.filtro;
                if (f) setFiltroMetrica(filtroMetrica === f ? 'todos' : f);
              };
              return (
                <div
                  key={c.label}
                  onClick={handleClick}
                  className={`cursor-pointer bg-white dark:bg-slate-900 p-3 rounded-xl border transition-all ${
                    c.filtro && filtroMetrica === c.filtro
                      ? 'border-indigo-500 ring-2 ring-indigo-500/40 shadow-md'
                      : 'border-slate-200 dark:border-slate-700 hover:shadow-md hover:ring-2 hover:ring-indigo-500/30'
                  }`}
                >
                  <div className="flex flex-col items-start justify-center gap-1">
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] md:text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase leading-tight line-clamp-2 pr-1">
                        {c.label}
                      </span>
                      <c.icon size={16} className="text-indigo-500 shrink-0" />
                    </div>
                    <span className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100">
                      {c.value.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Ajuste Manual de Aforo (inline) ── */}
        {showAforoControl && ceremonyDetails && (
          <section className="mb-6 p-4 rounded-2xl border-2 border-primary/20 bg-surface-container-low">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center gap-2">
              <Lock size={16} className="text-primary" />
              Ajuste Manual de Aforo
            </h3>
            <p className="text-sm text-on-surface-variant mb-3">
              Asientos bloqueados actualmente: <strong>{ceremonyDetails.asientos_bloqueados}</strong>
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              <button onClick={() => handleAdjustAforo(-5)} className="h-10 px-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-all cursor-pointer">-5 Sillas</button>
              <button onClick={() => handleAdjustAforo(-10)} className="h-10 px-4 rounded-xl border-2 border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/40 transition-all cursor-pointer">-10 Sillas</button>
              <button onClick={() => handleAdjustAforo(5)} className="h-10 px-4 rounded-xl border-2 border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 font-bold text-sm hover:bg-green-100 dark:hover:bg-green-900/40 transition-all cursor-pointer">+5 Sillas</button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                placeholder="Cantidad exacta"
                value={manualBlockInput}
                onChange={(e) => setManualBlockInput(e.target.value.replace(/\D/g, ""))}
                className="w-36 h-10 rounded-xl border-2 border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-gray-900 dark:text-white px-3 focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
              />
              <button
                onClick={() => {
                  const v = parseInt(manualBlockInput, 10);
                  if (!isNaN(v) && v >= 0) {
                    handleAdjustAforo(v - (ceremonyDetails.asientos_bloqueados ?? 0));
                    setManualBlockInput("");
                  }
                }}
                disabled={!manualBlockInput}
                className="h-10 px-4 rounded-xl border-2 border-primary/40 text-primary font-bold text-sm hover:bg-primary/5 hover:border-primary transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Establecer
              </button>
            </div>
          </section>
        )}

        </>
        )}
      </main>

      {/* ── Modal: Invitado de Último Minuto ── */}
      {showLastMinuteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-fadeUp">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                Invitado de Último Minuto
              </h3>
              <button onClick={() => { setShowLastMinuteModal(false); setLmDni(""); setLmNombres(""); setLmApellidos(""); }} className="text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-white transition-colors p-1">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Vinculado a: <strong>{selectedEgresado?.apellidos}, {selectedEgresado?.nombres}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">DNI *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={lmDni}
                  onChange={(e) => setLmDni(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="DNI del invitado"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Nombres *</label>
                <input
                  type="text"
                  value={lmNombres}
                  onChange={(e) => setLmNombres(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Juan Carlos"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Apellidos *</label>
                <input
                  type="text"
                  value={lmApellidos}
                  onChange={(e) => setLmApellidos(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  placeholder="Ej. Pérez Gómez"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => { setShowLastMinuteModal(false); setLmDni(""); setLmNombres(""); setLmApellidos(""); }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={addLastMinuteGuest}
                disabled={lmSubmitting}
                className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {lmSubmitting ? "Registrando..." : <><PlusCircle size={18} /> Registrar</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
