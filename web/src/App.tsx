import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, roleHomePath, useAuth } from '@/lib/auth'
import { ThemeProvider } from '@/lib/theme'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { LoginPage } from '@/pages/LoginPage'
import { QrResolvePage } from '@/pages/QrResolvePage'
import { PelaporHomePage } from '@/pages/roles/PelaporHomePage'
import { SupervisorHomePage } from '@/pages/roles/SupervisorHomePage'
import { K3HomePage } from '@/pages/roles/K3HomePage'
import { AdminHomePage } from '@/pages/roles/AdminHomePage'
import { ReportCasePage } from '@/pages/ReportCasePage'
import { MyCasesPage } from '@/pages/MyCasesPage'
import { MyActionsPage } from '@/pages/MyActionsPage'
import { CasesQueuePage } from '@/pages/CasesQueuePage'
import { CaseDetailPage } from '@/pages/CaseDetailPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MachineHistoryPage } from '@/pages/MachineHistoryPage'
import { AuditLogsPage } from '@/pages/AuditLogsPage'
import { AdminMachinesPage } from '@/pages/AdminMachinesPage'
import { AdminUsersPage } from '@/pages/AdminUsersPage'
import { AdminConfigPage } from '@/pages/AdminConfigPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

function HomeRedirect() {
  const { user, isLoading, isAuthenticated } = useAuth()
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--ground)] flex items-center justify-center text-[13px] text-[var(--faint)]">
        Memuat SafetyLog...
      </div>
    )
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={roleHomePath(user.role)} replace />
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/qr/:qrToken" element={<QrResolvePage />} />
            <Route path="/" element={<HomeRedirect />} />

            {/* Role-Specific Home Workspaces */}
            <Route
              path="/pelapor"
              element={
                <ProtectedRoute allowedRoles={['reporter', 'admin']}>
                  <AppShell>
                    <PelaporHomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/supervisor"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'admin']}>
                  <AppShell>
                    <SupervisorHomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/k3"
              element={
                <ProtectedRoute allowedRoles={['hse', 'admin']}>
                  <AppShell>
                    <K3HomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppShell>
                    <AdminHomePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Capture & Personal Workflows (Role-Specific) */}
            <Route
              path="/report"
              element={
                <ProtectedRoute allowedRoles={['reporter']}>
                  <AppShell>
                    <ReportCasePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-cases"
              element={
                <ProtectedRoute allowedRoles={['reporter']}>
                  <AppShell>
                    <MyCasesPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-actions"
              element={
                <ProtectedRoute allowedRoles={['reporter', 'supervisor']}>
                  <AppShell>
                    <MyActionsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Case Detail (Accessible to authorized roles & reporter of own case) */}
            <Route
              path="/cases/:id"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <CaseDetailPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Supervisor, K3, Admin Operational Views */}
            <Route
              path="/cases"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'hse', 'admin']}>
                  <AppShell>
                    <CasesQueuePage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'hse', 'admin']}>
                  <AppShell>
                    <DashboardPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/machines/:id/cases"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'hse', 'admin']}>
                  <AppShell>
                    <MachineHistoryPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <ProtectedRoute allowedRoles={['supervisor', 'hse', 'admin']}>
                  <AppShell>
                    <AuditLogsPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            {/* Admin Only */}
            <Route
              path="/admin/machines"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppShell>
                    <AdminMachinesPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppShell>
                    <AdminUsersPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/config"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AppShell>
                    <AdminConfigPage />
                  </AppShell>
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
    </ThemeProvider>
  )
}
