import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { getUser } from '../../hooks/useAuth'
import { getVaccinations } from '../../api/medical'

export default function VaccinationsPage() {
  const user = getUser()!
  const [vaccinations, setVaccinations] = useState<Record<string, unknown>[]>([])

  useEffect(() => { getVaccinations(user.id).then(setVaccinations) }, [user.id])

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h5 className="mb-3"><i className="bi bi-shield-plus me-2 text-info" />Vacinação</h5>
        <p className="text-muted small"><i className="bi bi-info-circle me-1" />Esta informação é gerida pelo seu médico.</p>
        {vaccinations.length === 0 ? (
          <p className="text-muted">Sem registos de vacinação.</p>
        ) : (
          <div className="list-group">
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
      </div>
    </>
  )
}
