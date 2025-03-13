import { RootState } from 'src/redux/store'

export const depositStatusSelector = (state: RootState) => state.earn.depositStatus

export const depositTransactionSubmittedSelector = (state: RootState) =>
  state.earn.depositStatus === 'loading'

export const withdrawStatusSelector = (state: RootState) => state.earn.withdrawStatus
