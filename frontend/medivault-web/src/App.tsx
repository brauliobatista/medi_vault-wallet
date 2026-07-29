import { Routes, Route, Navigate } from 'react-router-dom'
import { getUser } from './hooks/useAuth'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/patient/DashboardPage'
import ProfilePage from './pages/patient/ProfilePage'
import MedicalHistoryPage from './pages/patient/MedicalHistoryPage'
import ExamsPage from './pages/patient/ExamsPage'
import HabitsPage from './pages/patient/HabitsPage'
import VaccinationsPage from './pages/patient/VaccinationsPage'
import AccessPage from './pages/patient/AccessPage'
import FamilyPage from './pages/patient/FamilyPage'
import DoctorDashboardPage from './pages/doctor/DoctorDashboardPage'
import PatientViewPage from './pages/doctor/PatientViewPage'
import DoctorProfilePage from './pages/doctor/DoctorProfilePage'
import DoctorAccessPage from './pages/doctor/DoctorAccessPage'

function RequireRole({ role, children }: { role: 'Patient' | 'Doctor'; children: React.ReactNode }) {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={user.role === 'Doctor' ? '/doctor' : '/dashboard'} replace />
  return <>{children}</>
}

export default function App() {
  const user = getUser()

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Patient routes */}
      <Route path="/dashboard" element={<RequireRole role="Patient"><DashboardPage /></RequireRole>} />
      <Route path="/profile" element={<RequireRole role="Patient"><ProfilePage /></RequireRole>} />
      <Route path="/medical-history" element={<RequireRole role="Patient"><MedicalHistoryPage /></RequireRole>} />
      <Route path="/exams" element={<RequireRole role="Patient"><ExamsPage /></RequireRole>} />
      <Route path="/habits" element={<RequireRole role="Patient"><HabitsPage /></RequireRole>} />
      <Route path="/vaccinations" element={<RequireRole role="Patient"><VaccinationsPage /></RequireRole>} />
      <Route path="/access" element={<RequireRole role="Patient"><AccessPage /></RequireRole>} />
      <Route path="/family" element={<RequireRole role="Patient"><FamilyPage /></RequireRole>} />

      {/* Doctor routes */}
      <Route path="/doctor" element={<RequireRole role="Doctor"><DoctorDashboardPage /></RequireRole>} />
      <Route path="/doctor/patient/:patientId" element={<RequireRole role="Doctor"><PatientViewPage /></RequireRole>} />
      <Route path="/doctor/profile" element={<RequireRole role="Doctor"><DoctorProfilePage /></RequireRole>} />
      <Route path="/doctor/access" element={<RequireRole role="Doctor"><DoctorAccessPage /></RequireRole>} />

      {/* Default redirect */}
      <Route path="*" element={
        user ? <Navigate to={user.role === 'Doctor' ? '/doctor' : '/dashboard'} replace /> : <Navigate to="/login" replace />
      } />
    </Routes>
  )
}
