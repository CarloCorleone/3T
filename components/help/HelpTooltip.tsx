'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { HelpCircle } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { HELP_TOKENS } from '@/lib/help/constants'

interface HelpTooltipProps {
  content: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  mobileTrigger?: 'tap' | 'longpress'
  delayDuration?: number
  asChild?: boolean
  children?: React.ReactNode
  className?: string
}

export function HelpTooltip({
  content,
  side = 'top',
  mobileTrigger = 'tap',
  delayDuration = HELP_TOKENS.delays.open,
  asChild = true,
  children,
  className = '',
}: HelpTooltipProps) {
  console.log('🔍 HelpTooltip render - asChild:', asChild, 'children:', !!children)
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detectar si es dispositivo móvil
  useEffect(() => {
    console.log('📱 HelpTooltip useEffect mobile detection')
    const checkMobile = () => {
      const isMobileDevice = window.matchMedia('(pointer: coarse)').matches
      console.log('📱 Mobile detection result:', isMobileDevice)
      setIsMobile(isMobileDevice)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Auto-close en mobile después de delay
  useEffect(() => {
    console.log('⏰ HelpTooltip auto-close useEffect - isOpen:', isOpen, 'isMobile:', isMobile)
    if (isOpen && isMobile) {
      console.log('⏰ Setting auto-close timer')
      const timer = setTimeout(() => {
        console.log('⏰ Auto-close timer fired')
        setIsOpen(false)
      }, HELP_TOKENS.mobile.autoCloseDelay)
      
      return () => {
        console.log('⏰ Clearing auto-close timer')
        clearTimeout(timer)
      }
    }
  }, [isOpen, isMobile])

  const handleOpenChange = useCallback((open: boolean) => {
    console.log('🔄 HelpTooltip handleOpenChange:', open)
    setIsOpen(open)
  }, [])

  const handleMobileClick = useCallback((e: React.MouseEvent) => {
    console.log('📱 HelpTooltip handleMobileClick - isMobile:', isMobile, 'mobileTrigger:', mobileTrigger)
    if (isMobile && mobileTrigger === 'tap') {
      e.preventDefault()
      e.stopPropagation()
      setIsOpen(prev => !prev)
    }
  }, [isMobile, mobileTrigger])

  // Si asChild es true, envolver children directamente
  if (asChild && children) {
    console.log('🎯 HelpTooltip rendering asChild branch')
    return (
      <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
        <TooltipTrigger asChild>
          {React.cloneElement(children as React.ReactElement, {
            onClick: handleMobileClick,
          } as any)}
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

  // Si asChild es false, crear botón por defecto
  console.log('🎯 HelpTooltip rendering default button branch')
  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange} delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={`inline-flex items-center justify-center w-5 h-5 text-muted-foreground hover:text-foreground transition-colors ${className}`}
          aria-label="Mostrar ayuda"
          onClick={handleMobileClick}
        >
          <HelpCircle className="w-4 h-4" />
        </button>
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
