'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HELP_TOKENS } from '@/lib/help/constants'

interface DisabledButtonTooltipProps {
  disabled: boolean
  reason?: string
  requirements?: string[]
  children: React.ReactElement
  ariaLabel?: string
}

export function DisabledButtonTooltip({
  disabled,
  reason,
  requirements = [],
  children,
  ariaLabel,
}: DisabledButtonTooltipProps) {
  // Si no está deshabilitado, renderizar children directamente
  if (!disabled) {
    return children
  }

  const tooltipId = `disabled-tip-${reason?.replace(/\s+/g, '-').toLowerCase() || 'btn'}`

  return (
    <Tooltip delayDuration={HELP_TOKENS.delays.open}>
      <TooltipTrigger asChild aria-describedby={tooltipId}>
        {React.cloneElement(children, {
          ...(children.props as any),
          'aria-disabled': true,
          'aria-label': ariaLabel || (children.props as any)['aria-label'],
        } as any)}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        id={tooltipId}
        className={`max-w-[${HELP_TOKENS.maxWidths.tooltip}px] z-[${HELP_TOKENS.zIndex.tooltip}]`}
        role="tooltip"
      >
        <div className="flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
          <div className="space-y-1">
            <p className="font-medium text-sm">
              {reason || 'Completa los requisitos para habilitar'}
            </p>
            {requirements.length > 0 && (
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                {requirements.map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
