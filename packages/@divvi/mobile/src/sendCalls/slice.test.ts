import { REHYDRATE } from 'src/redux/persist-helper'
import reducer, { addBatch, pruneExpiredBatches } from 'src/sendCalls/slice'

const NOW = 1_000_000_000_000

beforeEach(() => {
  jest.useFakeTimers()
  jest.setSystemTime(NOW)
})

afterEach(() => {
  jest.useRealTimers()
})

describe('sendCalls reducer', () => {
  it('addBatch stores a new batch entry', () => {
    const state = reducer(
      undefined,
      addBatch({
        id: 'test',
        transactionHashes: ['0x1', '0x2'],
        callsCount: 2,
        atomic: false,
        expiresAt: NOW + 1000,
      })
    )

    expect(state.batchById['test']).toEqual({
      transactionHashes: ['0x1', '0x2'],
      callsCount: 2,
      atomic: false,
      expiresAt: NOW + 1000,
    })
  })

  it('pruneExpiredBatches removes expired entries only', () => {
    const state = reducer(
      undefined,
      addBatch({
        id: 'keep',
        transactionHashes: ['0x1'],
        callsCount: 1,
        atomic: false,
        expiresAt: NOW + 1000,
      })
    )
    const stateWithExpired = reducer(
      state,
      addBatch({
        id: 'drop',
        transactionHashes: ['0x2'],
        callsCount: 1,
        atomic: false,
        expiresAt: NOW - 1,
      })
    )
    const pruned = reducer(stateWithExpired, pruneExpiredBatches({ now: NOW }))

    expect(pruned.batchById['keep']).toEqual({
      transactionHashes: ['0x1'],
      callsCount: 1,
      atomic: false,
      expiresAt: NOW + 1000,
    })
    expect(pruned.batchById['drop']).toBeUndefined()
  })

  it('REHYDRATE merges and prunes persisted state', () => {
    const persisted = {
      sendCalls: {
        batchById: {
          keep: { transactionHashes: ['0x1'], callsCount: 1, atomic: false, expiresAt: NOW + 1000 },
          drop: { transactionHashes: ['0x2'], callsCount: 1, atomic: false, expiresAt: NOW - 1 },
        },
      },
    }
    const rehydrated = reducer(undefined, {
      type: REHYDRATE,
      key: 'root',
      payload: persisted,
    })

    expect(rehydrated.batchById['keep']).toEqual({
      transactionHashes: ['0x1'],
      callsCount: 1,
      atomic: false,
      expiresAt: NOW + 1000,
    })
    expect(rehydrated.batchById['drop']).toBeUndefined()
  })
})
