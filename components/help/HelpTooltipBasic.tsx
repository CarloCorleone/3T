'use client'

import React, { useState, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HELP_TOKENS } from '@/lib/help/constants'

interface HelpTooltipBasicProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
}

export function HelpTooltipBasic({
  content,
  side = 'top',
  delayDuration = HELP_TOKENS.delays.open,
}: HelpTooltipBasicProps) {
  console.log('🔍 HelpTooltipBasic render')
  
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = useCallback((open: boolean) => {
    console.log('🔄 HelpTooltipBasic handleOpenChange:', open)
    setIsOpen(open)
  }, [])

  console.log('🎯 HelpTooltipBasic rendering basic button')
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
