'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'
import { HELP_TOKENS } from '@/lib/help/constants'

interface SimpleTooltipProps {
  content: React.ReactNode
  children: React.ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  delayDuration?: number
  className?: string
}

export function SimpleTooltip({
  content,
  children,
  side = 'top',
  delayDuration = HELP_TOKENS.delays.open,
  className = '',
}: SimpleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const [mounted, setMounted] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setMounted(true)
    
    // Detectar si es dispositivo móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => {
      setMounted(false)
      window.removeEventListener('resize', checkMobile)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updatePosition = () => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const offset = 8 // spacing from trigger

    let top = 0
    let left = 0

    switch (side) {
      case 'top':
        top = triggerRect.top - tooltipRect.height - offset
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'bottom':
        top = triggerRect.bottom + offset
        left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2
        break
      case 'left':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.left - tooltipRect.width - offset
        break
      case 'right':
        top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2
        left = triggerRect.right + offset
        break
    }

    // Keep tooltip within viewport
    const padding = 8
    if (left < padding) left = padding
    if (left + tooltipRect.width > window.innerWidth - padding) {
      left = window.innerWidth - tooltipRect.width - padding
    }
    if (top < padding) top = padding
    if (top + tooltipRect.height > window.innerHeight - padding) {
      top = window.innerHeight - tooltipRect.height - padding
    }

    setPosition({ top, left })
  }

  const handleMouseEnter = useCallback(() => {
    // No mostrar tooltips en dispositivos móviles
    if (isMobile) return
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delayDuration)
  }, [delayDuration, isMobile])

  const handleMouseLeave = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }, [])

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const clonedChild = React.cloneElement(children, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      handleMouseEnter()
      const originalHandler = (children.props as any).onMouseEnter
      if (originalHandler) originalHandler(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      handleMouseLeave()
      const originalHandler = (children.props as any).onMouseLeave
      if (originalHandler) originalHandler(e)
    },
  } as any)

  return (
    <>
      {clonedChild}
      {mounted && isVisible && createPortal(
        <div
          ref={tooltipRef}
          className={cn(
            'fixed rounded-lg px-4 py-2 text-sm shadow-xl',
            'bg-gray-900 dark:bg-gray-800 text-white',
            'border border-gray-700',
            'animate-in fade-in-0 zoom-in-95 duration-150',
            'pointer-events-none select-none',
            className
          )}
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            maxWidth: `${HELP_TOKENS.maxWidths.tooltip}px`,
            zIndex: 9999,
          }}
          role="tooltip"
        >
          {content}
        </div>,
        document.body
      )}
    </>
  )
}

