import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/layout/Header'

interface ZoneSummary {
  zoneId: string
  zoneName: string
  grade: number
  present: number
  absent: number
  late: number
  other: number
  total: number
  checked: number
  completionRate: number
}

interface StaffStatus {
  staffId: string
  staffName: string
  zones: string[]
  completionRate: number
  lastUpdated: string | null
}

interface AttendanceDetail {
  seatId: string
  studentName: string
  status: 'present' | 'absent' | 'late' | 'other'
  note?: string
  checkedAt: string
}

// Mock data - will be replaced with Supabase data
const mockZoneSummaries: ZoneSummary[] = [
  { zoneId: '4A', zoneName: '4층 A구역', grade: 1, present: 28, absent: 1, late: 1, other: 0, total: 30, checked: 30, completionRate: 100 },
  { zoneId: '4B', zoneName: '4층 B구역', grade: 1, present: 25, absent: 2, late: 0, other: 0, total: 30, checked: 27, completionRate: 90 },
  { zoneId: '4C', zoneName: '4층 C구역', grade: 1, present: 0, absent: 0, late: 0, other: 0, total: 30, checked: 0, completionRate: 0 },
  { zoneId: '4D', zoneName: '4층 D구역', grade: 1, present: 30, absent: 0, late: 0, other: 0, total: 30, checked: 30, completionRate: 100 },
  { zoneId: '3A', zoneName: '3층 A구역', grade: 2, present: 29, absent: 1, late: 0, other: 0, total: 30, checked: 30, completionRate: 100 },
  { zoneId: '3B', zoneName: '3층 B구역', grade: 2, present: 15, absent: 0, late: 0, other: 0, total: 30, checked: 15, completionRate: 50 },
]

const mockStaffStatus: StaffStatus[] = [
  { staffId: '1', staffName: '김선생', zones: ['4A', '4B'], completionRate: 95, lastUpdated: '08:35' },
  { staffId: '2', staffName: '이선생', zones: ['4C', '4D'], completionRate: 50, lastUpdated: '08:32' },
  { staffId: '3', staffName: '박선생', zones: ['3A', '3B'], completionRate: 75, lastUpdated: '08:38' },
]

// Mock attendance details
const mockAttendanceDetails: Record<string, AttendanceDetail[]> = {
  '4A': [
    { seatId: '4A001', studentName: '김민준', status: 'present', checkedAt: '08:32' },
    { seatId: '4A002', studentName: '이서연', status: 'present', checkedAt: '08:32' },
    { seatId: '4A003', studentName: '박지호', status: 'absent', note: '병결', checkedAt: '08:33' },
    { seatId: '4A004', studentName: '최수빈', status: 'late', checkedAt: '08:45' },
    { seatId: '4A005', studentName: '정예준', status: 'present', checkedAt: '08:32' },
  ],
  '3A': [
    { seatId: '3A001', studentName: '강하늘', status: 'present', checkedAt: '08:31' },
    { seatId: '3A002', studentName: '윤서준', status: 'present', checkedAt: '08:31' },
    { seatId: '3A003', studentName: '임지우', status: 'absent', note: '무단결석', checkedAt: '08:35' },
  ],
}

function getCompletionColor(rate: number): string {
  if (rate >= 100) return 'bg-green-500'
  if (rate >= 50) return 'bg-amber-500'
  if (rate > 0) return 'bg-orange-500'
  return 'bg-gray-300'
}

function getCompletionTextColor(rate: number): string {
  if (rate >= 100) return 'text-green-600'
  if (rate >= 50) return 'text-amber-600'
  if (rate > 0) return 'text-orange-600'
  return 'text-gray-500'
}

function getStatusBadge(status: string) {
  const styles: Record<string, string> = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    late: 'bg-amber-100 text-amber-700',
    other: 'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    present: '출석',
    absent: '결석',
    late: '지각',
    other: '기타',
  }
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [zoneSummaries, _setZoneSummaries] = useState<ZoneSummary[]>(mockZoneSummaries)
  const [staffStatus, _setStaffStatus] = useState<StaffStatus[]>(mockStaffStatus)
  void _setZoneSummaries
  void _setStaffStatus
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null)
  const [selectedZone, setSelectedZone] = useState<string | null>(null)
  const [attendanceDetails, setAttendanceDetails] = useState<AttendanceDetail[]>([])

  // Filter by grade
  const filteredSummaries = selectedGrade
    ? zoneSummaries.filter((z) => z.grade === selectedGrade)
    : zoneSummaries

  // Calculate overall stats
  const overallStats = filteredSummaries.reduce(
    (acc, zone) => ({
      totalStudents: acc.totalStudents + zone.total,
      totalChecked: acc.totalChecked + zone.checked,
      present: acc.present + zone.present,
      absent: acc.absent + zone.absent,
      late: acc.late + zone.late,
      other: acc.other + zone.other,
    }),
    { totalStudents: 0, totalChecked: 0, present: 0, absent: 0, late: 0, other: 0 }
  )

  const overallCompletionRate = overallStats.totalStudents > 0
    ? Math.round((overallStats.totalChecked / overallStats.totalStudents) * 100)
    : 0

  // Load attendance details when zone is selected
  const handleZoneClick = (zoneId: string) => {
    setSelectedZone(zoneId)
    setAttendanceDetails(mockAttendanceDetails[zoneId] || [])
  }

  const closeModal = () => {
    setSelectedZone(null)
    setAttendanceDetails([])
  }

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Refreshing data...')
    }, 30000)
    return () => clearInterval(interval)
  }, [date])

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        title="관리자 대시보드"
        showBack
        onBack={() => navigate('/')}
      />

      {/* Date Filter */}
      <div className="bg-white border-b px-4 py-3 flex flex-wrap gap-3 items-center">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-2 border rounded-lg text-sm"
        />
        <span className="text-sm text-gray-500">08:30~08:40 출결</span>
        <div className="flex gap-1 ml-auto">
          <button
            onClick={() => setSelectedGrade(null)}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedGrade === null
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            전체
          </button>
          {[1, 2, 3].map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedGrade === grade
                  ? 'bg-primary-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {grade}학년
            </button>
          ))}
        </div>
      </div>

      {/* Overall Summary */}
      <div className="px-4 py-4 overflow-auto flex-1">
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800">전체 현황</h2>
            <span className={`text-2xl font-bold ${getCompletionTextColor(overallCompletionRate)}`}>
              {overallCompletionRate}%
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full ${getCompletionColor(overallCompletionRate)} transition-all duration-500`}
              style={{ width: `${overallCompletionRate}%` }}
            />
          </div>
          <div className="grid grid-cols-5 gap-2 text-center text-sm">
            <div>
              <div className="text-gray-500">전체</div>
              <div className="font-bold text-gray-800">{overallStats.totalStudents}</div>
            </div>
            <div>
              <div className="text-green-600">출석</div>
              <div className="font-bold text-green-600">{overallStats.present}</div>
            </div>
            <div>
              <div className="text-red-600">결석</div>
              <div className="font-bold text-red-600">{overallStats.absent}</div>
            </div>
            <div>
              <div className="text-amber-600">지각</div>
              <div className="font-bold text-amber-600">{overallStats.late}</div>
            </div>
            <div>
              <div className="text-blue-600">기타</div>
              <div className="font-bold text-blue-600">{overallStats.other}</div>
            </div>
          </div>
        </div>

        {/* Zone Status Grid */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">구역별 현황 (클릭하여 상세보기)</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
          {filteredSummaries.map((zone) => (
            <div
              key={zone.zoneId}
              className="bg-white rounded-xl shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleZoneClick(zone.zoneId)}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-gray-800">{zone.zoneId}</span>
                <span className={`text-sm font-medium ${getCompletionTextColor(zone.completionRate)}`}>
                  {zone.completionRate}%
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full ${getCompletionColor(zone.completionRate)}`}
                  style={{ width: `${zone.completionRate}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>확인: {zone.checked}/{zone.total}</span>
                <span className="text-red-500">{zone.absent > 0 && `결석 ${zone.absent}`}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Staff Status */}
        <h2 className="text-lg font-bold text-gray-800 mb-3">담당자별 현황</h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">담당자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">담당 구역</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">완료율</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">최근 업데이트</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {staffStatus.map((staff) => (
                <tr key={staff.staffId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{staff.staffName}</td>
                  <td className="px-4 py-3 text-gray-600">{staff.zones.join(', ')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getCompletionColor(staff.completionRate)}`}
                          style={{ width: `${staff.completionRate}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getCompletionTextColor(staff.completionRate)}`}>
                        {staff.completionRate}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500 text-sm">
                    {staff.lastUpdated || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Attendance Detail Modal */}
      {selectedZone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-800">{selectedZone} 출결 상세</h3>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-auto max-h-[60vh]">
              {attendanceDetails.length > 0 ? (
                <table className="w-full">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">좌석</th>
                      <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">이름</th>
                      <th className="px-4 py-2 text-center text-sm font-medium text-gray-500">상태</th>
                      <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">시간</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendanceDetails.map((detail) => (
                      <tr key={detail.seatId} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-800">{detail.seatId}</td>
                        <td className="px-4 py-2 text-gray-600">
                          {detail.studentName}
                          {detail.note && (
                            <span className="ml-2 text-xs text-gray-400">({detail.note})</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">{getStatusBadge(detail.status)}</td>
                        <td className="px-4 py-2 text-right text-gray-500 text-sm">{detail.checkedAt}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  아직 입력된 출결 데이터가 없습니다.
                </div>
              )}
            </div>
            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => navigate(`/attendance/${selectedZone}`)}
                className="flex-1 py-2 bg-primary-500 text-white font-medium rounded-lg hover:bg-primary-600"
              >
                출결 입력 화면으로
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
