import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useMemo, useRef } from 'react'
import Header from '../components/layout/Header'
import SeatMap from '../components/seatmap/SeatMap'
import PinchZoomContainer from '../components/PinchZoomContainer'
import type { AttendanceRecord, CurrentStaff } from '../types'
import { SEAT_LAYOUTS } from '../config/seatLayouts'
import { getStudentBySeatId } from '../config/mockStudents'
import { usePreAbsences } from '../hooks/usePreAbsences'
import { getTodayKST } from '../utils/date'
import { zoneAttendanceService } from '../services/zoneAttendanceService'

interface StudentModalData {
  studentName: string
  studentId: string
  seatId: string
  preAbsenceInfo?: {
    reason: string
    type: '사전결석' | '외박'
    startDate: string
    endDate: string
  } | null
  note: string
}

function getStudentNote(seatId: string, dateKey: string): string {
  const notes = localStorage.getItem(`student_notes_${dateKey}`)
  if (notes) {
    try {
      const parsed = JSON.parse(notes) as Record<string, string>
      return parsed[seatId] || ''
    } catch {
      return ''
    }
  }
  return ''
}

function saveStudentNote(seatId: string, dateKey: string, note: string) {
  const notesKey = `student_notes_${dateKey}`
  const existingNotes = localStorage.getItem(notesKey)
  let notes: Record<string, string> = {}
  if (existingNotes) {
    try {
      notes = JSON.parse(existingNotes)
    } catch {
      notes = {}
    }
  }
  if (note.trim()) {
    notes[seatId] = note.trim()
  } else {
    delete notes[seatId]
  }
  localStorage.setItem(notesKey, JSON.stringify(notes))
}

function getAllStudentNotes(dateKey: string): Record<string, string> {
  const notes = localStorage.getItem(`student_notes_${dateKey}`)
  if (notes) {
    try {
      return JSON.parse(notes) as Record<string, string>
    } catch {
      return {}
    }
  }
  return {}
}

export default function AttendancePage() {
  const { zoneId } = useParams<{ zoneId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as {
    fromAdmin?: boolean
    recordedBy?: string
    viewDate?: string
    viewData?: [string, AttendanceRecord][]
  } | null
  const fromAdmin = locationState?.fromAdmin
  const adminRecordedBy = locationState?.recordedBy
  const viewDate = locationState?.viewDate
  const viewData = locationState?.viewData
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, AttendanceRecord>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)
  const hasChangesRef = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [currentStaff, setCurrentStaff] = useState<CurrentStaff | null>(null)
  const [studentModal, setStudentModal] = useState<StudentModalData | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [alertModal, setAlertModal] = useState<{ title: string; message: string; onConfirm?: () => void } | null>(null)
  const [hasTempSave, setHasTempSave] = useState(false)
  const [studentNotes, setStudentNotes] = useState<Record<string, string>>({})
  const [preAbsenceProcessed, setPreAbsenceProcessed] = useState(false)
  const [supabaseRecordedBy, setSupabaseRecordedBy] = useState<string | null>(null)
  const [isLoadingSupabase, setIsLoadingSupabase] = useState(true)

  const { entries: preAbsenceEntries, getPreAbsenceInfo, isLoading: preAbsenceLoading } = usePreAbsences()

  const todayKey = getTodayKST()
  const dateKey = viewDate || todayKey

  const getTempSaveKey = () => `attendance_temp_${zoneId}_${todayKey}`
  const getSavedKey = () => `attendance_saved_${zoneId}_${todayKey}`

  const assignedSeats = useMemo(() => {
    const layout = SEAT_LAYOUTS[zoneId || '']
    if (!layout) return []

    const seats: string[] = []
    layout.forEach((row) => {
      if (row[0] === 'br') return
      row.forEach((cell) => {
        if (cell !== 'sp' && cell !== 'empty' && cell !== 'br') {
          const seatId = cell as string
          const student = getStudentBySeatId(seatId)
          if (student) {
            seats.push(seatId)
          }
        }
      })
    })
    return seats
  }, [zoneId])

  useEffect(() => {
    const staffData = sessionStorage.getItem('currentStaff')
    if (staffData) {
      const staff = JSON.parse(staffData) as CurrentStaff
      if (staff.date === todayKey) {
        setCurrentStaff(staff)
      }
    }
  }, [todayKey])

  useEffect(() => {
    setStudentNotes(getAllStudentNotes(dateKey))
  }, [dateKey])

  useEffect(() => {
    if (!zoneId) return

    if (fromAdmin && viewDate && viewData) {
      const loadAdminView = async () => {
        try {
          const restoredRecords = new Map(viewData)
          setAttendanceRecords(restoredRecords)
          setHasTempSave(false)
          setHasChanges(false)
          hasChangesRef.current = false
          setPreAbsenceProcessed(true)

          const supabaseData = await zoneAttendanceService.get(zoneId, viewDate)
          if (supabaseData?.notes) {
            setStudentNotes(supabaseData.notes)
          }
        } catch (e) {
          console.error('조회 데이터 복원 실패:', e)
        } finally {
          setIsLoadingSupabase(false)
        }
      }
      loadAdminView()
      return
    }

    const loadData = async () => {
      setIsLoadingSupabase(true)

      const tempData = localStorage.getItem(getTempSaveKey())
      if (tempData) {
        try {
          const parsed = JSON.parse(tempData) as [string, AttendanceRecord][]
          const restoredRecords = new Map(parsed)
          setAttendanceRecords(restoredRecords)
          setHasTempSave(true)
          setHasChanges(true)
          hasChangesRef.current = true
          setPreAbsenceProcessed(true)
          setIsLoadingSupabase(false)
          console.log('[AttendancePage] Restored from temp save')
          return
        } catch (e) {
          console.error('임시저장 데이터 복원 실패:', e)
        }
      }

      try {
        const supabaseData = await zoneAttendanceService.get(zoneId, todayKey)
        if (supabaseData) {
          console.log('[AttendancePage] Loaded from Supabase:', supabaseData.recorded_by)
          const records = new Map<string, AttendanceRecord>(supabaseData.data)
          setAttendanceRecords(records)
          setSupabaseRecordedBy(supabaseData.recorded_by || null)
          setHasTempSave(false)
          setHasChanges(false)
          hasChangesRef.current = false
          setPreAbsenceProcessed(true)

          if (supabaseData.notes) {
            setStudentNotes(supabaseData.notes)
          }

          localStorage.setItem(`attendance_saved_${zoneId}_${todayKey}`, JSON.stringify(Array.from(records.entries())))
          if (supabaseData.recorded_by) {
            localStorage.setItem(`attendance_recorder_${zoneId}_${todayKey}`, supabaseData.recorded_by)
          }
          if (supabaseData.updated_at) {
            localStorage.setItem(`attendance_saved_time_${zoneId}_${todayKey}`, supabaseData.updated_at)
          }

          setIsLoadingSupabase(false)
          return
        }
      } catch (err) {
        console.error('[AttendancePage] Supabase load error:', err)
      }

      const savedDataKey = `attendance_saved_${zoneId}_${todayKey}`
      const savedData = localStorage.getItem(savedDataKey)
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData) as [string, AttendanceRecord][]
          const restoredRecords = new Map(parsed)
          setAttendanceRecords(restoredRecords)
          const recorder = localStorage.getItem(`attendance_recorder_${zoneId}_${todayKey}`)
          setSupabaseRecordedBy(recorder)
          setHasTempSave(false)
          setHasChanges(false)
          hasChangesRef.current = false
          setPreAbsenceProcessed(true)
          setIsLoadingSupabase(false)
          return
        } catch (e) {
          console.error('저장된 데이터 복원 실패:', e)
        }
      }

      setPreAbsenceProcessed(false)
      setIsLoadingSupabase(false)
    }

    loadData()

    const unsubscribe = zoneAttendanceService.subscribeToDate(todayKey, (allZoneData) => {
      const myZoneData = allZoneData.find(d => d.zone_id === zoneId)
      if (myZoneData && !hasChangesRef.current) {
        console.log('[AttendancePage] Realtime update for zone:', zoneId)
        const records = new Map<string, AttendanceRecord>(myZoneData.data)
        setAttendanceRecords(records)
        setSupabaseRecordedBy(myZoneData.recorded_by || null)
        if (myZoneData.notes) {
          setStudentNotes(myZoneData.notes)
        }
      }
    })

    return () => {
      unsubscribe()
    }
  }, [zoneId, todayKey, fromAdmin, viewDate, viewData])

  useEffect(() => {
    if (preAbsenceProcessed || preAbsenceLoading || viewDate) return

    const preAbsenceRecords = new Map<string, AttendanceRecord>()
    assignedSeats.forEach((seatId) => {
      const student = getStudentBySeatId(seatId)
      if (!student) return

      const hasPreAbsence = preAbsenceEntries.some(entry =>
        entry.studentId === student.studentId &&
        todayKey >= entry.startDate &&
        todayKey <= entry.endDate
      )

      if (hasPreAbsence) {
        preAbsenceRecords.set(seatId, {
          studentId: seatId,
          status: 'absent',
          isModified: true,
          staffName: currentStaff?.name,
        })
      }
    })

    if (preAbsenceRecords.size > 0) {
      setAttendanceRecords(preAbsenceRecords)
      setHasChanges(true)
      hasChangesRef.current = true
    }
    setPreAbsenceProcessed(true)
  }, [preAbsenceProcessed, preAbsenceLoading, preAbsenceEntries, viewDate, assignedSeats, todayKey, currentStaff])

  const displayDate = useMemo(() => {
    const dateToShow = viewDate ? new Date(viewDate + 'T00:00:00') : new Date()
    return dateToShow.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    })
  }, [viewDate])

  const handleSeatClick = (seatId: string) => {
    if (viewDate) return

    setAttendanceRecords((prev) => {
      const newRecords = new Map(prev)
      const current = newRecords.get(seatId)

      let newStatus: 'present' | 'absent' | 'unchecked'
      if (!current || current.status === 'unchecked') {
        newStatus = 'present'
      } else if (current.status === 'present') {
        newStatus = 'absent'
      } else {
        newRecords.delete(seatId)
        return newRecords
      }

      newRecords.set(seatId, {
        studentId: seatId,
        status: newStatus,
        isModified: true,
        staffName: currentStaff?.name,
      })

      return newRecords
    })
    setHasChanges(true)
    hasChangesRef.current = true
  }

  const handleSeatLongPress = (seatId: string) => {
    const student = getStudentBySeatId(seatId)
    if (student) {
      const note = getStudentNote(seatId, dateKey)
      const info = getPreAbsenceInfo(student.studentId, dateKey)
      setStudentModal({
        studentName: student.name,
        studentId: student.studentId,
        seatId: seatId,
        preAbsenceInfo: info,
        note: note,
      })
      setNoteInput(note)
    }
  }

  const handleSaveNote = () => {
    if (studentModal) {
      saveStudentNote(studentModal.seatId, dateKey, noteInput)
      setStudentNotes(getAllStudentNotes(dateKey))
      setStudentModal(null)
      setNoteInput('')
    }
  }

  const handleTempSave = () => {
    const dataToSave = Array.from(attendanceRecords.entries())
    localStorage.setItem(getTempSaveKey(), JSON.stringify(dataToSave))
    setHasTempSave(true)
    setAlertModal({
      title: '임시 저장 완료',
      message: '출결 데이터가 로컬에 임시 저장되었습니다.\n인터넷 연결이 복구되면 저장 버튼을 눌러주세요.',
    })
  }

  const executeSave = async () => {
    setIsSaving(true)

    try {
      await zoneAttendanceService.save(
        zoneId || '',
        todayKey,
        attendanceRecords,
        currentStaff?.name,
        studentNotes
      )
      console.log('[AttendancePage] Saved to Supabase')
    } catch (err) {
      console.error('[AttendancePage] Supabase save error:', err)
    }

    const dataToSave = Array.from(attendanceRecords.entries())
    localStorage.setItem(getSavedKey(), JSON.stringify(dataToSave))
    localStorage.setItem(`attendance_saved_time_${zoneId}_${todayKey}`, new Date().toISOString())
    if (currentStaff?.name) {
      localStorage.setItem(`attendance_recorder_${zoneId}_${todayKey}`, currentStaff.name)
    }
    localStorage.removeItem(getTempSaveKey())

    setIsSaving(false)
    setHasChanges(false)
    hasChangesRef.current = false
    setHasTempSave(false)
    setAlertModal({
      title: '저장 완료',
      message: `출결이 저장되었습니다.${currentStaff ? `\n기록자: ${currentStaff.name}` : ''}\n(서버에 실시간 동기화됨)`,
    })
  }

  const handleSave = async () => {
    if (summary.unchecked > 0) {
      setAlertModal({
        title: '저장 불가',
        message: `미체크 학생이 ${summary.unchecked}명 있습니다.\n모든 학생의 출결 체크를 완료해주세요.`,
      })
      return
    }

    const savedTimeStr = localStorage.getItem(`attendance_saved_time_${zoneId}_${todayKey}`)
    const hasSavedData = localStorage.getItem(getSavedKey())

    if ((hasSavedData && savedTimeStr) || supabaseRecordedBy) {
      let timeStr = ''
      if (savedTimeStr) {
        const savedDate = new Date(savedTimeStr)
        timeStr = savedDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
      }
      const recorderInfo = supabaseRecordedBy ? ` (${supabaseRecordedBy} 님이 기록)` : ''
      setAlertModal({
        title: '덮어쓰기 확인',
        message: timeStr
          ? `오늘 ${timeStr}에 이미 저장된 기록이 있습니다.${recorderInfo}\n덮어쓰시겠습니까?`
          : `이미 저장된 기록이 있습니다.${recorderInfo}\n덮어쓰시겠습니까?`,
        onConfirm: executeSave,
      })
      return
    }

    await executeSave()
  }

  const handleMarkAllPresent = () => {
    if (viewDate) return

    const layout = SEAT_LAYOUTS[zoneId || '']
    if (!layout) return

    const newRecords = new Map<string, AttendanceRecord>()

    layout.forEach((row) => {
      if (row[0] === 'br') return

      row.forEach((cell) => {
        if (cell !== 'sp' && cell !== 'empty' && cell !== 'br') {
          const seatId = cell as string
          const student = getStudentBySeatId(seatId)
          if (student) {
            newRecords.set(seatId, {
              studentId: seatId,
              status: 'present',
              isModified: true,
              staffName: currentStaff?.name,
            })
          }
        }
      })
    })

    setAttendanceRecords(newRecords)
    setHasChanges(true)
    hasChangesRef.current = true
  }

  const handleMarkAllAbsent = () => {
    if (viewDate) return

    const layout = SEAT_LAYOUTS[zoneId || '']
    if (!layout) return

    const newRecords = new Map<string, AttendanceRecord>()

    layout.forEach((row) => {
      if (row[0] === 'br') return

      row.forEach((cell) => {
        if (cell !== 'sp' && cell !== 'empty' && cell !== 'br') {
          const seatId = cell as string
          const student = getStudentBySeatId(seatId)
          if (student) {
            newRecords.set(seatId, {
              studentId: seatId,
              status: 'absent',
              isModified: true,
              staffName: currentStaff?.name,
            })
          }
        }
      })
    })

    setAttendanceRecords(newRecords)
    setHasChanges(true)
    hasChangesRef.current = true
  }

  const summary = useMemo(() => {
    let present = 0
    let absent = 0

    assignedSeats.forEach((seatId) => {
      const record = attendanceRecords.get(seatId)
      if (record) {
        if (record.status === 'present') present++
        else if (record.status === 'absent') absent++
      }
    })

    const unchecked = assignedSeats.length - present - absent

    return { present, absent, unchecked, total: assignedSeats.length }
  }, [attendanceRecords, assignedSeats])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title={`${zoneId}`}
        showBack
        onBack={() => navigate(fromAdmin ? '/admin' : '/')}
      />

      <div className={`border-b px-4 py-3 ${viewDate ? 'bg-purple-50' : 'bg-white'}`}>
        <div className="flex justify-between items-center">
          <div>
            <span className={`text-lg font-semibold ${viewDate ? 'text-purple-700' : 'text-gray-700'}`}>{displayDate}</span>
            <span className="ml-2 text-sm text-gray-500">
              {viewDate ? '(조회 모드)' : '출결 체크'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600 font-medium">출석 {summary.present}</span>
              <span className="text-gray-300">|</span>
              <span className="text-red-600 font-medium">결석 {summary.absent}</span>
              <span className="text-gray-300">|</span>
              <span className="text-gray-500 font-medium">미체크 {summary.unchecked}</span>
            </div>
            {fromAdmin && adminRecordedBy ? (
              <span className="text-sm bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
                기록자: {adminRecordedBy}
              </span>
            ) : supabaseRecordedBy && !hasChanges ? (
              <span className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-full">
                저장됨: {supabaseRecordedBy}
              </span>
            ) : currentStaff ? (
              <span className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded-full">
                기록자: {currentStaff.name}
              </span>
            ) : (
              <span className="text-sm bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full">
                담당자 미선택
              </span>
            )}
          </div>
        </div>
      </div>

      {!viewDate && (
        <div className="bg-white border-b px-4 py-3">
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllPresent}
              className="flex-1 py-2 bg-green-100 text-green-700 font-semibold rounded-lg
                         hover:bg-green-200 transition-colors text-sm"
            >
              일괄 출석
            </button>
            <button
              onClick={handleMarkAllAbsent}
              className="flex-1 py-2 bg-red-100 text-red-700 font-semibold rounded-lg
                         hover:bg-red-200 transition-colors text-sm"
            >
              일괄 결석
            </button>
            <button
              onClick={handleTempSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 py-2 bg-yellow-100 text-yellow-700 font-semibold rounded-lg
                         hover:bg-yellow-200 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {hasTempSave ? '임시저장됨' : '임시저장'}
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="flex-1 py-2 bg-primary-500 text-white font-semibold rounded-lg
                         hover:bg-primary-600 transition-colors text-sm
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden p-4">
        {isLoadingSupabase ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <svg className="animate-spin h-8 w-8 text-primary-500 mx-auto mb-2" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div className="text-gray-500 text-sm">데이터 불러오는 중...</div>
            </div>
          </div>
        ) : (
          <PinchZoomContainer>
            <SeatMap
              zoneId={zoneId || ''}
              attendanceRecords={attendanceRecords}
              studentNotes={studentNotes}
              dateKey={dateKey}
              preAbsenceEntries={preAbsenceEntries}
              onSeatClick={handleSeatClick}
              onSeatLongPress={handleSeatLongPress}
            />
          </PinchZoomContainer>
        )}
      </div>

      {alertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-5">
              <h2 className="text-xl font-bold mb-3">{alertModal.title}</h2>
              <p className="text-gray-600 whitespace-pre-line">{alertModal.message}</p>
            </div>
            <div className="p-4 border-t flex gap-3">
              {alertModal.onConfirm ? (
                <>
                  <button
                    onClick={() => setAlertModal(null)}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl
                               hover:bg-gray-200 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      alertModal.onConfirm?.()
                      setAlertModal(null)
                    }}
                    className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl
                               hover:bg-primary-600 transition-colors"
                  >
                    확인
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setAlertModal(null)}
                  className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl
                             hover:bg-primary-600 transition-colors"
                >
                  확인
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {studentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="bg-blue-500 text-white p-4">
              <h2 className="text-xl font-bold">학생 정보</h2>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="text-gray-500 text-sm">학생 정보</div>
                <div className="font-bold text-lg">
                  {studentModal.studentName} ({studentModal.studentId})
                </div>
                <div className="text-gray-600">좌석: {studentModal.seatId}</div>
              </div>

              {studentModal.preAbsenceInfo && (
                <div className={`p-4 rounded-xl border-2 ${
                  studentModal.preAbsenceInfo.type === '외박'
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-purple-50 border-purple-300'
                }`}>
                  <div className={`text-sm font-semibold mb-1 ${
                    studentModal.preAbsenceInfo.type === '외박'
                      ? 'text-indigo-600'
                      : 'text-purple-600'
                  }`}>
                    {studentModal.preAbsenceInfo.type === '외박' ? '외박 신청' : '사전 결석 신청'}
                  </div>
                  <div className={`font-medium ${
                    studentModal.preAbsenceInfo.type === '외박'
                      ? 'text-indigo-800'
                      : 'text-purple-800'
                  }`}>
                    {studentModal.preAbsenceInfo.reason || (studentModal.preAbsenceInfo.type === '외박' ? '외박' : '사전 결석')}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    기간: {studentModal.preAbsenceInfo.startDate} ~ {studentModal.preAbsenceInfo.endDate}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  특이사항
                </label>
                <textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="학생에 대한 특이사항을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:border-blue-500"
                  rows={3}
                  disabled={!!viewDate}
                />
              </div>
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => {
                  setStudentModal(null)
                  setNoteInput('')
                }}
                className="flex-1 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl
                           hover:bg-gray-200 transition-colors"
              >
                {viewDate ? '닫기' : '취소'}
              </button>
              {!viewDate && (
                <button
                  onClick={handleSaveNote}
                  className="flex-1 py-3 bg-blue-500 text-white font-semibold rounded-xl
                             hover:bg-blue-600 transition-colors"
                >
                  저장
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
