import { memo, useRef, useCallback } from 'react'

interface SeatProps {
  seatId: string
  studentName?: string
  studentId?: string
  isAssigned: boolean
  status: 'present' | 'absent' | 'unchecked'
  hasPreAbsence?: boolean
  hasNote?: boolean
  onClick: () => void
  onLongPress?: () => void
}

const statusBgClasses: Record<string, string> = {
  present: 'bg-green-100 text-green-800',
  absent: 'bg-red-100 text-red-800',
  unchecked: 'bg-yellow-50 text-gray-600',
  unassigned: 'bg-gray-100 text-gray-400',
}

const statusBorderClasses: Record<string, string> = {
  present: 'border-green-500',
  absent: 'border-red-500',
  unchecked: 'border-gray-300',
  unassigned: 'border-gray-300',
}

const statusLabels: Record<string, string> = {
  present: '출석',
  absent: '결석',
  unchecked: '미체크',
}

function Seat({ seatId, studentName, studentId, isAssigned, status, hasPreAbsence, hasNote, onClick, onLongPress }: SeatProps) {
  const longPressTimer = useRef<number | null>(null)
  const isLongPress = useRef(false)

  const handleTouchStart = useCallback(() => {
    isLongPress.current = false
    if (!onLongPress) return
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true
      onLongPress()
    }, 500)
  }, [onLongPress])

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }, [])

  const handleClick = useCallback(() => {
    if (!isLongPress.current) {
      onClick()
    }
    isLongPress.current = false
  }, [onClick])

  if (!isAssigned) {
    return (
      <div
        className={`
          seat mx-0.5 relative
          ${statusBgClasses.unassigned}
          ${statusBorderClasses.unassigned}
          border-2 rounded-lg
          cursor-default
          flex flex-col items-center justify-center
        `}
      >
        <span className="text-[0.5rem] font-medium text-gray-400">{seatId}</span>
        <span className="text-[0.5rem] font-medium text-gray-400">미배정</span>
      </div>
    )
  }

  const borderClass = hasPreAbsence
    ? 'border-purple-500 border-[3px]'
    : `${statusBorderClasses[status]} border-2`

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleTouchStart}
      onMouseUp={handleTouchEnd}
      onMouseLeave={handleTouchEnd}
      className={`
        seat mx-0.5 relative
        ${statusBgClasses[status]}
        ${borderClass}
        rounded-lg
        hover:scale-105 active:scale-95
        transition-transform duration-100
        flex flex-col items-center justify-center
      `}
    >
      <span className="text-[0.45rem] leading-tight text-gray-500">
        {seatId}
      </span>

      <span className="font-bold text-[0.5rem] leading-tight">
        {studentId}
      </span>

      <span className="text-[0.5rem] leading-tight truncate max-w-full px-0.5 font-medium">
        {studentName || ''}
      </span>

      <span className={`text-[0.45rem] leading-tight font-semibold
        ${status === 'present' ? 'text-green-600' : ''}
        ${status === 'absent' ? 'text-red-600' : ''}
        ${status === 'unchecked' ? 'text-gray-400' : ''}
      `}>
        {statusLabels[status]}
      </span>

      {hasNote && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center shadow-sm border border-yellow-500">
          <span className="text-white text-[0.5rem] font-bold">!</span>
        </div>
      )}
    </button>
  )
}

export default memo(Seat)
