"use client"

import { Badge } from "@/components/ui/badge"

interface QuoteStatusBadgeProps {
  status: 'borrador' | 'enviado' | 'aprobado' | 'rechazado'
}

const statusConfig = {
  borrador: {
    label: 'Borrador',
    variant: 'secondary' as const,
    className: undefined,
  },
  enviado: {
    label: 'Enviado',
    variant: 'default' as const,
    className: undefined,
  },
  aprobado: {
    label: 'Aprobado',
    variant: 'default' as const,
    className: 'bg-green-500 hover:bg-green-600',
  },
  rechazado: {
    label: 'Rechazado',
    variant: 'destructive' as const,
    className: undefined,
  },
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  )
}

