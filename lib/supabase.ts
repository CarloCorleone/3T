import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,      // Habilitar persistencia de sesión
    autoRefreshToken: true,    // Habilitar refresh automático de tokens
    detectSessionInUrl: true,  // Detectar sesión en URL (para magic links)
    storageKey: 'supabase.auth.token',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  }
})

// Tipos TypeScript para las tablas
export type Customer = {
  customer_id: string
  email?: string
  phone?: string
  address_id?: string
  name?: string
  business_name?: string
  rut?: string
  contact_name?: string
  commune?: string
  customer_type?: 'Hogar' | 'Empresa'
  product_format?: string
  price?: number
}

export type Address = {
  address_id: string
  customer_id?: string
  raw_address?: string
  commune?: string
  street_name?: string
  street_number?: number
  apartment?: string
  directions?: string
  region?: string
  latitude?: number
  longitude?: number
  maps_link?: string
  is_default?: boolean
}

export type Product = {
  product_id: string
  name?: string
  image_url?: string
  category?: string
  price_neto?: number
  pv_iva_inc?: number
}

export type Order = {
  order_id: string
  customer_id?: string
  details?: string
  status?: 'Pedido' | 'Ruta' | 'Despachado'
  delivery_photo_path?: string
  delivery_datetime?: string
  product_type?: string
  quantity?: number
  payment_status?: 'Pendiente' | 'Pagado' | 'Facturado' | 'Interno'
  payment_type?: 'Efectivo' | 'Transferencia'
  delivery_address_id?: string
  order_date?: string
  delivered_date?: string
  payment_date?: string
  invoice_number?: string
  warehouse?: string
  bottles_returned?: number
  bottles_delivered?: number
  final_price?: number
  botellones_entregados?: number
  order_type?: 'recarga' | 'nuevo' | 'compras'
}

export type DashboardVentas = {
  order_id: string
  order_date: string
  delivered_date?: string
  invoice_date?: string
  payment_date?: string
  status?: string
  payment_status?: string
  payment_type?: string
  invoice_number?: string
  final_price?: number
  quantity?: number
  details?: string
  customer_id?: string
  customer_name?: string
  customer_type?: string
  customer_phone?: string
  address_id?: string
  raw_address?: string
  commune?: string
  latitude?: number
  longitude?: number
  product_name?: string
  product_category?: string
  tiempo_entrega_minutos?: number
  precio_con_iva?: number
  precio_neto?: number
}

export type Quote = {
  quote_id: string
  quote_number: string
  customer_id?: string
  customer_name: string
  customer_rut?: string
  customer_email?: string
  customer_phone?: string
  customer_address?: string
  subtotal: number
  iva_amount: number
  total: number
  payment_conditions: string
  valid_until: string
  status: 'borrador' | 'enviado' | 'aprobado' | 'rechazado'
  pdf_url?: string
  observations?: string
  created_at?: string
  updated_at?: string
}

export type QuoteItem = {
  item_id: string
  quote_id: string
  product_id?: string
  product_name: string
  product_description?: string
  quantity: number
  unit_price: number
  subtotal: number
  order_index: number
  created_at?: string
}

// Tipos para rutas optimizadas
export type SavedRoute = {
  route_id: string
  route_data: {
    routeGroups: any[] // RouteGroup[] - se define en google-maps.ts
  }
  total_orders: number
  total_routes: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Tipos para proveedores
export type Supplier = {
  supplier_id: string
  name: string
  phone?: string
  email?: string
  observations?: string
  created_at?: string
  updated_at?: string
}

export type SupplierAddress = {
  address_id: string
  supplier_id: string
  raw_address: string
  commune?: string
  street_name?: string
  street_number?: string
  apartment?: string
  directions?: string
  region?: string
  latitude?: number
  longitude?: number
  maps_link?: string
  is_default?: boolean
  created_at?: string
  updated_at?: string
}

// Tipos para compras
export type Purchase = {
  purchase_id: string
  supplier_id: string
  address_id?: string
  supplier_order_number?: string
  status?: 'Pedido' | 'Ruta' | 'Completado'
  purchase_date?: string
  completed_date?: string
  final_price?: number
  observations?: string
  created_at?: string
  updated_at?: string
}

export type PurchaseProduct = {
  id: string
  purchase_id: string
  product_id: string
  quantity: number
  unit_price: number
  total?: number
}

export type SupplierPriceHistory = {
  id: string
  supplier_id: string
  product_id: string
  price: number
  recorded_at: string
  purchase_id?: string
}

// Tipo para usuarios del sistema con autenticación
export type Usuario = {
  id: string
  email: string
  nombre: string
  rol: 'admin' | 'operador' | 'repartidor'
  role_id?: string
  activo: boolean
  last_login_at?: string
  login_count?: number
  created_at: string
  updated_at: string
}

// Tipos para sistema de permisos
export type Role = {
  role_id: string
  description: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type Permission = {
  permission_id: string
  module: string
  action: string
  description: string
  created_at: string
}

export type RolePermission = {
  id: string
  role_id: string
  permission_id: string
  created_at: string
}

export type UserPermission = {
  id: string
  user_id: string
  permission_id: string
  granted: boolean
  created_at: string
  created_by?: string
}

export type AuditLog = {
  id: string
  user_id?: string
  action: string
  entity_type: string
  entity_id: string
  old_value?: Record<string, any>
  new_value?: Record<string, any>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// Tipos para sistema de facturación
export type Invoice = {
  invoice_id: string
  invoice_number: string
  invoice_date: string
  subtotal: number
  tax_amount: number
  total_amount: number
  status: 'vigente' | 'anulada' | 'pendiente'
  invoice_type: 'venta' | 'exenta' | 'boleta'
  notes?: string
  pdf_url?: string
  created_by?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export type OrderInvoice = {
  id: string
  order_id: string
  invoice_id: string
  amount_invoiced: number
  notes?: string
  created_at: string
}

export type InvoiceWithOrders = Invoice & {
  orders: Array<{
    order_id: string
    order_date: string
    customer_name: string
    customer_type: string
    amount_invoiced: number
    product_name: string
  }>
}

export type OrderWithInvoices = {
  order_id: string
  order_date: string
  final_price: number
  customer_name: string
  total_invoiced: number
  remaining_to_invoice: number
  invoices: Array<{
    invoice_id: string
    invoice_number: string
    invoice_date: string
    amount_invoiced: number
    status: string
  }>
}

// Constante para el IVA de Chile
export const IVA_RATE = 0.19

