'use client'

import { useToast } from '@/hooks/use-toast'
import { X } from 'lucide-react'
import { Button } from './button'
import { Card } from './card'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Card
          key={toast.id}
          className={`p-4 shadow-lg border-2 animate-in slide-in-from-top ${
            toast.variant === 'destructive'
              ? 'border-destructive bg-destructive/10'
              : 'border-border'
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              {toast.title && (
                <h5 className="font-semibold text-sm mb-1">{toast.title}</h5>
              )}
              {toast.description && (
                <p className="text-sm text-muted-foreground">{toast.description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

