/**
 * Mapeo de acciones de auditoría a mensajes legibles en español
 */

export interface AuditLog {
  id: string
  user_id: string
  action: string
  entity_type: string
  entity_id: string
  old_value: any
  new_value: any
  ip_address?: string
  user_agent?: string
  created_at: string
}

export const ACTION_MESSAGES: Record<string, (log: AuditLog) => string> = {
  // === PEDIDOS ===
  'order.created': (log) => {
    const customer = log.new_value?.customer_name || 'cliente desconocido'
    const orderId = log.entity_id || log.new_value?.order_id
    return `creó el pedido ${orderId} para ${customer}`
  },
  'order.updated': (log) => {
    const orderId = log.entity_id || log.new_value?.order_id
    return `editó el pedido ${orderId}`
  },
  'order.deleted': (log) => {
    const orderId = log.entity_id || log.old_value?.order_id
    return `eliminó el pedido ${orderId}`
  },
  'order.status_changed': (log) => {
    const orderId = log.entity_id
    const newStatus = log.new_value?.status || 'desconocido'
    return `cambió el estado del pedido ${orderId} a "${newStatus}"`
  },
  'order.payment_changed': (log) => {
    const orderId = log.entity_id
    const newPayment = log.new_value?.payment_status || 'desconocido'
    return `cambió el estado de pago del pedido ${orderId} a "${newPayment}"`
  },

  // === CLIENTES ===
  'customer.created': (log) => {
    const name = log.new_value?.name || 'cliente desconocido'
    return `creó el cliente "${name}"`
  },
  'customer.updated': (log) => {
    const name = log.new_value?.name || log.old_value?.name || 'cliente'
    return `editó el cliente "${name}"`
  },
  'customer.deleted': (log) => {
    const name = log.old_value?.name || 'cliente'
    return `eliminó el cliente "${name}"`
  },

  // === PRODUCTOS ===
  'product.created': (log) => {
    const name = log.new_value?.name || 'producto desconocido'
    return `creó el producto "${name}"`
  },
  'product.updated': (log) => {
    const name = log.new_value?.name || log.old_value?.name || 'producto'
    return `editó el producto "${name}"`
  },
  'product.deleted': (log) => {
    const name = log.old_value?.name || 'producto'
    return `eliminó el producto "${name}"`
  },

  // === PROVEEDORES ===
  'supplier.created': (log) => {
    const name = log.new_value?.name || 'proveedor desconocido'
    return `creó el proveedor "${name}"`
  },
  'supplier.updated': (log) => {
    const name = log.new_value?.name || log.old_value?.name || 'proveedor'
    return `editó el proveedor "${name}"`
  },
  'supplier.deleted': (log) => {
    const name = log.old_value?.name || 'proveedor'
    return `eliminó el proveedor "${name}"`
  },

  // === COMPRAS ===
  'purchase.created': (log) => {
    const purchaseId = log.entity_id
    const supplier = log.new_value?.supplier_name || 'proveedor desconocido'
    return `creó la compra ${purchaseId} para ${supplier}`
  },
  'purchase.updated': (log) => {
    const purchaseId = log.entity_id
    return `editó la compra ${purchaseId}`
  },
  'purchase.deleted': (log) => {
    const purchaseId = log.entity_id
    return `eliminó la compra ${purchaseId}`
  },
  'purchase.status_changed': (log) => {
    const purchaseId = log.entity_id
    const newStatus = log.new_value?.status || 'desconocido'
    return `cambió el estado de la compra ${purchaseId} a "${newStatus}"`
  },

  // === COTIZACIONES ===
  'quote.created': (log) => {
    const quoteNumber = log.new_value?.quote_number || log.entity_id
    const customer = log.new_value?.customer_name || 'cliente desconocido'
    return `creó la cotización ${quoteNumber} para ${customer}`
  },
  'quote.updated': (log) => {
    const quoteNumber = log.new_value?.quote_number || log.entity_id
    return `editó la cotización ${quoteNumber}`
  },
  'quote.deleted': (log) => {
    const quoteNumber = log.old_value?.quote_number || log.entity_id
    return `eliminó la cotización ${quoteNumber}`
  },
  'quote.status_changed': (log) => {
    const quoteNumber = log.entity_id
    const newStatus = log.new_value?.status || 'desconocido'
    return `cambió el estado de la cotización ${quoteNumber} a "${newStatus}"`
  },
  'quote.pdf_generated': (log) => {
    const quoteNumber = log.entity_id
    return `generó el PDF de la cotización ${quoteNumber}`
  },

  // === DIRECCIONES ===
  'address.created': (log) => {
    const address = log.new_value?.raw_address || 'dirección'
    return `agregó la dirección "${address}"`
  },
  'address.updated': (log) => {
    const address = log.new_value?.raw_address || log.old_value?.raw_address || 'dirección'
    return `editó la dirección "${address}"`
  },
  'address.deleted': (log) => {
    const address = log.old_value?.raw_address || 'dirección'
    return `eliminó la dirección "${address}"`
  },
  'address.set_default': (log) => {
    const address = log.new_value?.raw_address || 'dirección'
    return `estableció como predeterminada la dirección "${address}"`
  },

  // === USUARIOS (ya existentes) ===
  'user.created': (log) => {
    const name = log.new_value?.nombre || log.new_value?.email || 'usuario'
    return `creó el usuario "${name}"`
  },
  'user.updated': (log) => {
    const name = log.new_value?.nombre || log.old_value?.nombre || 'usuario'
    return `editó el usuario "${name}"`
  },
  'user.deleted': (log) => {
    const name = log.old_value?.nombre || log.old_value?.email || 'usuario'
    return `eliminó el usuario "${name}"`
  },
  'user.activated': (log) => {
    const name = log.new_value?.nombre || 'usuario'
    return `activó el usuario "${name}"`
  },
  'user.deactivated': (log) => {
    const name = log.new_value?.nombre || 'usuario'
    return `desactivó el usuario "${name}"`
  },

  // === PERMISOS (ya existentes) ===
  'permission.granted': (log) => {
    const permId = log.new_value?.permission_id || 'permiso'
    return `otorgó el permiso "${permId}"`
  },
  'permission.revoked': (log) => {
    const permId = log.old_value?.permission_id || log.new_value?.permission_id || 'permiso'
    return `revocó el permiso "${permId}"`
  },
  'permission.grant': (log) => {
    const permId = log.new_value?.permissionId || 'permiso'
    return `otorgó el permiso "${permId}"`
  },
}

/**
 * Iconos para cada tipo de acción
 */
export const ACTION_ICONS: Record<string, string> = {
  // Pedidos
  'order.created': '🛒',
  'order.updated': '✏️',
  'order.deleted': '🗑️',
  'order.status_changed': '🔄',
  'order.payment_changed': '💰',

  // Clientes
  'customer.created': '👤',
  'customer.updated': '✏️',
  'customer.deleted': '🗑️',

  // Productos
  'product.created': '📦',
  'product.updated': '✏️',
  'product.deleted': '🗑️',

  // Proveedores
  'supplier.created': '🏢',
  'supplier.updated': '✏️',
  'supplier.deleted': '🗑️',

  // Compras
  'purchase.created': '🛍️',
  'purchase.updated': '✏️',
  'purchase.deleted': '🗑️',
  'purchase.status_changed': '🔄',

  // Cotizaciones
  'quote.created': '📄',
  'quote.updated': '✏️',
  'quote.deleted': '🗑️',
  'quote.status_changed': '🔄',
  'quote.pdf_generated': '📑',

  // Direcciones
  'address.created': '📍',
  'address.updated': '✏️',
  'address.deleted': '🗑️',
  'address.set_default': '⭐',

  // Usuarios
  'user.created': '👤',
  'user.updated': '✏️',
  'user.deleted': '🗑️',
  'user.activated': '✅',
  'user.deactivated': '❌',

  // Permisos
  'permission.granted': '🔓',
  'permission.revoked': '🔒',
  'permission.grant': '🔓',
}

/**
 * Colores para cada tipo de acción
 */
export const ACTION_COLORS: Record<string, string> = {
  created: 'text-green-600',
  updated: 'text-blue-600',
  deleted: 'text-red-600',
  changed: 'text-yellow-600',
  granted: 'text-green-600',
  revoked: 'text-red-600',
  activated: 'text-green-600',
  deactivated: 'text-gray-600',
  generated: 'text-purple-600',
}

/**
 * Obtiene el mensaje legible para una acción de auditoría
 */
export function getActionMessage(log: AuditLog): string {
  const formatter = ACTION_MESSAGES[log.action]
  if (formatter) {
    try {
      return formatter(log)
    } catch (error) {
      console.error('Error formateando mensaje de auditoría:', error, log)
      return log.action
    }
  }
  return log.action
}

/**
 * Obtiene el icono para una acción de auditoría
 */
export function getActionIcon(action: string): string {
  return ACTION_ICONS[action] || '📝'
}

/**
 * Obtiene el color para una acción de auditoría
 */
export function getActionColor(action: string): string {
  // Extraer el tipo de acción (created, updated, deleted, etc.)
  const actionType = action.split('.')[1] || 'updated'
  return ACTION_COLORS[actionType] || 'text-gray-600'
}

