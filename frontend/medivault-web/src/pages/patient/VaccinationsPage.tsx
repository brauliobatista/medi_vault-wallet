import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { getUser } from '../../hooks/useAuth'
import { getVaccinations } from '../../api/medical'

export default function VaccinationsPage() {
  const user = getUser()!
  const [vaccinations, setVaccinations] = useState<Record<string, unknown>[]>([])

  useEffect(() => { getVaccinations(user.id).then(setVaccinations) }, [user.id])

  return (
    <Layout>
      <p className="text-muted small mb-3">
        <i className="bi bi-info-circle me-1" />Esta informação é gerida pelo seu médico.
      </p>
      {vaccinations.length === 0 ? (
        <p className="text-muted">Sem registos de vacinação.</p>
      ) : (
        <div className="list-group shadow-sm">
          {vaccinations.map((v) => (
            <div key={String(v.id)} className="list-group-item">
              <div className="fw-semibold">{String(v.vaccineName)}</div>
              <small className="text-muted">
                {v.doseNumber ? `${v.doseNumber} · ` : ''}
                {String(v.administeredAt ?? '-')}
                {v.nextDueDate ? ` · Próxima: ${v.nextDueDate}` : ''}
                {v.institution ? ` · ${v.institution}` : ''}
              </small>
            </div>
          ))}
        </div>
      )}
    </Layout>
  )
}
