import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { getAnalyticalExams, getImagingExams, getOptometryExams } from '../../api/medical'

type Tab = 'analytical' | 'imaging' | 'optometry'

export default function ExamsPage() {
  const user = getUser()!
  const [tab, setTab] = useState<Tab>('analytical')
  const [data, setData] = useState<unknown[]>([])

  useEffect(() => {
    if (tab === 'analytical') getAnalyticalExams(user.id).then(setData)
    if (tab === 'imaging') getImagingExams(user.id).then(setData)
    if (tab === 'optometry') getOptometryExams(user.id).then(setData)
  }, [tab, user.id])

  return (
    <Layout>
      <p className="text-muted small mb-3">
        <i className="bi bi-info-circle me-1" />Esta informação é gerida pelo seu médico.
      </p>
      <ul className="nav nav-tabs mb-3">
        {(['analytical', 'imaging', 'optometry'] as Tab[]).map((t) => (
          <li className="nav-item" key={t}>
            <button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t === 'analytical' ? 'Análises' : t === 'imaging' ? 'Imagiologia' : 'Optometria'}
            </button>
          </li>
        ))}
      </ul>
      {(data as Record<string, unknown>[]).length === 0 ? (
        <p className="text-muted">Sem registos.</p>
      ) : (
        <div className="list-group shadow-sm">
          {(data as Record<string, unknown>[]).map((item) => (
            <div key={String(item.id)} className="list-group-item">
              <div className="fw-semibold">
                {String(item.examDate ?? '-')}
                {item.examType ? ` · ${item.examType}` : ''}
                {item.laboratory ? ` · ${item.laboratory}` : ''}
                {item.bodyArea ? ` · ${item.bodyArea}` : ''}
              </div>
              {item.notes && <small className="text-muted d-block">{String(item.notes)}</small>}
              {item.reportText && <small className="text-muted d-block">{String(item.reportText)}</small>}
              {(item as { parameters?: unknown[] }).parameters?.length ? (
                <div className="mt-1">
                  {((item as { parameters: Record<string, unknown>[] }).parameters).map((p) => (
                    <span key={String(p.id)} className={`badge me-1 ${p.isAbnormal ? 'bg-danger' : 'bg-secondary'}`}>
                      {String(p.parameterName)}: {String(p.value)} {String(p.unit ?? '')}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
