export interface CotizacionItemBase {
  id?: string;
  tipo: "procedimiento" | "adicional" | "otroAdicional";
  item_id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CotizacionServicioIncluido {
  id?: string;
  servicio_nombre: string;
  requiere: boolean;
}

export interface Cotizacion {
  id: string;
  paciente_id: string;
  usuario_id: string;
  estado: "pendiente" | "aceptada" | "rechazada" | "facturada";
  items: CotizacionItemBase[];
  servicios_incluidos: CotizacionServicioIncluido[];
  subtotal_procedimientos: number;
  subtotal_adicionales: number;
  subtotal_otros_adicionales: number;
  total: number;
  observaciones: string;
  fecha_creacion: string;
  fecha_vencimiento: string;
  validez_dias: number;
  // Campos adicionales para mostrar
  paciente_nombre?: string;
  paciente_apellido?: string;
  usuario_nombre?: string;
  paciente_documento?: string;
}