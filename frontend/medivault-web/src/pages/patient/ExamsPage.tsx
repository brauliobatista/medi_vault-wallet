import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { getAnalyticalExams, getImagingExams, getOptometryExams } from '../../api/medical'
import { useTranslation } from '../../i18n/LanguageContext'

type Tab = 'analytical' | 'imaging' | 'optometry'

export default function ExamsPage() {
  const user = getUser()!
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('analytical')
  const [data, setData] = useState<unknown[]>([])

  useEffect(() => {
    if (tab === 'analytical') getAnalyticalExams(user.id).then(setData)
    if (tab === 'imaging') getImagingExams(user.id).then(setData)
    if (tab === 'optometry') getOptometryExams(user.id).then(setData)
  }, [tab, user.id])

  const tabLabels: Record<Tab, string> = {
    analytical: t('exams.tabAnalytical'),
    imaging: t('exams.tabImaging'),
    optometry: t('exams.tabOptometry'),
  }

  return (
    <Layout>
      <p className="text-muted small mb-3">
        <i className="bi bi-info-circle me-1" />{t('patient.infoManagedByDoctor')}
      </p>
      <ul className="nav nav-tabs mb-3">
        {(['analytical', 'imaging', 'optometry'] as Tab[]).map((tk) => (
          <li className="nav-item" key={tk}>
            <button className={`nav-link ${tab === tk ? 'active' : ''}`} onClick={() => setTab(tk)}>
              {tabLabels[tk]}
            </button>
          </li>
        ))}
      </ul>
      {(data as Record<string, unknown>[]).length === 0 ? (
        <p className="text-muted">{t('patient.noRecords')}</p>
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
              {Boolean(item.notes) && <small className="text-muted d-block">{String(item.notes)}</small>}
              {Boolean(item.reportText) && <small className="text-muted d-block">{String(item.reportText)}</small>}
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
