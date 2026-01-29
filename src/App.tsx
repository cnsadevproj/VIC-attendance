import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import HomePage from './pages/HomePage'
import AttendancePage from './pages/AttendancePage'
import LoginPage from './pages/LoginPage'
import AdminDashboard from './pages/AdminDashboard'
import LandingPage from './pages/LandingPage'
import ErrorBoundary from './components/ErrorBoundary'
import { initializeMockData, isMockDataInitialized } from './utils/generateMockData'

function App() {
  useEffect(() => {
    const today = new Date()
    const testEndDate = new Date('2026-01-02')

    if (today <= testEndDate && !isMockDataInitialized()) {
      initializeMockData()
    }
  }, [])
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/start" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<HomePage />} />
          <Route path="/attendance/:zoneId" element={<AttendancePage />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/start" replace />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
