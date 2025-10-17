import { selectBatch } from 'src/sendCalls/selectors'
import { getMockStoreData } from 'test/utils'

const NOW = 1_000_000_000_000

function getMockState() {
  return getMockStoreData({
    sendCalls: {
      batchById: {
        activeId: {
          transactionHashes: ['0x1', '0x2'],
          atomic: false,
          expiresAt: NOW + 5000,
        },
        expiredId: { transactionHashes: ['0x1'], atomic: false, expiresAt: NOW - 1 },
      },
    },
  })
}

describe('selectBatch', () => {
  it('returns the active batch', () => {
    const state = getMockState()
    expect(selectBatch(state, 'activeId', NOW)).toEqual({
      transactionHashes: ['0x1', '0x2'],
      atomic: false,
      expiresAt: NOW + 5000,
    })
  })

  it('returns undefined when id is missing', () => {
    const state = getMockState()
    expect(selectBatch(state, 'missingId', NOW)).toBeUndefined()
  })

  it('returns undefined when id is expired', () => {
    const state = getMockState()
    expect(selectBatch(state, 'expiredId', NOW)).toBeUndefined()
  })
})
