import { useRef, useState, useEffect, useCallback, type ReactNode } from 'react'

interface PinchZoomContainerProps {
  children: ReactNode
  minScale?: number
  maxScale?: number
}

export default function PinchZoomContainer({
  children,
  minScale = 1,
  maxScale = 2,
}: PinchZoomContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  // Use refs to track current values without causing re-renders
  const scaleRef = useRef(scale)
  const positionRef = useRef(position)

  // Keep refs in sync with state
  useEffect(() => {
    scaleRef.current = scale
  }, [scale])

  useEffect(() => {
    positionRef.current = position
  }, [position])

  // Touch state refs
  const touchState = useRef({
    initialDistance: 0,
    initialScale: 1,
    initialPosition: { x: 0, y: 0 },
    lastTouchCenter: { x: 0, y: 0 },
    isPinching: false,
    isDragging: false,
    wasPinching: false, // Track if we just finished pinching
  })

  // Calculate distance between two touch points
  const getDistance = (touch1: Touch, touch2: Touch) => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Calculate center point between two touches
  const getTouchCenter = (touch1: Touch, touch2: Touch) => ({
    x: (touch1.clientX + touch2.clientX) / 2,
    y: (touch1.clientY + touch2.clientY) / 2,
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        e.stopPropagation()
        touchState.current.isPinching = true
        touchState.current.isDragging = false
        touchState.current.initialDistance = getDistance(e.touches[0], e.touches[1])
        touchState.current.initialScale = scaleRef.current
        touchState.current.initialPosition = { ...positionRef.current }
        touchState.current.lastTouchCenter = getTouchCenter(e.touches[0], e.touches[1])
      } else if (e.touches.length === 1 && scaleRef.current > 1) {
        // Allow panning when zoomed in
        touchState.current.isDragging = true
        touchState.current.lastTouchCenter = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.current.isPinching) {
        e.preventDefault()
        e.stopPropagation()

        const currentDistance = getDistance(e.touches[0], e.touches[1])
        const currentCenter = getTouchCenter(e.touches[0], e.touches[1])

        // Calculate new scale
        const scaleChange = currentDistance / touchState.current.initialDistance
        let newScale = touchState.current.initialScale * scaleChange
        newScale = Math.min(Math.max(newScale, minScale), maxScale)

        // Calculate position adjustment for zoom center
        const dx = currentCenter.x - touchState.current.lastTouchCenter.x
        const dy = currentCenter.y - touchState.current.lastTouchCenter.y

        const newPosition = {
          x: positionRef.current.x + dx,
          y: positionRef.current.y + dy,
        }

        setScale(newScale)
        setPosition(newPosition)
        touchState.current.lastTouchCenter = currentCenter
      } else if (e.touches.length === 1 && touchState.current.isDragging && scaleRef.current > 1) {
        // Pan while zoomed
        e.preventDefault()

        const dx = e.touches[0].clientX - touchState.current.lastTouchCenter.x
        const dy = e.touches[0].clientY - touchState.current.lastTouchCenter.y

        const newPosition = {
          x: positionRef.current.x + dx,
          y: positionRef.current.y + dy,
        }

        setPosition(newPosition)
        touchState.current.lastTouchCenter = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
        }
      }
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2 && touchState.current.isPinching) {
        touchState.current.isPinching = false
        touchState.current.wasPinching = true
        // Reset wasPinching after a delay to allow double-tap detection to work again
        setTimeout(() => {
          touchState.current.wasPinching = false
        }, 400)
      }
      if (e.touches.length === 0) {
        touchState.current.isDragging = false

        // Scale이 minScale에 매우 가까우면 1로 리셋 (부드러운 동작)
        if (scaleRef.current <= 1.05) {
          setScale(1)
          setPosition({ x: 0, y: 0 })
        }
      }
    }

    // Add event listeners with passive: false to allow preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd)
    container.addEventListener('touchcancel', handleTouchEnd)

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [minScale, maxScale]) // Only depend on props, not state

  // Double tap to reset
  const lastTap = useRef(0)
  const handleDoubleTap = useCallback(() => {
    // Skip double-tap detection if we just finished pinching
    if (touchState.current.wasPinching) {
      return
    }

    const now = Date.now()
    if (now - lastTap.current < 300) {
      // Double tap detected - toggle zoom
      if (scaleRef.current > 1) {
        setScale(1)
        setPosition({ x: 0, y: 0 })
      } else {
        setScale(2)
      }
    }
    lastTap.current = now
  }, [])

  return (
    <div
      ref={containerRef}
      className="w-full h-full overflow-hidden touch-none"
      onTouchEnd={handleDoubleTap}
    >
      <div
        className="w-full h-full origin-center"
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
      {/* Zoom indicator */}
      {scale !== 1 && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full pointer-events-none">
          {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  )
}
