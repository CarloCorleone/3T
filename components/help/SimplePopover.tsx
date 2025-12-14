'use client'

import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { HELP_TOKENS } from '@/lib/help/constants'
// import { logHelpEvent } from '@/lib/help/telemetry'
import { HelpKey } from '@/lib/help/types'

interface SimplePopoverProps {
  title: string
  description?: React.ReactNode
  steps?: string[]
  media?: React.ReactNode
  trigger?: React.ReactNode
  maxWidth?: string
  module?: HelpKey | 'general'
  helpKey?: string
  place?: string
}

export function SimplePopover({
  title,
  description,
  steps,
  media,
  trigger,
  maxWidth = 'max-w-md',
  module = 'general',
  helpKey = 'unknown',
  place = 'unknown',
}: SimplePopoverProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [mediaLoaded, setMediaLoaded] = useState(false)
  const triggerRef = useRef<HTMLElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current || !popoverRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const popoverRect = popoverRef.current.getBoundingClientRect()
    const offset = 8

    let top = triggerRect.bottom + offset
    let left = triggerRect.right - popoverRect.width

    // Keep popover within viewport
    const padding = 16
    if (left < padding) left = padding
    if (left + popoverRect.width > window.innerWidth - padding) {
      left = window.innerWidth - popoverRect.width - padding
    }
    if (top + popoverRect.height > window.innerHeight - padding) {
      top = triggerRect.top - popoverRect.height - offset
    }
    if (top < padding) top = padding

    setPosition({ top, left })
  }

  const handleOpen = () => {
    setIsOpen(true)
    // logHelpEvent({ type: 'help.open', module, key: helpKey, place })
    console.log('📊 Help opened:', { module, key: helpKey, place })
    if (media) {
      setMediaLoaded(true)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    setMediaLoaded(false)
  }

  useEffect(() => {
    if (isOpen) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      // Close on Escape
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') handleClose()
      }
      window.addEventListener('keydown', handleEscape)

      // Close on click outside
      const handleClickOutside = (e: MouseEvent) => {
        if (
          popoverRef.current &&
          triggerRef.current &&
          !popoverRef.current.contains(e.target as Node) &&
          !triggerRef.current.contains(e.target as Node)
        ) {
          handleClose()
        }
      }
      window.addEventListener('mousedown', handleClickOutside)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('keydown', handleEscape)
        window.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
      <Info className="h-4 w-4" />
    </Button>
  )

  const triggerElement = trigger || defaultTrigger

  const clonedTrigger = React.isValidElement(triggerElement)
    ? React.cloneElement(triggerElement as React.ReactElement, {
        ref: triggerRef,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation()
          if (isOpen) {
            handleClose()
          } else {
            handleOpen()
          }
          ;(triggerElement as any).props?.onClick?.(e)
        },
      } as any)
    : triggerElement

  return (
    <>
      {clonedTrigger}
      {mounted && isOpen && createPortal(
        <div
          ref={popoverRef}
          className={cn(
            'fixed z-50 rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg',
            'animate-in fade-in-0 zoom-in-95',
            maxWidth
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: `${HELP_TOKENS.maxWidths.popover}px`,
          }}
          role="dialog"
          aria-labelledby="popover-title"
          aria-modal="true"
        >
          <div className="flex items-center justify-between mb-2">
            <h4 id="popover-title" className="font-semibold text-base">
              {title}
            </h4>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-7 w-7"
              aria-label="Cerrar ayuda"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mb-3">{description}</p>
          )}
          {steps && steps.length > 0 && (
            <ul className="space-y-2 text-sm text-muted-foreground mb-3">
              {steps.map((step, index) => (
                <li
                  key={index}
                  className="flex gap-2"
                  dangerouslySetInnerHTML={{ __html: step }}
                />
              ))}
            </ul>
          )}
          {media && mediaLoaded && <div className="mt-3">{media}</div>}
        </div>,
        document.body
      )}
    </>
  )
}

