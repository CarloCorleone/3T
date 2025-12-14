'use client'

import { useState, useEffect } from 'react'
import { Usuario } from '@/lib/supabase'
import { getActivityLog } from '@/lib/permissions'
import { AuditLog } from '@/lib/audit-messages'
import { ActivityLogItem } from './activity-log-item'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface ActivityLogDialogProps {
  user: Usuario
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ActivityLogDialog({ user, open, onOpenChange }: ActivityLogDialogProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 20

  useEffect(() => {
    if (open) {
      loadLogs()
    }
  }, [open, page])

  const loadLogs = async () => {
    setLoading(true)
    try {
      // Filtrar últimos 30 días
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - 30)

      const { data, count } = await getActivityLog(
        user.id,
        pageSize,
        page * pageSize,
        startDate,
        endDate
      )
      
      setLogs(data)
      setTotalCount(count)
    } catch (error) {
      console.error('Error cargando activity log:', error)
      setLogs([])
      setTotalCount(0)
    } finally {
      setLoading(false)
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)
  const hasNextPage = page < totalPages - 1
  const hasPrevPage = page > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Historial de Actividad - {user.nombre}</DialogTitle>
          <DialogDescription>
            Últimas acciones realizadas en el sistema (últimos 30 días)
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 flex-1">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center flex-1">
            <p className="text-muted-foreground">
              No hay actividad registrada en los últimos 30 días
            </p>
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 px-6 overflow-y-auto">
              <div className="space-y-1 pb-4">
                {logs.map((log) => (
                  <ActivityLogItem key={log.id} log={log} />
                ))}
              </div>
            </ScrollArea>

            {/* Paginación */}
            {totalCount > pageSize && (
              <div className="flex items-center justify-between px-6 py-4 border-t bg-background">
                <div className="text-sm text-muted-foreground">
                  Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} de {totalCount}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p - 1)}
                    disabled={!hasPrevPage}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasNextPage}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

