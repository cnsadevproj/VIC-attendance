import { type ReactNode } from 'react'

interface ErrorBoundaryProps {
  children: ReactNode
}

function ErrorBoundary({ children }: ErrorBoundaryProps) {
  return <>{children}</>
}

export default ErrorBoundary
