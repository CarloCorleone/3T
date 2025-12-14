'use client'

import React, { useState, useEffect, useRef } from 'react'
import { HelpCircle, X } from 'lucide-react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { HELP_TOKENS } from '@/lib/help/constants'

interface HelpPopoverProps {
  title: string
  description?: React.ReactNode
  steps?: string[]
  media?: React.ReactNode
  trigger?: React.ReactNode
  maxWidth?: number
  lazyLoadMedia?: boolean
  className?: string
}

export function HelpPopover({
  title,
  description,
  steps = [],
  media,
  trigger,
  maxWidth = HELP_TOKENS.maxWidths.popover,
  lazyLoadMedia = true,
  className = '',
}: HelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const mediaRef = useRef<HTMLDivElement>(null)

  // Lazy load media cuando popover se abre
  useEffect(() => {
    if (isOpen && lazyLoadMedia && media && !mediaLoaded) {
      setMediaLoaded(true)
    }
  }, [isOpen, lazyLoadMedia, media, mediaLoaded])

  // Focus trap y escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  const defaultTrigger = (
    <Button
      variant="ghost"
      size="sm"
      className={`inline-flex items-center gap-2 text-muted-foreground hover:text-foreground ${className}`}
      aria-label="Mostrar ayuda detallada"
    >
      <HelpCircle className="w-4 h-4" />
      <span className="hidden sm:inline">Ayuda</span>
    </Button>
  )

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger || defaultTrigger}
      </PopoverTrigger>
      <PopoverContent
        className={`w-[${maxWidth}px] p-0 z-[${HELP_TOKENS.zIndex.popover}]`}
        side="bottom"
        align="start"
        sideOffset={8}
      >
        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-base text-foreground">{title}</h3>
              {description && (
                <p className="text-sm text-muted-foreground mt-1">{description}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 hover:bg-muted"
              aria-label="Cerrar ayuda"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Steps */}
          {steps.length > 0 && (
            <div className="space-y-2 mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </span>
                  <p className="text-sm text-foreground leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          )}

          {/* Media (lazy loaded) */}
          {media && (
            <div ref={mediaRef} className="mb-4">
              {lazyLoadMedia && !mediaLoaded ? (
                <div className="w-full h-32 bg-muted animate-pulse rounded-lg flex items-center justify-center">
                  <span className="text-sm text-muted-foreground">Cargando...</span>
                </div>
              ) : (
                media
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
