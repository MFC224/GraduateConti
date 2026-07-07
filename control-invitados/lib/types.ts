export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type RolUsuario = "admin_general" | "encargado" | "operario";

export type EstadoCeremonia = "planificada" | "en_curso" | "finalizada" | "cancelada";

export type TipoCupo = "base" | "adicional";

export type EstadoInvitado = "pendiente" | "aprobado" | "rechazado";

export type MetodoIngreso = "qr" | "dni" | "manual";

export interface Autoridad {
  cargo: string;
  nombre: string;
}

export interface SedesRow {
  id: string;
  nombre: string;
  ciudad: string | null;
  direccion: string | null;
  activo: boolean;
  created_at: string;
}
export interface SedesInsert {
  id?: string;
  nombre: string;
  ciudad?: string | null;
  direccion?: string | null;
  activo?: boolean;
  created_at?: string;
}
export interface SedesUpdate {
  id?: string;
  nombre?: string;
  ciudad?: string | null;
  direccion?: string | null;
  activo?: boolean;
  created_at?: string;
}

export interface UsuariosRow {
  id: string;
  nombres: string;
  apellidos: string;
  dni: string | null;
  rol: RolUsuario;
  sede_id: string | null;
  activo: boolean;
  created_at: string;
}
export interface UsuariosInsert {
  id: string;
  nombres: string;
  apellidos: string;
  dni?: string | null;
  rol: RolUsuario;
  sede_id?: string | null;
  activo?: boolean;
  created_at?: string;
}
export interface UsuariosUpdate {
  id?: string;
  nombres?: string;
  apellidos?: string;
  dni?: string | null;
  rol?: RolUsuario;
  sede_id?: string | null;
  activo?: boolean;
  created_at?: string;
}

export interface CeremoniasRow {
  id: string;
  sede_id: string;
  nombre: string;
  programa_principal: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin: string | null;
  aforo_total_invitados: number;
  cupo_base_invitado: number;
  hora_liberacion_espera: string | null;
  espera_liberada: boolean;
  estado: EstadoCeremonia;
  autoridades: Json;
  creado_por: string | null;
  created_at: string;
  updated_at: string;
}
export interface CeremoniasInsert {
  id?: string;
  sede_id: string;
  nombre: string;
  programa_principal?: string | null;
  fecha: string;
  hora_inicio: string;
  hora_fin?: string | null;
  aforo_total_invitados: number;
  cupo_base_invitado?: number;
  hora_liberacion_espera?: string | null;
  espera_liberada?: boolean;
  estado?: EstadoCeremonia;
  autoridades?: Json;
  creado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}
export interface CeremoniasUpdate {
  id?: string;
  sede_id?: string;
  nombre?: string;
  programa_principal?: string | null;
  fecha?: string;
  hora_inicio?: string;
  hora_fin?: string | null;
  aforo_total_invitados?: number;
  cupo_base_invitado?: number;
  hora_liberacion_espera?: string | null;
  espera_liberada?: boolean;
  estado?: EstadoCeremonia;
  autoridades?: Json;
  creado_por?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface EgresadosRow {
  id: string;
  ceremonia_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  programa_academico: string | null;
  telefono: string | null;
  email: string | null;
  numero_orden: number | null;
  token_acceso: string;
  acceso_enviado_at: string | null;
  confirmado_asistencia: boolean;
  ingreso_evento: boolean;
  toga_entregada: boolean;
  hora_toga_entregada: string | null;
  es_discurso: boolean;
  equipo_entregado_at: string | null;
  equipo_entregado_por: string | null;
  dni_retenido: boolean;
  dni_devuelto_at: string | null;
  toga_devuelta: boolean;
  hora_toga_devuelta: string | null;
  created_at: string;
}
export interface EgresadosInsert {
  id?: string;
  ceremonia_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  programa_academico?: string | null;
  telefono?: string | null;
  email?: string | null;
  numero_orden?: number | null;
  token_acceso?: string;
  acceso_enviado_at?: string | null;
  confirmado_asistencia?: boolean;
  ingreso_evento?: boolean;
  toga_entregada?: boolean;
  hora_toga_entregada?: string | null;
  es_discurso?: boolean;
  equipo_entregado_at?: string | null;
  equipo_entregado_por?: string | null;
  dni_retenido?: boolean;
  dni_devuelto_at?: string | null;
  toga_devuelta?: boolean;
  hora_toga_devuelta?: string | null;
  created_at?: string;
}
export interface EgresadosUpdate {
  id?: string;
  ceremonia_id?: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  programa_academico?: string | null;
  telefono?: string | null;
  email?: string | null;
  numero_orden?: number | null;
  token_acceso?: string;
  acceso_enviado_at?: string | null;
  confirmado_asistencia?: boolean;
  ingreso_evento?: boolean;
  toga_entregada?: boolean;
  hora_toga_entregada?: string | null;
  es_discurso?: boolean;
  equipo_entregado_at?: string | null;
  equipo_entregado_por?: string | null;
  dni_retenido?: boolean;
  dni_devuelto_at?: string | null;
  toga_devuelta?: boolean;
  hora_toga_devuelta?: string | null;
  created_at?: string;
}

export interface InvitadosRow {
  id: string;
  egresado_id: string;
  ceremonia_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  es_menor_7: boolean;
  tipo_cupo: TipoCupo;
  estado: EstadoInvitado;
  qr_token: string;
  ingreso_at: string | null;
  ingresado_por: string | null;
  metodo_ingreso: MetodoIngreso | null;
  aprobado_por: string | null;
  created_at: string;
}
export interface InvitadosInsert {
  id?: string;
  egresado_id: string;
  ceremonia_id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  es_menor_7?: boolean;
  tipo_cupo?: TipoCupo;
  estado?: EstadoInvitado;
  qr_token?: string;
  ingreso_at?: string | null;
  ingresado_por?: string | null;
  metodo_ingreso?: MetodoIngreso | null;
  aprobado_por?: string | null;
  created_at?: string;
}
export interface InvitadosUpdate {
  id?: string;
  egresado_id?: string;
  ceremonia_id?: string;
  dni?: string;
  nombres?: string;
  apellidos?: string;
  es_menor_7?: boolean;
  tipo_cupo?: TipoCupo;
  estado?: EstadoInvitado;
  qr_token?: string;
  ingreso_at?: string | null;
  ingresado_por?: string | null;
  metodo_ingreso?: MetodoIngreso | null;
  aprobado_por?: string | null;
  created_at?: string;
}

export interface AuditoriaRow {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Json | null;
  created_at: string;
}
export interface AuditoriaInsert {
  id?: string;
  usuario_id?: string | null;
  accion: string;
  entidad: string;
  entidad_id?: string | null;
  detalle?: Json | null;
  created_at?: string;
}
export interface AuditoriaUpdate {
  id?: string;
  usuario_id?: string | null;
  accion?: string;
  entidad?: string;
  entidad_id?: string | null;
  detalle?: Json | null;
  created_at?: string;
}

export interface VResumenCeremoniaRow {
  ceremonia_id: string;
  ceremonia_nombre: string;
  aforo_total_invitados: number;
  cupo_base_invitado: number;
  total_egresados: number;
  egresados_confirmados: number;
  egresados_ingresados: number;
  invitados_aprobados: number;
  invitados_en_espera: number;
  invitados_ingresados: number;
  aforo_libre: number;
}

export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: SedesRow;
        Insert: SedesInsert;
        Update: SedesUpdate;
      };
      usuarios: {
        Row: UsuariosRow;
        Insert: UsuariosInsert;
        Update: UsuariosUpdate;
      };
      ceremonias: {
        Row: CeremoniasRow;
        Insert: CeremoniasInsert;
        Update: CeremoniasUpdate;
      };
      egresados: {
        Row: EgresadosRow;
        Insert: EgresadosInsert;
        Update: EgresadosUpdate;
      };
      invitados: {
        Row: InvitadosRow;
        Insert: InvitadosInsert;
        Update: InvitadosUpdate;
      };
      auditoria: {
        Row: AuditoriaRow;
        Insert: AuditoriaInsert;
        Update: AuditoriaUpdate;
      };
    };
    Views: {
      v_resumen_ceremonia: {
        Row: VResumenCeremoniaRow;
      };
    };
  };
}
