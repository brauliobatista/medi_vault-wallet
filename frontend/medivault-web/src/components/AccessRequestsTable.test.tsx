import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import AccessRequestsTable, { type AccessRequestsColumn } from './AccessRequestsTable'
import type { AccessRequest } from '../types/access'

function makeRequest(overrides: Partial<AccessRequest>): AccessRequest {
  return {
    id: 1,
    status: 'approved',
    requestedAt: '2026-01-01T10:00:00',
    approvedAt: null,
    expiresAt: null,
    ...overrides,
  }
}

const columns: AccessRequestsColumn[] = [
  { key: 'doctorName', label: 'Médico', sortable: true, sortValue: (r) => r.doctorName ?? '', render: (r) => r.doctorName ?? '' },
  { key: 'requestedAt', label: 'Pedido em', sortable: true, sortValue: (r) => r.requestedAt, render: (r) => r.requestedAt.slice(0, 10) },
]

describe('AccessRequestsTable', () => {
  it('shows the empty message when there are no requests', () => {
    render(<AccessRequestsTable requests={[]} columns={columns} emptyMessage="Sem pedidos de acesso." />)

    expect(screen.getByText('Sem pedidos de acesso.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('sorts rows by a column when its header is clicked, toggling direction on repeat clicks', async () => {
    const user = userEvent.setup()
    const requests = [
      makeRequest({ id: 1, doctorName: 'Dr. Beatriz' }),
      makeRequest({ id: 2, doctorName: 'Dr. Ana' }),
      makeRequest({ id: 3, doctorName: 'Dr. Carlos' }),
    ]

    render(<AccessRequestsTable requests={requests} columns={columns} emptyMessage="Sem pedidos." />)

    const nameHeader = screen.getByText('Médico')
    await user.click(nameHeader)

    let rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Dr. Ana')
    expect(rows[2]).toHaveTextContent('Dr. Carlos')

    await user.click(nameHeader)

    rows = screen.getAllByRole('row').slice(1)
    expect(rows[0]).toHaveTextContent('Dr. Carlos')
    expect(rows[2]).toHaveTextContent('Dr. Ana')
  })

  it('paginates rows and resets to page 1 when the requests prop changes', async () => {
    const user = userEvent.setup()
    const manyRequests = Array.from({ length: 12 }, (_, i) =>
      makeRequest({ id: i + 1, doctorName: `Dr. ${i + 1}`, requestedAt: `2026-01-${String(i + 1).padStart(2, '0')}T10:00:00` }),
    )

    const { rerender } = render(<AccessRequestsTable requests={manyRequests} columns={columns} emptyMessage="Sem pedidos." />)

    expect(screen.getAllByRole('row')).toHaveLength(11) // header + 10 rows
    expect(screen.getByText('A mostrar 1–10 de 12')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Seguinte' }))

    expect(screen.getAllByRole('row')).toHaveLength(3) // header + 2 remaining rows
    expect(screen.getByText('Dr. 11')).toBeInTheDocument()

    rerender(<AccessRequestsTable requests={manyRequests.slice(0, 3)} columns={columns} emptyMessage="Sem pedidos." />)

    expect(screen.getByText('Dr. 1')).toBeInTheDocument()
  })
})
