import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import LoginPage from './LoginPage'
import { patientLogin, doctorLogin } from '../api/auth'
import { getUser } from '../hooks/useAuth'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../api/auth', () => ({
  patientLogin: vi.fn(),
  doctorLogin: vi.fn(),
}))

const mockedPatientLogin = vi.mocked(patientLogin)
const mockedDoctorLogin = vi.mocked(doctorLogin)

const fieldByLabel = (label: string) => screen.getByText(label).nextElementSibling as HTMLInputElement

function renderLoginPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Página do paciente</div>} />
          <Route path="/doctor" element={<div>Página do médico</div>} />
        </Routes>
      </MemoryRouter>
    </LanguageProvider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('logs in a patient and navigates to the patient dashboard', async () => {
    mockedPatientLogin.mockResolvedValue({ token: 'jwt', role: 'Patient', id: '1', name: 'Ana Silva', language: 'pt' })

    renderLoginPage()
    fireEvent.change(fieldByLabel('Número de Utente'), { target: { value: '111222333' } })
    fireEvent.change(fieldByLabel('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))

    expect(await screen.findByText('Página do paciente')).toBeInTheDocument()
    expect(mockedPatientLogin).toHaveBeenCalledWith('111222333', 'correct-horse')
    expect(getUser()).toEqual({ id: '1', name: 'Ana Silva', role: 'Patient' })
  })

  it('logs in a doctor via the doctor tab and navigates to the doctor area', async () => {
    mockedDoctorLogin.mockResolvedValue({ token: 'jwt', role: 'Doctor', id: 'd1', name: 'Dr. João Costa', language: 'pt' })

    renderLoginPage()
    fireEvent.click(screen.getByRole('button', { name: /Médico/ }))
    fireEvent.change(fieldByLabel('Nº Ordem dos Médicos'), { target: { value: 'OM123' } })
    fireEvent.change(fieldByLabel('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))

    expect(await screen.findByText('Página do médico')).toBeInTheDocument()
    expect(mockedDoctorLogin).toHaveBeenCalledWith('OM123', 'correct-horse')
  })

  it('shows an error message and does not navigate when credentials are invalid', async () => {
    mockedPatientLogin.mockRejectedValue(new Error('unauthorized'))

    renderLoginPage()
    fireEvent.change(fieldByLabel('Número de Utente'), { target: { value: '111222333' } })
    fireEvent.change(fieldByLabel('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))

    expect(await screen.findByText('Credenciais inválidas. Verifique e tente novamente.')).toBeInTheDocument()
    expect(getUser()).toBeNull()
  })

  it('clears the form and error when switching tabs', async () => {
    mockedPatientLogin.mockRejectedValue(new Error('unauthorized'))

    renderLoginPage()
    fireEvent.change(fieldByLabel('Número de Utente'), { target: { value: '111222333' } })
    fireEvent.change(fieldByLabel('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))
    await screen.findByText('Credenciais inválidas. Verifique e tente novamente.')

    fireEvent.click(screen.getByRole('button', { name: /Médico/ }))

    expect(screen.queryByText('Credenciais inválidas. Verifique e tente novamente.')).not.toBeInTheDocument()
    expect(fieldByLabel('Nº Ordem dos Médicos')).toHaveValue('')
  })

  it('waits for the request to resolve before allowing another submit', async () => {
    let resolveLogin: (v: { token: string; role: 'Patient'; id: string; name: string; language: string }) => void = () => {}
    mockedPatientLogin.mockReturnValue(new Promise((resolve) => { resolveLogin = resolve }))

    renderLoginPage()
    fireEvent.change(fieldByLabel('Número de Utente'), { target: { value: '111222333' } })
    fireEvent.change(fieldByLabel('Password'), { target: { value: 'correct-horse' } })
    fireEvent.click(screen.getByRole('button', { name: /Entrar/ }))

    expect(screen.getByRole('button', { name: /Entrar/ })).toBeDisabled()

    resolveLogin({ token: 'jwt', role: 'Patient', id: '1', name: 'Ana Silva', language: 'pt' })
    await waitFor(() => expect(screen.getByRole('button', { name: /Entrar/ })).not.toBeDisabled())
  })
})
