import * as React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ApiError } from '@/lib/api'
import { AuthProvider } from '@/lib/auth'
import { roleHomePath, useAuth } from '@/lib/auth-helpers'
import { ROUTE_ALLOWED_ROLES } from '@/domain/access-policy'
import { ThemeProvider } from '@/lib/theme'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { SectionLoading, WaveformLoader } from '@/components/ui/waveform-loader'
import { ErrorBoundary } from '@/components/safety/ErrorBoundary'
import { LoginPage } from '@/pages/LoginPage'

const PelaporHomePage = React.lazy(() =>
  import('@/pages/roles/PelaporHomePage').then((m) => ({ default: m.PelaporHomePage })),
)
const SupervisorHomePage = React.lazy(() =>
  import('@/pages/roles/SupervisorHomePage').then((m) => ({ default: m.SupervisorHomePage })),
)
const K3HomePage = React.lazy(() =>
  import('@/pages/roles/K3HomePage').then((m) => ({ default: m.K3HomePage })),
)
const AdminHomePage = React.lazy(() =>
  import('@/pages/roles/AdminHomePage').then((m) => ({ default: m.AdminHomePage })),
)
const ReportCasePage = React.lazy(() =>
  import('@/pages/ReportCasePage').then((m) => ({ default: m.ReportCasePage })),
)
const MyCasesPage = React.lazy(() =>
  import('@/pages/MyCasesPage').then((m) => ({ default: m.MyCasesPage })),
)
const MyActionsPage = React.lazy(() =>
  import('@/pages/MyActionsPage').then((m) => ({ default: m.MyActionsPage })),
)
const CasesQueuePage = React.lazy(() =>
  import('@/pages/CasesQueuePage').then((m) => ({ default: m.CasesQueuePage })),
)
const CaseDetailPage = React.lazy(() =>
  import('@/pages/CaseDetailPage').then((m) => ({ default: m.CaseDetailPage })),
)
const DashboardPage = React.lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
)
const MachineHistoryPage = React.lazy(() =>
  import('@/pages/MachineHistoryPage').then((m) => ({ default: m.MachineHistoryPage })),
)
const AuditLogsPage = React.lazy(() =>
  import('@/pages/AuditLogsPage').then((m) => ({ default: m.AuditLogsPage })),
)
const AdminMachinesPage = React.lazy(() =>
  import('@/pages/AdminMachinesPage').then((m) => ({ default: m.AdminMachinesPage })),
)
const AdminUsersPage = React.lazy(() =>
  import('@/pages/AdminUsersPage').then((m) => ({ default: m.AdminUsersPage })),
)
const AdminConfigPage = React.lazy(() =>
  import('@/pages/AdminConfigPage').then((m) => ({ default: m.AdminConfigPage })),
)

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 1
      },
      refetchOnWindowFocus: false,
    },
  },
})

function PageFallback() {
  return <SectionLoading label="Memuat halaman..." className="py-16" />
}

function HomeRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ground)] flex items-center justify-center p-6">
        <WaveformLoader label="Memuat SafetyLog..." />
      </div>
    )
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={roleHomePath(user.role)} replace />
}

function ShellPage({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <React.Suspense fallback={<PageFallback />}>{children}</React.Suspense>
    </AppShell>
  )
}

function QrResolveRedirect() {
  const { qrToken } = useParams<{ qrToken: string }>()
  return <Navigate to={`/report?qr=${encodeURIComponent(qrToken || '')}`} replace />
}

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <BrowserRouter>
              <Routes>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/qr/:qrToken" element={<QrResolveRedirect />} />
                <Route path="/" element={<HomeRedirect />} />

                {/* Role-Specific Home Workspaces */}
                <Route
                  path="/pelapor"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.pelaporHome}>
                      <ShellPage>
                        <PelaporHomePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/supervisor"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.supervisorHome}>
                      <ShellPage>
                        <SupervisorHomePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/k3"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.k3Home}>
                      <ShellPage>
                        <K3HomePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.adminHome}>
                      <ShellPage>
                        <AdminHomePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />

                {/* Capture & Personal Workflows */}
                <Route
                  path="/report"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.report}>
                      <ShellPage>
                        <ReportCasePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-cases"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.myCases}>
                      <ShellPage>
                        <MyCasesPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-actions"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.myActions}>
                      <ShellPage>
                        <MyActionsPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />

                {/* Case Detail */}
                <Route
                  path="/cases/:id"
                  element={
                    <ProtectedRoute>
                      <ShellPage>
                        <CaseDetailPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />

                {/* Supervisor, K3, Admin Operational Views */}
                <Route
                  path="/cases"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.casesQueue}>
                      <ShellPage>
                        <CasesQueuePage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.dashboard}>
                      <ShellPage>
                        <DashboardPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/machines/:id/cases"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.machineHistory}>
                      <ShellPage>
                        <MachineHistoryPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/audit-logs"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.auditLogs}>
                      <ShellPage>
                        <AuditLogsPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only */}
                <Route
                  path="/admin/machines"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.adminMachines}>
                      <ShellPage>
                        <AdminMachinesPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.adminUsers}>
                      <ShellPage>
                        <AdminUsersPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/config"
                  element={
                    <ProtectedRoute allowedRoles={ROUTE_ALLOWED_ROLES.adminConfig}>
                      <ShellPage>
                        <AdminConfigPage />
                      </ShellPage>
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </BrowserRouter>
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}
