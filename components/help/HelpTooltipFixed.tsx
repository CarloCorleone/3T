'use client'

import React, { useState, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HELP_TOKENS } from '@/lib/help/constants'

interface HelpTooltipFixedProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  children?: React.ReactElement
}

export function HelpTooltipFixed({
  content,
  side = 'top',
  delayDuration = HELP_TOKENS.delays.open,
  children,
}: HelpTooltipFixedProps) {
  console.log('🔍 HelpTooltipFixed render - children:', !!children)
  
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = useCallback((open: boolean) => {
    console.log('🔄 HelpTooltipFixed handleOpenChange:', open)
    setIsOpen(open)
  }, [])

  // Si hay children, usar un div wrapper para evitar botones anidados
  if (children) {
    console.log('🎯 HelpTooltipFixed rendering with children wrapper')
    return (
      <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          <div className="inline-block">
            {children}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side={side}
          className={`max-w-[${HELP_TOKENS.maxWidths.tooltip}px] z-[${HELP_TOKENS.zIndex.tooltip}]`}
          role="tooltip"
        >
          <div className="text-sm">
            {content}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  // Si no hay children, crear botón por defecto
  console.log('🎯 HelpTooltipFixed rendering default button')
  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
      <TooltipTrigger
        type="button"
        className="inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Mostrar ayuda"
      >
        <HelpCircle className="w-4 h-4" />
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className={`max-w-[${HELP_TOKENS.maxWidths.tooltip}px] z-[${HELP_TOKENS.zIndex.tooltip}]`}
        role="tooltip"
      >
        <div className="text-sm">
          {content}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}


















