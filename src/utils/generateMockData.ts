import { SEAT_LAYOUTS } from '../config/seatLayouts'
import { getStudentBySeatId } from '../config/mockStudents'
import { isPreAbsentOnDate } from '../config/preAbsences'

function getAssignedSeats(zoneId: string): string[] {
  const layout = SEAT_LAYOUTS[zoneId]
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
}

interface AttendanceRecord {
  studentId: string
  status: 'present' | 'absent'
  isModified: boolean
  staffName?: string
}

function generateDayData(
  dateKey: string,
  options: {
    completeRate: number
    preAbsenceAbsentRate: number
    normalAbsentRate: number
  }
): void {
  const zones = ['4A', '4B', '4C', '4D', '3A', '3B', '3C', '3D']
  const staffNames = ['이예진', '조현정', '강현수', '김종규', '장보경', '민수정']

  zones.forEach((zoneId) => {
    const savedKey = `attendance_saved_${zoneId}_${dateKey}`

    if (localStorage.getItem(savedKey)) return

    const seats = getAssignedSeats(zoneId)
    const records: [string, AttendanceRecord][] = []
    const staffName = staffNames[Math.floor(Math.random() * staffNames.length)]

    const shouldComplete = Math.random() < options.completeRate

    seats.forEach((seatId) => {
      const student = getStudentBySeatId(seatId)
      if (!student) return

      const isPreAbsent = isPreAbsentOnDate(student.studentId, dateKey)
      let status: 'present' | 'absent'

      if (isPreAbsent) {
        status = Math.random() < options.preAbsenceAbsentRate ? 'absent' : 'present'
      } else {
        status = Math.random() < options.normalAbsentRate ? 'absent' : 'present'
      }

      if (shouldComplete) {
        records.push([seatId, {
          studentId: seatId,
          status,
          isModified: true,
          staffName,
        }])
      }
    })

    if (records.length > 0) {
      localStorage.setItem(savedKey, JSON.stringify(records))
      localStorage.setItem(`attendance_saved_time_${zoneId}_${dateKey}`, new Date().toISOString())
      localStorage.setItem(`attendance_recorder_${zoneId}_${dateKey}`, staffName)
    }
  })
}

export function initializeMockData(): void {
  const dec22to29 = [
    '2025-12-22', '2025-12-23', '2025-12-24', '2025-12-26',
    '2025-12-27', '2025-12-29'
  ]

  dec22to29.forEach((dateKey) => {
    generateDayData(dateKey, {
      completeRate: 1.0,
      preAbsenceAbsentRate: 0.97,
      normalAbsentRate: 0.05,
    })
  })

  generateDayData('2025-12-30', {
    completeRate: 1.0,
    preAbsenceAbsentRate: 0.97,
    normalAbsentRate: 0.05,
  })

  const zones = ['4A', '4B', '4C', '4D', '3A', '3B', '3C', '3D']
  const dateKey = '2025-12-31'
  const staffNames = ['이예진', '조현정', '강현수', '김종규', '장보경', '민수정']

  zones.forEach((zoneId) => {
    const savedKey = `attendance_saved_${zoneId}_${dateKey}`

    if (localStorage.getItem(savedKey)) return

    const seats = getAssignedSeats(zoneId)
    const records: [string, AttendanceRecord][] = []
    const staffName = staffNames[Math.floor(Math.random() * staffNames.length)]

    seats.forEach((seatId) => {
      const student = getStudentBySeatId(seatId)
      if (!student) return

      const isPreAbsent = isPreAbsentOnDate(student.studentId, dateKey)

      if (isPreAbsent) {
        records.push([seatId, {
          studentId: seatId,
          status: 'absent',
          isModified: true,
          staffName,
        }])
      }
    })

    if (records.length > 0) {
      const tempKey = `attendance_temp_${zoneId}_${dateKey}`
      localStorage.setItem(tempKey, JSON.stringify(records))
    }
  })

  console.log('Mock data initialized for 2025-12-22 ~ 2025-12-31')
}

export function isMockDataInitialized(): boolean {
  return !!localStorage.getItem('attendance_saved_4A_2025-12-30')
}
