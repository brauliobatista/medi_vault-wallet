import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import DoctorProfilePage from './DoctorProfilePage'
import { saveUser, getUser } from '../../hooks/useAuth'
import { getDoctorProfile, uploadDoctorPhoto, deleteDoctorPhoto } from '../../api/medical'
import { LanguageProvider } from '../../i18n/LanguageContext'

vi.mock('../../api/medical', () => ({
  getDoctorProfile: vi.fn(),
  updateDoctorProfile: vi.fn(),
  changeDoctorPassword: vi.fn(),
  uploadDoctorPhoto: vi.fn(),
  deleteDoctorPhoto: vi.fn(),
}))

const mockedGet = vi.mocked(getDoctorProfile)
const mockedUpload = vi.mocked(uploadDoctorPhoto)
const mockedDelete = vi.mocked(deleteDoctorPhoto)

function renderPage() {
  return render(
    <LanguageProvider>
      <MemoryRouter>
        <DoctorProfilePage />
      </MemoryRouter>
    </LanguageProvider>,
  )
}

const baseProfile = {
  id: '1',
  ordemMedicosId: 'OM12345',
  firstName: 'João',
  lastName: 'Costa',
  email: 'joao.costa@example.com',
  speciality: 'Cardiologia',
  institutionId: 'inst-1',
  institutionName: 'Hospital Central',
  nationalityName: 'Portuguesa',
}

describe('DoctorProfilePage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    saveUser({ id: '1', name: 'João Costa', role: 'Doctor' }, 'token')
  })

  it('shows the institution name, type badge, address and phone', async () => {
    mockedGet.mockResolvedValue({
      ...baseProfile,
      institutionType: 'hospital',
      institutionAddress: 'Rua A, 123',
      institutionPhone: '212345678',
    })

    renderPage()

    expect(await screen.findByText('Hospital Central')).toBeInTheDocument()
    expect(screen.getByText('Hospital')).toBeInTheDocument()
    expect(screen.getByText('Rua A, 123')).toBeInTheDocument()
    expect(screen.getByText('212345678')).toBeInTheDocument()
  })

  it('does not render the address/phone line when the institution has none', async () => {
    mockedGet.mockResolvedValue({
      ...baseProfile,
      institutionType: 'clinic',
      institutionAddress: null,
      institutionPhone: null,
    })

    renderPage()

    expect(await screen.findByText('Hospital Central')).toBeInTheDocument()
    expect(screen.getByText('Clínica')).toBeInTheDocument()
    expect(screen.queryByText(/Rua/)).not.toBeInTheDocument()
  })

  it('shows the initial letter and no Remover button when there is no photo', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile, photoUrl: null })

    renderPage()

    expect(await screen.findByText('J')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
  })

  it('uploads a photo from disk and syncs it into the stored user for the layout avatar', async () => {
    mockedGet
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: null })
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: '/uploads/doctor-photos/joao.jpg' })
    mockedUpload.mockResolvedValue({ photoUrl: '/uploads/doctor-photos/joao.jpg' })

    const { container } = renderPage()
    await screen.findByText('Hospital Central')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'foto.jpg', { type: 'image/jpeg' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledWith(file))
    expect(await screen.findByAltText('Foto de perfil')).toHaveAttribute('src', '/uploads/doctor-photos/joao.jpg')
    expect(getUser()?.photoUrl).toBe('/uploads/doctor-photos/joao.jpg')
  })

  it('shows an error message when the upload fails', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile, photoUrl: null })
    mockedUpload.mockRejectedValue(new Error('invalid file'))

    const { container } = renderPage()
    await screen.findByText('Hospital Central')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'malware.exe')
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText(/Não foi possível carregar a imagem/)).toBeInTheDocument()
  })

  it('removes the photo after confirming, clearing it from the stored user too', async () => {
    mockedGet
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: '/uploads/doctor-photos/joao.jpg' })
      .mockResolvedValueOnce({ ...baseProfile, photoUrl: null })
    mockedDelete.mockResolvedValue({} as never)
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    saveUser({ id: '1', name: 'João Costa', role: 'Doctor', photoUrl: '/uploads/doctor-photos/joao.jpg' }, 'token')

    renderPage()
    await screen.findByRole('button', { name: /Remover/ })

    fireEvent.click(screen.getByRole('button', { name: /Remover/ }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalled())
    expect(getUser()?.photoUrl).toBeNull()
  })

  it('opens the camera modal and closes it on cancel', async () => {
    mockedGet.mockResolvedValue({ ...baseProfile, photoUrl: null })
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getUserMedia: vi.fn().mockRejectedValue(new Error('no camera')) },
    })

    renderPage()
    await screen.findByText('Hospital Central')

    fireEvent.click(screen.getByRole('button', { name: /Usar câmara/ }))
    expect(await screen.findByText('Não foi possível aceder à câmara.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Não foi possível aceder à câmara.')).not.toBeInTheDocument()
  })
})
