import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import Signup from './pages/Signup'
import Login from './pages/Login'
import AdminLogin from './pages/AdminLogin'
import AdminPage from './pages/AdminPage'
import Dashboard from './pages/Dashboard'
import Appointments from './pages/Appointments'
import Services from './pages/Services'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import JobDetail from './pages/JobDetail'
import Settings from './pages/Settings'

function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/appointments" element={<Appointments />} />
              <Route path="/services" element={<Services />} />
              <Route path="/clients/active" element={<Clients filter="active" />} />
              <Route path="/clients/completed" element={<Clients filter="completed" />} />
              <Route path="/clients/lost" element={<Clients filter="lost" />} />
              <Route path="/clients/:id" element={<ClientDetail />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default function App() {
  return (<AuthProvider><AppRoutes /></AuthProvider>)
}
