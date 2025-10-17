import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getRehydratePayload, REHYDRATE, type RehydrateAction } from 'src/redux/persist-helper'
import type { Hex } from 'viem'

export type SendCallsBatch = {
  transactionHashes: Hex[]
  callsCount: number
  atomic: boolean
  expiresAt: number
}

interface State {
  batchById: Record<string, SendCallsBatch>
}

const initialState: State = {
  batchById: {},
}

function pruneExpired(batchById: State['batchById'], now: number) {
  const result: State['batchById'] = {}
  for (const [id, batch] of Object.entries(batchById || {})) {
    if (batch.expiresAt > now) {
      result[id] = batch
    }
  }
  return result
}

const slice = createSlice({
  name: 'sendCalls',
  initialState,
  reducers: {
    addBatch: (
      state,
      action: PayloadAction<{
        id: string
        transactionHashes: Hex[]
        callsCount: number
        atomic: boolean
        expiresAt: number
      }>
    ) => {
      const { id, transactionHashes, callsCount, atomic, expiresAt } = action.payload
      return {
        ...state,
        batchById: {
          ...state.batchById,
          [id]: { transactionHashes, callsCount, atomic, expiresAt },
        },
      }
    },
    pruneExpiredBatches: (state, action: PayloadAction<{ now: number }>) => ({
      ...state,
      batchById: pruneExpired(state.batchById, action.payload.now),
    }),
  },
  extraReducers: (builder) => {
    builder.addCase(REHYDRATE, (state, action: RehydrateAction) => {
      const persistedState = getRehydratePayload(action, 'sendCalls')

      const now = Date.now()
      return {
        ...state,
        ...persistedState,
        batchById: pruneExpired(persistedState.batchById ?? {}, now),
      }
    })
  },
})

export const { addBatch, pruneExpiredBatches } = slice.actions

export default slice.reducer
