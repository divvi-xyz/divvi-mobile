import reducer, {
  jumpstartReclaimErrorDismissed,
  jumpstartReclaimFailed,
  jumpstartReclaimStarted,
  jumpstartReclaimSucceeded,
} from 'src/jumpstart/slice'
import { NetworkId } from 'src/transactions/types'

describe('Wallet Jumpstart', () => {
  it('should handle jumpstart reclaim start', () => {
    const updatedState = reducer(
      undefined,
      jumpstartReclaimStarted({
        reclaimTx: {
          from: '0x1',
          to: '0x2',
          value: '0x3',
          data: '0x4',
          gas: '0x5',
        },
        networkId: NetworkId['celo-alfajores'],
        tokenAmount: {
          value: 1000,
          tokenAddress: '0x123',
          tokenId: 'celo-alfajores:0x123',
        },
        depositTxHash: '0xaaa',
      })
    )

    expect(updatedState).toHaveProperty('reclaimStatus', 'loading')
  })

  it('should handle jumpstart reclaim success', () => {
    const updatedState = reducer(undefined, jumpstartReclaimSucceeded())

    expect(updatedState).toHaveProperty('reclaimStatus', 'success')
  })

  it('should handle jumpstart reclaim failure', () => {
    const updatedState = reducer(undefined, jumpstartReclaimFailed())

    expect(updatedState).toHaveProperty('reclaimStatus', 'error')
  })

  it('should handle jumpstart reclaim error dismiss', () => {
    const updatedState = reducer(undefined, jumpstartReclaimErrorDismissed())

    expect(updatedState).toHaveProperty('reclaimStatus', 'idle')
  })
})
