import { useMemo } from 'react'
import Seat from './Seat'
import type { AttendanceRecord } from '../../types'
import { SEAT_LAYOUTS } from '../../config/seatLayouts'
import { getStudentBySeatId } from '../../config/mockStudents'
import type { AbsenceEntry } from '../../services/absenceService'

interface SeatMapProps {
  zoneId: string
  attendanceRecords: Map<string, AttendanceRecord>
  studentNotes?: Record<string, string>
  dateKey?: string
  preAbsenceEntries?: AbsenceEntry[]
  onSeatClick: (seatId: string) => void
  onSeatLongPress?: (seatId: string) => void
}

export default function SeatMap({
  zoneId,
  attendanceRecords,
  studentNotes = {},
  dateKey,
  preAbsenceEntries = [],
  onSeatClick,
  onSeatLongPress,
}: SeatMapProps) {
  const currentDate = dateKey || new Date().toISOString().split('T')[0]

  const checkPreAbsence = (studentId: string): boolean => {
    return preAbsenceEntries.some(entry =>
      entry.studentId === studentId &&
      currentDate >= entry.startDate &&
      currentDate <= entry.endDate
    )
  }
  const layout = useMemo(() => {
    return SEAT_LAYOUTS[zoneId] || []
  }, [zoneId])

  if (layout.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        좌석 배치 정보를 불러오는 중...
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 overflow-x-auto">
      <div className="inline-block">
        {layout.map((row, rowIndex) => {
          if (row[0] === 'br') {
            return <div key={`br-${rowIndex}`} className="h-6" />
          }

          return (
            <div key={rowIndex} className="seat-row">
              {row.map((cell, cellIndex) => {
                if (cell === 'sp') {
                  return <div key={`sp-${cellIndex}`} className="seat-spacer" />
                }

                if (cell === 'empty') {
                  return <div key={`empty-${cellIndex}`} className="seat-empty" />
                }

                const seatId = cell as string
                const student = getStudentBySeatId(seatId)
                const isAssigned = student !== null

                const record = attendanceRecords.get(seatId)
                const hasNote = !!studentNotes[seatId]
                const hasPreAbsence = student ? checkPreAbsence(student.studentId) : false

                return (
                  <Seat
                    key={seatId}
                    seatId={seatId}
                    studentName={student?.name}
                    studentId={student?.studentId}
                    isAssigned={isAssigned}
                    status={record?.status || 'unchecked'}
                    hasPreAbsence={hasPreAbsence}
                    hasNote={hasNote}
                    onClick={() => onSeatClick(seatId)}
                    onLongPress={isAssigned ? () => onSeatLongPress?.(seatId) : undefined}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
