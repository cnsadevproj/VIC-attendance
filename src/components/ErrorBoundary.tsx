import { Component, type ReactNode } from 'react'

interface ErrorInfo {
  componentStack: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  errorCode: string
}

interface ErrorBoundaryProps {
  children: ReactNode
}

// 오류 코드 생성 (날짜 + 랜덤)
function generateErrorCode(): string {
  const now = new Date()
  const dateStr = `${now.getMonth() + 1}${now.getDate()}`
  const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ERR-${dateStr}-${randomStr}`
}


class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCode: '',
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorCode: generateErrorCode(),
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo })

    // 콘솔에도 로그
    console.error('VIC 출결 시스템 오류:', {
      errorCode: this.state.errorCode,
      error,
      errorInfo,
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleGoHome = () => {
    window.location.href = '/'
  }

  handleReportBug = () => {
    const { errorCode, error, errorInfo } = this.state

    // BugReportModal과 동일한 형식으로 저장
    const bugReport = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      description: `[자동 오류 보고] ${errorCode}`,
      errorInfo: `${error?.message || '알 수 없는 오류'}\n\n${error?.stack || ''}\n\n${errorInfo?.componentStack || ''}`,
      userAgent: navigator.userAgent,
      isRead: false,
    }

    // 기존 보고 불러오기
    const existingReports = localStorage.getItem('bug_reports')
    let reports = []
    if (existingReports) {
      try {
        reports = JSON.parse(existingReports)
      } catch {
        reports = []
      }
    }

    // 새 보고 추가
    reports.unshift(bugReport)
    localStorage.setItem('bug_reports', JSON.stringify(reports))

    alert('오류가 보고되었습니다. 관리자가 확인할 예정입니다.')
  }

  render() {
    if (this.state.hasError) {
      const { errorCode, error } = this.state

      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            {/* 헤더 */}
            <div className="bg-red-500 text-white p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold">오류가 발생했습니다</h1>
                  <p className="text-red-100 text-sm">예상치 못한 문제가 발생했습니다</p>
                </div>
              </div>
            </div>

            {/* 오류 정보 */}
            <div className="p-5">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">오류 코드</span>
                  <span className="font-mono font-bold text-red-600">{errorCode}</span>
                </div>
                <div className="text-sm text-gray-600 break-all">
                  {error?.message || '알 수 없는 오류가 발생했습니다.'}
                </div>
              </div>

              <p className="text-sm text-gray-500 mb-4">
                새로고침을 시도해보세요. 오류가 지속되면 관리자에게 문의하세요.
              </p>

              {/* 액션 버튼들 */}
              <div className="space-y-2">
                <button
                  onClick={this.handleReportBug}
                  className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl
                           hover:bg-orange-600 transition-colors"
                >
                  오류 보고하기
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={this.handleReload}
                    className="flex-1 py-3 bg-primary-500 text-white font-semibold rounded-xl
                             hover:bg-primary-600 transition-colors"
                  >
                    새로고침
                  </button>
                  <button
                    onClick={this.handleGoHome}
                    className="flex-1 py-3 bg-gray-500 text-white font-semibold rounded-xl
                             hover:bg-gray-600 transition-colors"
                  >
                    홈으로
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
