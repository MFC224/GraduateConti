export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      sedes: {
        Row: {
          id: string;
          nombre: string;
          ciudad: string | null;
          direccion: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          ciudad?: string | null;
          direccion?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          ciudad?: string | null;
          direccion?: string | null;
          activo?: boolean;
          created_at?: string;
        };
      };
      usuarios: {
        Row: {
          id: string;
          nombres: string;
          apellidos: string;
          dni: string | null;
          rol: "admin_general" | "encargado" | "operario";
          sede_id: string | null;
          activo: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          nombres: string;
          apellidos: string;
          dni?: string | null;
          rol: "admin_general" | "encargado" | "operario";
          sede_id?: string | null;
          activo?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          nombres?: string;
          apellidos?: string;
          dni?: string | null;
          rol?: "admin_general" | "encargado" | "operario";
          sede_id?: string | null;
          activo?: boolean;
          created_at?: string;
        };
      };
      ceremonias: {
        Row: {
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
          estado: "planificada" | "en_curso" | "finalizada" | "cancelada";
          autoridades: Json;
          creado_por: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
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
          estado?: "planificada" | "en_curso" | "finalizada" | "cancelada";
          autoridades?: Json;
          creado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
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
          estado?: "planificada" | "en_curso" | "finalizada" | "cancelada";
          autoridades?: Json;
          creado_por?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      egresados: {
        Row: {
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
        };
        Insert: {
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
        };
        Update: {
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
        };
      };
      invitados: {
        Row: {
          id: string;
          egresado_id: string;
          ceremonia_id: string;
          dni: string;
          nombres: string;
          apellidos: string;
          es_menor_7: boolean;
          tipo_cupo: "base" | "adicional";
          estado: "pendiente" | "aprobado" | "rechazado";
          qr_token: string;
          ingreso_at: string | null;
          ingresado_por: string | null;
          metodo_ingreso: "qr" | "dni" | "manual" | null;
          aprobado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          egresado_id: string;
          ceremonia_id: string;
          dni: string;
          nombres: string;
          apellidos: string;
          es_menor_7?: boolean;
          tipo_cupo?: "base" | "adicional";
          estado?: "pendiente" | "aprobado" | "rechazado";
          qr_token?: string;
          ingreso_at?: string | null;
          ingresado_por?: string | null;
          metodo_ingreso?: "qr" | "dni" | "manual" | null;
          aprobado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          egresado_id?: string;
          ceremonia_id?: string;
          dni?: string;
          nombres?: string;
          apellidos?: string;
          es_menor_7?: boolean;
          tipo_cupo?: "base" | "adicional";
          estado?: "pendiente" | "aprobado" | "rechazado";
          qr_token?: string;
          ingreso_at?: string | null;
          ingresado_por?: string | null;
          metodo_ingreso?: "qr" | "dni" | "manual" | null;
          aprobado_por?: string | null;
          created_at?: string;
        };
      };
      auditoria: {
        Row: {
          id: string;
          usuario_id: string | null;
          accion: string;
          entidad: string;
          entidad_id: string | null;
          detalle: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id?: string | null;
          accion: string;
          entidad: string;
          entidad_id?: string | null;
          detalle?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string | null;
          accion?: string;
          entidad?: string;
          entidad_id?: string | null;
          detalle?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      v_resumen_ceremonia: {
        Row: {
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
        };
      };
    };
  };
}
