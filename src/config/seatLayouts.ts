import type { SeatLayout } from '../types'

// 좌석 배치 (실제 학생 수에 맞춤)
// 1학년 (4층): 4A(30), 4B(30), 4C(31), 4D(30) = 121명
// 2학년 (3층): 3A(37), 3B(37), 3C(24), 3D(48) = 146명

// 좌석 배열 생성 헬퍼 함수
function generateSeats(prefix: string, count: number, seatsPerRow: number = 8): SeatLayout {
  const layout: SeatLayout = []
  let seatNum = 1

  while (seatNum <= count) {
    const row: (string | 'sp' | 'empty' | 'br')[] = []
    for (let i = 0; i < seatsPerRow && seatNum <= count; i++) {
      row.push(`${prefix}${String(seatNum).padStart(3, '0')}`)
      seatNum++
      // 중간에 spacer 추가 (4개씩 끊기)
      if (i === 3 && seatNum <= count && i < seatsPerRow - 1) {
        row.push('sp')
      }
    }
    layout.push(row)
    if (seatNum <= count) {
      layout.push(['br'])
    }
  }

  return layout
}

export const SEAT_LAYOUTS: Record<string, SeatLayout> = {
  // ========== 1학년 (4층) - 121명 ==========
  '4A': generateSeats('4A', 30, 8),
  '4B': generateSeats('4B', 30, 8),
  '4C': generateSeats('4C', 31, 8),
  '4D': generateSeats('4D', 30, 8),

  // ========== 2학년 (3층) - 146명 ==========
  '3A': generateSeats('3A', 37, 8),
  '3B': generateSeats('3B', 37, 8),
  '3C': generateSeats('3C', 24, 6),
  '3D': generateSeats('3D', 48, 8),
}
