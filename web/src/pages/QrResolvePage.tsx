import { Navigate, useParams } from 'react-router-dom'

export function QrResolvePage() {
  const { qrToken } = useParams<{ qrToken: string }>()
  if (!qrToken) {
    return <Navigate to="/report" replace />
  }
  return <Navigate to={`/report?qr=${encodeURIComponent(qrToken)}`} replace />
}
