import common from './common'
import patient from './patient'
import doctor from './doctor'
import modals from './modals'

export default { ...common, ...patient, ...doctor, ...modals } satisfies Record<string, string>
