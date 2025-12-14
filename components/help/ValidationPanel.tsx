'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { HELP_TOKENS } from '@/lib/help/constants'

interface ValidationItem {
  id: string
  label: string
  valid: boolean
  message?: string
}

interface ValidationPanelProps {
  items: ValidationItem[]
  defaultOpen?: boolean
  position?: 'bottom-right' | 'bottom-left'
  className?: string
}

export function ValidationPanel({
  items,
  defaultOpen = false,
  position = 'bottom-right',
  className = '',
}: ValidationPanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Persistir estado collapsed en localStorage
  useEffect(() => {
    const saved = localStorage.getItem('validation-panel-collapsed')
    if (saved !== null) {
      setIsCollapsed(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('validation-panel-collapsed', JSON.stringify(isCollapsed))
  }, [isCollapsed])

  const validCount = items.filter(item => item.valid).length
  const totalCount = items.length
  const allValid = validCount === totalCount

  const positionClasses = position === 'bottom-right' 
    ? 'bottom-4 right-4' 
    : 'bottom-4 left-4'

  if (items.length === 0) return null

  return (
    <Card 
      className={`fixed ${positionClasses} w-80 shadow-lg z-[${HELP_TOKENS.zIndex.panel}] transition-all duration-300 ${
        isCollapsed ? 'translate-y-2 opacity-90' : ''
      } ${className}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${allValid ? 'bg-green-500' : 'bg-yellow-500'}`} />
            Validaciones
            <span className="text-xs text-muted-foreground">
              ({validCount}/{totalCount})
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="h-6 w-6 p-0"
              aria-label={isOpen ? 'Cerrar panel' : 'Abrir panel'}
            >
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-6 w-6 p-0"
              aria-label={isCollapsed ? 'Expandir panel' : 'Colapsar panel'}
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isOpen && !isCollapsed && (
        <CardContent className="pt-0">
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item.id} className="flex items-start gap-2 text-sm">
                <div className="flex-shrink-0 mt-0.5">
                  {item.valid ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <X className="h-4 w-4 text-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`font-medium ${item.valid ? 'text-green-700' : 'text-red-700'}`}>
                    {item.label}
                  </span>
                  {item.message && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {item.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  )
}


















