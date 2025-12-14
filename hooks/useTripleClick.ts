'use client'

import { useRef, useCallback } from 'react'

export function useTripleClick(onTripleClick: () => void, delay = 500) {
  const clickCount = useRef(0)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClick = useCallback(() => {
    clickCount.current += 1

    if (clickCount.current === 3) {
      onTripleClick()
      clickCount.current = 0
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      return
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    timeoutRef.current = setTimeout(() => {
      clickCount.current = 0
    }, delay)
  }, [onTripleClick, delay])

  return handleClick
}

