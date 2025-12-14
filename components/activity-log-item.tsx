'use client'

import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { AuditLog, getActionMessage, getActionIcon, getActionColor } from '@/lib/audit-messages'

interface ActivityLogItemProps {
  log: AuditLog
}

export function ActivityLogItem({ log }: ActivityLogItemProps) {
  const message = getActionMessage(log)
  const icon = getActionIcon(log.action)
  const color = getActionColor(log.action)

  const timestamp = format(new Date(log.created_at), "dd MMM yyyy, HH:mm", {
    locale: es
  })

  return (
    <div className="flex gap-3 py-3 px-2 hover:bg-muted/50 rounded-lg transition-colors">
      <div className="flex-shrink-0 text-2xl mt-0.5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">
          <span className={`font-medium ${color}`}>
            {message}
          </span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {timestamp}
        </p>
      </div>
    </div>
  )
}

