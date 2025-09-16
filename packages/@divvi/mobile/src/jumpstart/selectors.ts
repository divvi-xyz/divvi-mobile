import { RootState } from 'src/redux/reducers'

export const jumpstartReclaimStatusSelector = (state: RootState) => {
  return state.jumpstart.reclaimStatus
}
