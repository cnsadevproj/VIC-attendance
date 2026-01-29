import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Header from '../components/layout/Header'
import BugReportModal from '../components/BugReportModal'
import { searchStudentByName, getStudentBySeatId, type StudentSearchResult } from '../config/mockStudents'
import { SEAT_LAYOUTS } from '../config/seatLayouts'
import { isTemporaryPeriod } from '../config/staffSchedule'
import { getTodayKST } from '../utils/date'
import { zoneAttendanceService, type ZoneAttendanceData } from '../services/zoneAttendanceService'
import { usePreAbsences } from '../hooks/usePreAbsences'
import { noticeService } from '../services/noticeService'
import type { AttendanceRecord } from '../types'

interface CurrentStaff {
  name: string
  grade: number
  date: string
}

interface ZoneStatus {
  total: number
  present: number
  absent: number
  unchecked: number
  isComplete: boolean
}

const GRADES = [
  {
    grade: 1,
    name: '1학년 (4층)',
    zones: [
      { id: '4A', name: '4A', color: 'bg-pink-200' },
      { id: '4B', name: '4B', color: 'bg-gray-300' },
      { id: '4C', name: '4C', color: 'bg-sky-200' },
      { id: '4D', name: '4D', color: 'bg-orange-200' },
    ],
  },
  {
    grade: 2,
    name: '2학년 (3층)',
    zones: [
      { id: '3A', name: '3A', color: 'bg-pink-200' },
      { id: '3B', name: '3B', color: 'bg-gray-300' },
      { id: '3C', name: '3C', color: 'bg-sky-200' },
      { id: '3D', name: '3D', color: 'bg-orange-200' },
    ],
  },
]

function getZoneStatus(zoneId: string, todayKey: string): ZoneStatus {
  try {
    const layout = SEAT_LAYOUTS[zoneId]
    if (!layout) return { total: 0, present: 0, absent: 0, unchecked: 0, isComplete: false }

    let totalStudents = 0
    layout.forEach((row) => {
      if (row[0] === 'br') return
      row.forEach((cell) => {
        if (cell !== 'sp' && cell !== 'empty' && cell !== 'br') {
          const student = getStudentBySeatId(cell as string)
          if (student) totalStudents++
        }
      })
    })

    let records = new Map<string, AttendanceRecord>()

    try {
      const savedData = localStorage.getItem(`attendance_saved_${zoneId}_${todayKey}`)
      if (savedData) {
        const parsed = JSON.parse(savedData) as [string, AttendanceRecord][]
        if (Array.isArray(parsed)) {
          records = new Map(parsed)
        }
      } else {
        const tempData = localStorage.getItem(`attendance_temp_${zoneId}_${todayKey}`)
        if (tempData) {
          const parsed = JSON.parse(tempData) as [string, AttendanceRecord][]
          if (Array.isArray(parsed)) {
            records = new Map(parsed)
          }
        }
      }
    } catch {
      records = new Map()
    }

    let present = 0
    let absent = 0
    records.forEach((record, seatId) => {
      const student = getStudentBySeatId(seatId)
      if (!student) return
      if (record.status === 'present') present++
      else if (record.status === 'absent') absent++
    })

    const unchecked = Math.max(0, totalStudents - present - absent)
    const isComplete = unchecked === 0 && totalStudents > 0

    return { total: totalStudents, present, absent, unchecked, isComplete }
  } catch {
    return { total: 0, present: 0, absent: 0, unchecked: 0, isComplete: false }
  }
}

export default function HomePage() {
  const navigate = useNavigate()
  const [currentStaff, setCurrentStaff] = useState<CurrentStaff | null>(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<StudentSearchResult[]>([])
  const [adminNotice, setAdminNotice] = useState<string | null>(null)
  const [showBugReport, setShowBugReport] = useState(false)
  const [zoneStatuses, setZoneStatuses] = useState<Record<string, ZoneStatus>>({})

  const { getPreAbsenceInfo } = usePreAbsences()

  const todayKey = getTodayKST()

  useEffect(() => {
    const loadNotice = async () => {
      try {
        const notice = await noticeService.get(todayKey)
        setAdminNotice(notice || null)
      } catch (error) {
        console.error('[HomePage] Failed to load notice:', error)
        const localNotice = localStorage.getItem(`admin_notice_${todayKey}`)
        setAdminNotice(localNotice)
      }
    }
    loadNotice()

    const unsubscribe = noticeService.subscribeToDate(todayKey, (notice) => {
      setAdminNotice(notice || null)
    })

    return () => {
      unsubscribe()
    }
  }, [todayKey])

  useEffect(() => {
    const calculateStatusFromData = (
      zoneId: string,
      records: Map<string, AttendanceRecord>
    ): ZoneStatus => {
      const layout = SEAT_LAYOUTS[zoneId]
      if (!layout) return { total: 0, present: 0, absent: 0, unchecked: 0, isComplete: false }

      let totalStudents = 0
      layout.forEach((row) => {
        if (row[0] === 'br') return
        row.forEach((cell) => {
          if (cell !== 'sp' && cell !== 'empty' && cell !== 'br') {
            const student = getStudentBySeatId(cell as string)
            if (student) totalStudents++
          }
        })
      })

      let present = 0
      let absent = 0
      records.forEach((record, seatId) => {
        const student = getStudentBySeatId(seatId)
        if (!student) return
        if (record.status === 'present') present++
        else if (record.status === 'absent') absent++
      })

      const unchecked = Math.max(0, totalStudents - present - absent)
      const isComplete = unchecked === 0 && totalStudents > 0

      return { total: totalStudents, present, absent, unchecked, isComplete }
    }

    const updateFromSupabase = (allData: ZoneAttendanceData[]) => {
      const statuses: Record<string, ZoneStatus> = {}

      GRADES.forEach((gradeInfo) => {
        gradeInfo.zones.forEach((zone) => {
          const zoneData = allData.find((d) => d.zone_id === zone.id)
          if (zoneData && zoneData.data) {
            const records = new Map<string, AttendanceRecord>(zoneData.data)
            statuses[zone.id] = calculateStatusFromData(zone.id, records)
          } else {
            statuses[zone.id] = getZoneStatus(zone.id, todayKey)
          }
        })
      })

      setZoneStatuses(statuses)
    }

    const loadInitial = async () => {
      try {
        const allData = await zoneAttendanceService.getAllByDate(todayKey)
        console.log('[HomePage] Supabase data loaded:', allData.length, 'zones')
        updateFromSupabase(allData)
      } catch (err) {
        console.error('[HomePage] Supabase load error:', err)
        const statuses: Record<string, ZoneStatus> = {}
        GRADES.forEach((gradeInfo) => {
          gradeInfo.zones.forEach((zone) => {
            statuses[zone.id] = getZoneStatus(zone.id, todayKey)
          })
        })
        setZoneStatuses(statuses)
      }
    }

    loadInitial()

    const unsubscribe = zoneAttendanceService.subscribeToDate(todayKey, (allData) => {
      console.log('[HomePage] Realtime update:', allData.length, 'zones')
      updateFromSupabase(allData)
    })

    const handleFocus = () => loadInitial()
    window.addEventListener('focus', handleFocus)

    return () => {
      window.removeEventListener('focus', handleFocus)
      unsubscribe()
    }
  }, [todayKey])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length >= 1) {
      let results = searchStudentByName(query)
      if (currentStaff) {
        results = results.filter((result) => {
          const floor = result.zoneId.startsWith('4') ? 1 : 2
          return floor === currentStaff.grade
        })
      }
      setSearchResults(results)
    } else {
      setSearchResults([])
    }
  }

  useEffect(() => {
    const staffData = sessionStorage.getItem('currentStaff')
    if (staffData) {
      const staff = JSON.parse(staffData) as CurrentStaff
      const today = getTodayKST()
      if (staff.date === today) {
        setCurrentStaff(staff)
      } else {
        sessionStorage.removeItem('currentStaff')
      }
    }
  }, [])

  const handleZoneClick = (zoneId: string) => {
    navigate(`/attendance/${zoneId}`)
  }

  const handleChangeStaff = () => {
    sessionStorage.removeItem('currentStaff')
    navigate('/start')
  }

  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        title="면학실 선택"
        rightAction={
          <div className="flex gap-2">
            <button
              onClick={() => setShowSearch(true)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              학생 검색
            </button>
            <button
              onClick={() => setShowBugReport(true)}
              className="px-3 py-1 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600"
            >
              버그 보고
            </button>
          </div>
        }
      />

      <div className="bg-primary-500 text-white px-4 py-3">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <span className="text-sm opacity-80">{today}</span>
            {currentStaff ? (
              <p className="font-semibold">
                담당자: {currentStaff.name} ({currentStaff.grade}학년)
              </p>
            ) : (
              <p className="font-semibold text-yellow-200">
                담당자 미선택
              </p>
            )}
          </div>
          <button
            onClick={handleChangeStaff}
            className="px-3 py-1 text-sm bg-white/20 rounded-lg hover:bg-white/30"
          >
            {currentStaff ? '담당자 변경' : '담당자 선택'}
          </button>
        </div>
      </div>

      {isTemporaryPeriod(todayKey) && (
        <div className="bg-orange-50 border-b border-orange-200 px-4 py-3">
          <div className="container mx-auto">
            <div className="flex items-start gap-2">
              <span className="text-orange-500 text-lg">⚠️</span>
              <div>
                <span className="text-sm text-orange-700 font-semibold">
                  2025 VIC가 아직 시작되지 않았습니다. 해당 데이터는 임시 데이터입니다.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {adminNotice && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="container mx-auto">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 text-lg">📢</span>
              <div>
                <span className="text-xs text-amber-600 font-semibold">오늘의 특이사항</span>
                <p className="text-sm text-amber-800 whitespace-pre-line">{adminNotice}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto px-4 py-6 space-y-8">
        {GRADES
          .filter((gradeInfo) => {
            if (currentStaff) {
              return gradeInfo.grade === currentStaff.grade
            }
            return true
          })
          .map((gradeInfo) => (
          <section key={gradeInfo.grade} className="bg-white rounded-2xl shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {gradeInfo.name}
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {gradeInfo.zones.map((zone) => {
                const status = zoneStatuses[zone.id]
                const isComplete = status?.isComplete

                const isEmpty = status && status.total === 0

                return (
                  <button
                    key={zone.id}
                    onClick={() => !isEmpty && handleZoneClick(zone.id)}
                    disabled={isEmpty}
                    className={`${zone.color} p-6 rounded-xl border-2
                               ${isEmpty ? 'opacity-50 cursor-not-allowed border-gray-300' :
                                 isComplete ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300'}
                               ${!isEmpty ? 'hover:scale-105 hover:shadow-lg' : ''}
                               transition-all duration-200
                               flex flex-col items-center justify-center min-h-[120px]`}
                  >
                    <span className="text-3xl font-bold text-gray-800">{zone.name}</span>

                    {status ? (
                      isEmpty ? (
                        <div className="mt-2 text-center">
                          <div className="text-sm text-gray-500">0석</div>
                          <div className="text-xs text-gray-400 mt-1">미배정 교실</div>
                        </div>
                      ) : (
                        <div className="mt-2 text-center">
                          <div className="text-sm text-gray-600">
                            {status.total}석
                          </div>
                          {isComplete && (
                            <div className="mt-1 text-sm font-semibold text-green-600">
                              출결입력 완료
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <span className="text-sm text-gray-600 mt-2">로딩중...</span>
                    )}
                  </button>
                )
              })}
            </div>

          </section>
        ))}
      </main>

      {showSearch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xl font-bold">학생 검색</h2>
                <button
                  onClick={() => {
                    setShowSearch(false)
                    setSearchQuery('')
                    setSearchResults([])
                  }}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="학생 이름을 입력하세요"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-primary-500 focus:outline-none"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto max-h-[50vh] p-4">
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.student.seatId}
                      onClick={() => {
                        navigate(`/attendance/${result.zoneId}`)
                        setShowSearch(false)
                      }}
                      className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-bold text-lg">{result.student.name}</span>
                          <span className="text-gray-500 ml-2">({result.student.studentId})</span>
                        </div>
                        <div className="text-right">
                          <div className="text-primary-600 font-semibold">{result.zoneName}</div>
                          <div className="text-sm text-gray-500">좌석: {result.student.seatId}</div>
                        </div>
                      </div>
                      {(() => {
                        const preAbsInfo = getPreAbsenceInfo(result.student.studentId, todayKey)
                        return preAbsInfo ? (
                          <div className={`mt-2 text-sm px-2 py-1 rounded ${
                            preAbsInfo.type === '외박' ? 'text-indigo-600 bg-indigo-50' : 'text-purple-600 bg-purple-50'
                          }`}>
                            {preAbsInfo.type === '외박' ? '외박' : '사전 결석'}: {preAbsInfo.reason}
                          </div>
                        ) : null
                      })()}
                    </button>
                  ))}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="text-center text-gray-500 py-8">
                  검색 결과가 없습니다
                </div>
              ) : (
                <div className="text-center text-gray-400 py-8">
                  학생 이름을 입력하면 좌석 정보를 확인할 수 있습니다
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <BugReportModal
        isOpen={showBugReport}
        onClose={() => setShowBugReport(false)}
      />
    </div>
  )
}
