# VIC Attendance - 면학실 출결 관리 시스템

방과후학교 면학실 출결 관리를 위한 웹 애플리케이션입니다.

## 배포 URL

| 서비스 | URL |
|--------|-----|
| **웹 애플리케이션** | https://vic-attendance.web.app |

---

## 주요 기능

### 1. 출결 체크
- 태블릿/모바일에서 좌석 배치도 기반 터치 출결
- 구역별 출결 입력 (4층 A~D, 3층 A~D)
- 출석/결석 한 번 터치로 전환
- 사전결석/외박 학생 자동 표시 (보라색 뱃지)
- 핀치 줌 지원

### 2. 관리자 대시보드 (`/admin`)
- 전체 출결 현황 실시간 조회
- 구역별/학년별 통계
- 결석자 목록 Google Sheets 내보내기
- **결석자 Discord 리포트 발송** (PNG 테이블 이미지)
- 일일 특이사항(공지) 관리
- 버그 리포트 관리

### 3. Discord 리포트
- 결석자 명단을 Google Sheet와 동일한 구조의 PNG 테이블로 렌더링
- 1학년/2학년 좌우 병렬 배치, 순번/좌석번호/이름/비고 컬럼
- 특이사항 섹션 포함
- Discord Webhook으로 자동 전송

### 4. PWA 지원
- 모바일 홈 화면 설치 가능
- 오프라인 대응 (Service Worker)
- 세로 고정, 전체 화면 모드

---

## 사용 방법

### 출결 담당자
1. https://vic-attendance.web.app 접속
2. 담당 구역 선택 (예: 4층 A구역)
3. 담당자 이름 입력
4. 좌석 터치하여 출석(초록)/결석(빨강) 체크
5. 저장 버튼 클릭

### 관리자
1. https://vic-attendance.web.app/admin 접속
2. 비밀번호 입력
3. 전체 현황 확인
4. 결석자 Google Sheets 내보내기 또는 Discord 리포트 발송

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| **Frontend** | React 18 + TypeScript + Vite |
| **상태관리** | Zustand |
| **스타일링** | Tailwind CSS |
| **DB / 실시간** | Supabase (PostgreSQL + Realtime) |
| **호스팅** | Firebase Hosting |
| **스프레드시트** | Google Apps Script 연동 |
| **리포트** | Discord Webhook + Canvas PNG |

---

## 프로젝트 구조

```
VIC_attendance/
├── src/
│   ├── components/         # 재사용 컴포넌트
│   │   ├── layout/         # Header 등 레이아웃
│   │   ├── seatmap/        # 좌석 배치도 (Seat, SeatMap)
│   │   └── attendance/     # 출결 요약, 교시 선택
│   ├── pages/              # 페이지 컴포넌트
│   │   ├── HomePage.tsx    # 구역 선택 대시보드
│   │   ├── AttendancePage.tsx  # 출결 입력
│   │   ├── AdminDashboard.tsx  # 관리자 대시보드
│   │   ├── LoginPage.tsx   # 로그인
│   │   └── LandingPage.tsx # 랜딩
│   ├── config/             # 좌석배치, 학생정보, 근무일정
│   ├── services/           # API 서비스
│   │   ├── attendanceService.ts    # 출결 CRUD
│   │   ├── zoneAttendanceService.ts # 구역별 실시간 출결
│   │   ├── studentService.ts       # 학생 데이터
│   │   ├── absenceService.ts       # 사전결석/외박
│   │   ├── authService.ts          # 인증
│   │   ├── googleSheets.ts         # 스프레드시트 내보내기
│   │   ├── discordService.ts       # Discord 리포트
│   │   ├── noticeService.ts        # 일일 공지
│   │   └── zoneService.ts          # 구역 설정
│   ├── stores/             # Zustand 상태 저장소
│   ├── hooks/              # 커스텀 훅 (usePreAbsences 등)
│   ├── types/              # TypeScript 타입
│   └── utils/              # 유틸리티 (날짜 등)
├── google-apps-script/     # Google Sheets 연동 스크립트
├── public/                 # 정적 파일 (아이콘, manifest)
└── dist/                   # 빌드 결과물
```

---

## 운영 일정

| 기간 | 내용 |
|------|------|
| 2025-12-22 ~ 2026-01-02 | 임시 운영 (테스트 데이터) |
| 2026-01-07 ~ 2026-02-03 | 정규 운영 |

---

## 로컬 개발

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# Firebase 배포
firebase deploy --only hosting
```

---

## 라이선스

이 프로젝트는 내부 사용 목적으로 개발되었습니다.
