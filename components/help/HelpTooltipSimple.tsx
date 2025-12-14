'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HELP_TOKENS } from '@/lib/help/constants'

interface HelpTooltipSimpleProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  children: React.ReactElement
}

export function HelpTooltipSimple({
  content,
  side = 'top',
  delayDuration = HELP_TOKENS.delays.open,
  children,
}: HelpTooltipSimpleProps) {
  console.log('🔍 HelpTooltipSimple render')
  
  const [isOpen, setIsOpen] = useState(false)

  const handleOpenChange = useCallback((open: boolean) => {
    console.log('🔄 HelpTooltipSimple handleOpenChange:', open)
    setIsOpen(open)
  }, [])

  console.log('🎯 HelpTooltipSimple rendering with children')
  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        {children}
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


















