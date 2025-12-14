'use client'

import React, { useState, useEffect } from 'react'
import { Check, X, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ValidationItem } from '@/lib/help/types'
import { HELP_TOKENS } from '@/lib/help/constants'

interface SimpleValidationPanelProps {
  items: ValidationItem[]
  defaultOpen?: boolean
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
}

const STORAGE_KEY = 'validation-panel-collapsed'

export function SimpleValidationPanel({
  items,
  defaultOpen = false,
  position = 'bottom-right',
}: SimpleValidationPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const storedState = localStorage.getItem(STORAGE_KEY)
      return storedState ? JSON.parse(storedState) : !defaultOpen
    }
    return !defaultOpen
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(isCollapsed))
    }
  }, [isCollapsed])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => !prev)
  }

  const positionClasses = {
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
  }

  const hasInvalidItems = items.some((item) => !item.valid)

  return (
    <aside
      className={cn(
        'fixed w-80 rounded-2xl border bg-background shadow-lg transition-all duration-300',
        positionClasses[position],
        isCollapsed ? 'h-12' : 'h-auto max-h-[80vh] overflow-y-auto'
      )}
      style={{ zIndex: HELP_TOKENS.zIndex.panel }}
    >
      <div
        className="flex cursor-pointer items-center justify-between px-4 py-3 sticky top-0 bg-background rounded-t-2xl"
        onClick={toggleCollapse}
      >
        <div className="flex items-center gap-2">
          {hasInvalidItems ? (
            <X className="h-5 w-5 text-red-500" />
          ) : (
            <Check className="h-5 w-5 text-green-500" />
          )}
          <span className="font-semibold">Validaciones</span>
          {!isCollapsed && (
            <span className="text-xs text-muted-foreground">
              ({items.filter(i => i.valid).length}/{items.length})
            </span>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7">
          {isCollapsed ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      </div>

      {!isCollapsed && (
        <ul className="space-y-2 px-4 pb-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              {item.valid ? (
                <Check className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
              ) : (
                <X className="h-4 w-4 shrink-0 text-red-500 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "font-medium",
                  item.valid ? "text-foreground" : "text-foreground/80"
                )}>
                  {item.label}
                </span>
                {item.message && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {item.message}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}



















