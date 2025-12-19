import { useParams, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import Header from '../components/layout/Header'
import SeatMap from '../components/seatmap/SeatMap'
import AttendanceSummary from '../components/attendance/AttendanceSummary'
import type { AttendanceRecord } from '../types'

export default function AttendancePage() {
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Get today's date in Korean format
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  const handleSeatClick = (seatId: string) => {
    setAttendanceRecords((prev) => {
      const newRecords = new Map(prev)
      const current = newRecords.get(seatId)

      // Toggle between present and absent
      const newStatus = current?.status === 'present' ? 'absent' : 'present'
      newRecords.set(seatId, {
        studentId: seatId, // Using seatId as identifier for now
        status: newStatus,
        isModified: true,
      })

      return newRecords
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    setIsSaving(true)
    // TODO: Implement save to Supabase
    await new Promise(resolve => setTimeout(resolve, 500))
    setIsSaving(false)
    setHasChanges(false)
    alert('출결이 저장되었습니다.')
  }

  const handleMarkAllPresent = () => {
    // TODO: Mark all seats as present from SEAT_LAYOUTS
    alert('전체 출석 처리')
  }

  // Calculate summary
  const summary = {
    present: 0,
    absent: 0,
    late: 0,
    other: 0,
    unchecked: 0,
    total: 0,
  }

  attendanceRecords.forEach((record) => {
    summary[record.status]++
    summary.total++
  })

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title={`${zoneId}`}
        showBack
        onBack={() => navigate('/')}
      />

      {/* Date display */}
      <div className="bg-white border-b px-4 py-3">
        <div className="text-center">
          <span className="text-lg font-semibold text-gray-700">{today}</span>
          <span className="ml-2 text-sm text-gray-500">출결 체크</span>
        </div>
      </div>

      {/* Summary bar */}
      <AttendanceSummary {...summary} />

      {/* Seat map */}
      <div className="flex-1 overflow-auto p-4">
        <SeatMap
          zoneId={zoneId || ''}
          attendanceRecords={attendanceRecords}
          onSeatClick={handleSeatClick}
        />
      </div>

      {/* Action bar */}
      <div className="bg-white border-t p-4 flex gap-3">
        <button
          onClick={handleMarkAllPresent}
          className="flex-1 py-3 bg-green-100 text-green-700 font-semibold rounded-xl
                     hover:bg-green-200 transition-colors"
        >
          전체 출석
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
          className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl
                     hover:bg-primary-600 transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  )
}
