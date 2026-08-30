import { useEffect, useState } from 'react'
import type { AccessRequest } from '../types/access'

export interface AccessRequestsColumn {
  key: string
  label: string
  sortable?: boolean
  sortValue?: (row: AccessRequest) => string | number
  render: (row: AccessRequest) => React.ReactNode
}

interface Props {
  requests: AccessRequest[]
  columns: AccessRequestsColumn[]
  renderActions?: (row: AccessRequest) => React.ReactNode
  emptyMessage: string
  pageSize?: number
}

type SortDir = 'asc' | 'desc'

export default function AccessRequestsTable({ requests, columns, renderActions, emptyMessage, pageSize = 10 }: Props) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [requests])

  if (requests.length === 0) {
    return <p className="text-muted">{emptyMessage}</p>
  }

  const sortColumn = columns.find((c) => c.key === sortKey && c.sortable && c.sortValue)

  const sortedRequests = sortColumn
    ? [...requests].sort((a, b) => {
        const valueA = sortColumn.sortValue!(a)
        const valueB = sortColumn.sortValue!(b)
        const cmp = valueA < valueB ? -1 : valueA > valueB ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : requests

  const pageCount = Math.max(1, Math.ceil(sortedRequests.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * pageSize
  const pageRequests = sortedRequests.slice(start, start + pageSize)

  const handleSort = (column: AccessRequestsColumn) => {
    if (!column.sortable) return
    if (sortKey === column.key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(column.key)
      setSortDir('asc')
    }
  }

  return (
    <div>
      <div className="table-responsive shadow-sm">
        <table className="table table-hover align-middle mb-0 bg-white">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  role={column.sortable ? 'button' : undefined}
                  onClick={() => handleSort(column)}
                  className={column.sortable ? 'user-select-none' : undefined}
                >
                  {column.label}
                  {column.sortable && sortKey === column.key && (
                    <i className={`bi ms-1 ${sortDir === 'asc' ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                  )}
                </th>
              ))}
              {renderActions && <th />}
            </tr>
          </thead>
          <tbody>
            {pageRequests.map((row) => (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key}>{column.render(row)}</td>
                ))}
                {renderActions && (
                  <td className="text-end">
                    <div className="d-flex justify-content-end gap-2">{renderActions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <div className="d-flex justify-content-between align-items-center mt-2">
          <small className="text-muted">
            A mostrar {start + 1}–{Math.min(start + pageSize, sortedRequests.length)} de {sortedRequests.length}
          </small>
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item${currentPage === 1 ? ' disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(currentPage - 1)}>
                  Anterior
                </button>
              </li>
              {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => (
                <li key={p} className={`page-item${p === currentPage ? ' active' : ''}`}>
                  <button className="page-link" onClick={() => setPage(p)}>
                    {p}
                  </button>
                </li>
              ))}
              <li className={`page-item${currentPage === pageCount ? ' disabled' : ''}`}>
                <button className="page-link" onClick={() => setPage(currentPage + 1)}>
                  Seguinte
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  )
}
