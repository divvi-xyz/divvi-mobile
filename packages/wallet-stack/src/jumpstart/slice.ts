import { PayloadAction, createSlice } from '@reduxjs/toolkit'
import { REHYDRATE, RehydrateAction } from 'redux-persist'
import { getRehydratePayload } from 'src/redux/persist-helper'
import { NetworkId, TokenAmount } from 'src/transactions/types'
import { SerializableTransactionRequest } from 'src/viem/preparedTransactionSerialization'

export interface JumpstarReclaimAction {
  reclaimTx: SerializableTransactionRequest
  networkId: NetworkId
  tokenAmount: TokenAmount
  depositTxHash: string
}

interface State {
  reclaimStatus: 'idle' | 'loading' | 'error' | 'success'
}

const initialState: State = {
  reclaimStatus: 'idle',
}

const slice = createSlice({
  name: 'jumpstart',
  initialState,
  reducers: {
    jumpstartReclaimFlowStarted: (state) => ({
      ...state,
      reclaimStatus: 'idle',
    }),
    jumpstartReclaimStarted: (state, _action: PayloadAction<JumpstarReclaimAction>) => ({
      ...state,
      reclaimStatus: 'loading',
    }),
    jumpstartReclaimSucceeded: (state) => ({
      ...state,
      reclaimStatus: 'success',
    }),
    jumpstartReclaimFailed: (state) => ({
      ...state,
      reclaimStatus: 'error',
    }),
    jumpstartReclaimErrorDismissed: (state) => ({
      ...state,
      reclaimStatus: 'idle',
    }),
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: RehydrateAction) => ({
      ...state,
      ...getRehydratePayload(action, 'jumpstart'),
      reclaimStatus: 'idle',
    }))
  },
})

export const {
  jumpstartReclaimFlowStarted,
  jumpstartReclaimStarted,
  jumpstartReclaimSucceeded,
  jumpstartReclaimFailed,
  jumpstartReclaimErrorDismissed,
} = slice.actions

export default slice.reducer
