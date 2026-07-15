import { useEffect, useState } from 'react'
import Navbar from '../../components/Navbar'
import { getUser } from '../../hooks/useAuth'
import { getHabits } from '../../api/medical'

const habitLabels: Record<string, string> = {
  alcohol: 'Álcool', tobacco: 'Tabaco', drugs: 'Drogas',
  gambling: 'Jogo', physical_activity: 'Atividade Física',
}

export default function HabitsPage() {
  const user = getUser()!
  const [habits, setHabits] = useState<Record<string, unknown>[]>([])

  useEffect(() => { getHabits(user.id).then(setHabits) }, [user.id])

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h5 className="mb-3"><i className="bi bi-heart me-2 text-success" />Hábitos de Saúde</h5>
        <p className="text-muted small"><i className="bi bi-info-circle me-1" />Esta informação é gerida pelo seu médico.</p>
        {habits.length === 0 ? (
          <p className="text-muted">Sem registos.</p>
        ) : (
          <div className="row g-3">
            {habits.map((h) => (
              <div className="col-md-6" key={String(h.id)}>
                <div className="card">
                  <div className="card-header fw-semibold">
                    {habitLabels[String(h.type)] ?? String(h.type)}
                  </div>
                  <div className="card-body">
                    <dl className="mb-0 row">
                      {h.name && <><dt className="col-5 small text-muted">Tipo</dt><dd className="col-7 small">{String(h.name)}</dd></>}
                      {h.frequency && <><dt className="col-5 small text-muted">Frequência</dt><dd className="col-7 small">{String(h.frequency)}</dd></>}
                      {h.quantity && <><dt className="col-5 small text-muted">Quantidade</dt><dd className="col-7 small">{String(h.quantity)}</dd></>}
                      {h.startDate && <><dt className="col-5 small text-muted">Desde</dt><dd className="col-7 small">{String(h.startDate)}</dd></>}
                    </dl>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
