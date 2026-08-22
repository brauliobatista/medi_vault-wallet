import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { getSurgeries, getMedications, getAllergies } from '../../api/medical'
import { useTranslation } from '../../i18n/LanguageContext'

export default function MedicalHistoryPage() {
  const user = getUser()!
  const { t } = useTranslation()
  const [tab, setTab] = useState<'surgeries' | 'medications' | 'allergies'>('surgeries')
  const [data, setData] = useState<unknown[]>([])

  useEffect(() => {
    if (tab === 'surgeries') getSurgeries(user.id).then(setData)
    if (tab === 'medications') getMedications(user.id).then(setData)
    if (tab === 'allergies') getAllergies(user.id).then(setData)
  }, [tab, user.id])

  const tabLabels = {
    surgeries: t('medicalHistory.tabSurgeries'),
    medications: t('medicalHistory.tabMedications'),
    allergies: t('medicalHistory.tabAllergies'),
  }

  return (
    <Layout>
      <p className="text-muted small mb-3">
        <i className="bi bi-info-circle me-1" />{t('patient.infoManagedByDoctor')}
      </p>
      <ul className="nav nav-tabs mb-3">
        {(['surgeries', 'medications', 'allergies'] as const).map((tk) => (
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
              <div className="fw-semibold">{String(item.surgeryName ?? item.activeSubstance ?? '-')}</div>
              <small className="text-muted">
                {String(item.surgeryDate ?? item.startDate ?? item.createdAt ?? '')}
                {item.dose ? ` · ${item.dose}` : ''}
                {item.severity ? ` · ${item.severity}` : ''}
                {item.posology ? ` · ${item.posology}` : ''}
              </small>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
