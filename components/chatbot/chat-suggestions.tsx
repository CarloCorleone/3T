'use client'

import { QuickAction } from '@/types/chatbot'
import { Button } from '@/components/ui/button'
import { Package, DollarSign, Phone, TrendingUp } from 'lucide-react'

type ChatSuggestionsProps = {
  onSelectSuggestion: (query: string) => void
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'orders-in-route',
    label: 'Pedidos en ruta',
    icon: 'package',
    query: '¿Cuántos pedidos tengo en ruta hoy?',
  },
  {
    id: 'pending-payments',
    label: 'Cuentas por cobrar',
    icon: 'dollar',
    query: '¿Qué clientes tienen deuda pendiente?',
  },
  {
    id: 'customer-phone',
    label: 'Buscar teléfono',
    icon: 'phone',
    query: 'Buscar teléfono de cliente',
  },
  {
    id: 'weekly-sales',
    label: 'Ventas semanales',
    icon: 'trending',
    query: '¿Cuánto vendí esta semana?',
  },
]

const iconMap = {
  package: Package,
  dollar: DollarSign,
  phone: Phone,
  trending: TrendingUp,
}

export function ChatSuggestions({ onSelectSuggestion }: ChatSuggestionsProps) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
        Acciones rápidas:
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = iconMap[action.icon as keyof typeof iconMap]
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              className="justify-start text-xs h-auto py-2 px-3"
              onClick={() => onSelectSuggestion(action.query)}
            >
              <Icon size={14} className="mr-2 flex-shrink-0" />
              <span className="truncate">{action.label}</span>
            </Button>
          )
        })}
      </div>
    </div>
  )
}

