import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { getUser } from '../../hooks/useAuth'
import { getSurgeries, getMedications, getAllergies } from '../../api/medical'

export default function MedicalHistoryPage() {
  const user = getUser()!
  const [tab, setTab] = useState<'surgeries' | 'medications' | 'allergies'>('surgeries')
  const [data, setData] = useState<unknown[]>([])

  useEffect(() => {
    if (tab === 'surgeries') getSurgeries(user.id).then(setData)
    if (tab === 'medications') getMedications(user.id).then(setData)
    if (tab === 'allergies') getAllergies(user.id).then(setData)
  }, [tab, user.id])

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h5 className="mb-3"><i className="bi bi-clipboard2-pulse me-2 text-danger" />Histórico Médico</h5>
        <p className="text-muted small"><i className="bi bi-info-circle me-1" />Esta informação é gerida pelo seu médico.</p>
        <ul className="nav nav-tabs mb-3">
          {(['surgeries', 'medications', 'allergies'] as const).map((t) => (
            <li className="nav-item" key={t}>
              <button className={`nav-link ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                {t === 'surgeries' ? 'Cirurgias' : t === 'medications' ? 'Medicação' : 'Alergias'}
              </button>
            </li>
          ))}
        </ul>
        {(data as Record<string, unknown>[]).length === 0 ? (
          <p className="text-muted">Sem registos.</p>
        ) : (
          <div className="list-group">
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
      </div>
    </>
  )
}
