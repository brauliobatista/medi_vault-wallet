import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import type { AxiosResponse } from 'axios'
import DocumentsModal from './DocumentsModal'
import { getDocuments, uploadDocument, deleteDocument } from '../api/medical'
import { LanguageProvider } from '../i18n/LanguageContext'

vi.mock('../api/medical', () => ({
  getDocuments: vi.fn(),
  uploadDocument: vi.fn(),
  deleteDocument: vi.fn(),
}))

const mockedGet = vi.mocked(getDocuments)
const mockedUpload = vi.mocked(uploadDocument)
const mockedDelete = vi.mocked(deleteDocument)
const fakeAxiosResponse = {} as AxiosResponse

describe('DocumentsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows an empty state when there are no documents', async () => {
    mockedGet.mockResolvedValue([])

    render(<LanguageProvider><DocumentsModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText('Sem documentos associados.')).toBeInTheDocument()
  })

  it('lists documents with file name and uploader', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, fileName: 'exame.pdf', fileType: 'pdf', fileUrl: '/uploads/exame.pdf', uploadedAt: '2024-01-01T10:00:00', uploadedByName: 'Dr. João Costa' },
    ])

    render(<LanguageProvider><DocumentsModal userId="u1" onClose={() => {}} /></LanguageProvider>)

    expect(await screen.findByText('exame.pdf')).toBeInTheDocument()
    expect(screen.getByText(/Dr\. João Costa/)).toBeInTheDocument()
  })

  it('uploads the selected file and reloads the list', async () => {
    mockedGet.mockResolvedValue([])
    mockedUpload.mockResolvedValue({})
    const { container } = render(<LanguageProvider><DocumentsModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('Sem documentos associados.')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'exame.pdf', { type: 'application/pdf' })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => expect(mockedUpload).toHaveBeenCalledWith('u1', file))
    expect(mockedGet).toHaveBeenCalledTimes(2)
  })

  it('shows an error message when the upload fails', async () => {
    mockedGet.mockResolvedValue([])
    mockedUpload.mockRejectedValue({ response: { data: { message: 'Ficheiro inválido.' } } })
    const { container } = render(<LanguageProvider><DocumentsModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('Sem documentos associados.')

    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['conteudo'], 'malware.exe')
    fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Ficheiro inválido.')).toBeInTheDocument()
  })

  it('deletes a document after confirming', async () => {
    mockedGet.mockResolvedValue([
      { id: 1, fileName: 'exame.pdf', fileType: 'pdf', fileUrl: '/uploads/exame.pdf', uploadedAt: '2024-01-01T10:00:00', uploadedByName: null },
    ])
    mockedDelete.mockResolvedValue(fakeAxiosResponse)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    render(<LanguageProvider><DocumentsModal userId="u1" onClose={() => {}} /></LanguageProvider>)
    await screen.findByText('exame.pdf')

    fireEvent.click(screen.getByRole('button', { name: '' }))

    await waitFor(() => expect(mockedDelete).toHaveBeenCalledWith('u1', 1))
  })
})
