import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ExamesModal from './ExamesModal'
import {
  getAnalyticalExams, addAnalyticalExam,
  getImagingExams, addImagingExam,
  getOptometryExams, addOptometryExam,
} from '../api/medical'

vi.mock('../api/medical', () => ({
  getAnalyticalExams: vi.fn(),
  addAnalyticalExam: vi.fn(),
  getImagingExams: vi.fn(),
  addImagingExam: vi.fn(),
  getOptometryExams: vi.fn(),
  addOptometryExam: vi.fn(),
}))

const mockedGetAnalytical = vi.mocked(getAnalyticalExams)
const mockedAddAnalytical = vi.mocked(addAnalyticalExam)
const mockedGetImaging = vi.mocked(getImagingExams)
const mockedAddImaging = vi.mocked(addImagingExam)
const mockedGetOptometry = vi.mocked(getOptometryExams)
const mockedAddOptometry = vi.mocked(addOptometryExam)

const inputByLabel = (label: string) => screen.getByText(label).nextElementSibling as HTMLInputElement

function mockAllEmpty() {
  mockedGetAnalytical.mockResolvedValue([])
  mockedGetImaging.mockResolvedValue([])
  mockedGetOptometry.mockResolvedValue([])
}

describe('ExamesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('defaults to the analytical tab and shows its empty state', async () => {
    mockAllEmpty()

    render(<ExamesModal userId="u1" onClose={() => {}} />)

    expect(await screen.findByText('Sem exames analíticos.')).toBeInTheDocument()
  })

  it('switches to the imaging tab and lists imaging exams', async () => {
    mockAllEmpty()
    mockedGetImaging.mockResolvedValue([
      { id: 1, examType: 'Ecocardiograma', bodyArea: 'Coração', examDate: '2024-01-01', institution: 'Hospital X' },
    ])

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Imagem'))

    expect(await screen.findByText('Ecocardiograma')).toBeInTheDocument()
  })

  it('switches to the optometry tab and lists optometry exams', async () => {
    mockAllEmpty()
    mockedGetOptometry.mockResolvedValue([{ id: 1, examDate: '2024-01-01', rightSphere: -1.5, leftSphere: -1 }])

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Optometria'))

    expect(await screen.findByText('-1.5')).toBeInTheDocument()
  })

  it('adds an analytical exam and reloads the lists', async () => {
    mockAllEmpty()
    mockedAddAnalytical.mockResolvedValue({})

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Adicionar exame'))
    fireEvent.change(inputByLabel('Data'), { target: { value: '2024-01-01' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAddAnalytical).toHaveBeenCalledWith('u1', { examDate: '2024-01-01', laboratory: '', notes: '', parameters: [] }),
    )
  })

  it('does not add an analytical exam without a date', async () => {
    mockAllEmpty()

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Adicionar exame'))
    fireEvent.click(screen.getByText('Guardar'))

    expect(mockedAddAnalytical).not.toHaveBeenCalled()
  })

  it('adds an imaging exam requiring both exam type and date', async () => {
    mockAllEmpty()
    mockedAddImaging.mockResolvedValue({})

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Imagem'))
    fireEvent.click(screen.getByText('Adicionar exame'))
    fireEvent.change(screen.getByPlaceholderText('ex: Ecocardiograma'), { target: { value: 'RX Tórax' } })
    fireEvent.change(inputByLabel('Data'), { target: { value: '2024-02-01' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAddImaging).toHaveBeenCalledWith('u1', {
        examType: 'RX Tórax', bodyArea: '', examDate: '2024-02-01', institution: '', reportText: '',
      }),
    )
  })

  it('adds an optometry exam, converting sphere values to numbers', async () => {
    mockAllEmpty()
    mockedAddOptometry.mockResolvedValue({})

    render(<ExamesModal userId="u1" onClose={() => {}} />)
    await screen.findByText('Sem exames analíticos.')

    fireEvent.click(screen.getByText('Optometria'))
    fireEvent.click(screen.getByText('Adicionar exame'))
    fireEvent.change(inputByLabel('Data'), { target: { value: '2024-03-01' } })
    fireEvent.change(inputByLabel('Esfera direita'), { target: { value: '-1.5' } })
    fireEvent.click(screen.getByText('Guardar'))

    await waitFor(() =>
      expect(mockedAddOptometry).toHaveBeenCalledWith('u1', {
        examDate: '2024-03-01', rightSphere: -1.5, leftSphere: null, diseaseReport: '',
      }),
    )
  })
})
