'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { SimpleTooltip } from './SimpleTooltip'

interface DisabledButtonHelperProps {
  disabled: boolean
  reason?: string
  requirements?: string[]
  children: React.ReactElement
}

export function DisabledButtonHelper({
  disabled,
  reason,
  requirements,
  children,
}: DisabledButtonHelperProps) {
  if (!disabled) return children

  const tooltipContent = (
    <div className="flex items-start gap-2 max-w-xs">
      <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
      <div>
        <p className="font-medium text-sm">
          {reason ?? 'Completa los requisitos para habilitar'}
        </p>
        {requirements && requirements.length > 0 && (
          <ul className="list-disc ml-4 mt-1.5 text-xs space-y-0.5">
            {requirements.map((req, idx) => (
              <li key={idx}>{req}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )

  return (
    <SimpleTooltip content={tooltipContent} side="top">
      {React.cloneElement(children, {
        'aria-disabled': true,
        'aria-label': reason || (children.props as any)['aria-label'],
      } as any)}
    </SimpleTooltip>
  )
}

