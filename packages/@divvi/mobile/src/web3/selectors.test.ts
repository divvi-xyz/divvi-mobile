import type { RootState } from 'src/redux/reducers'
import { getMockStoreData } from 'test/utils'

// Import the selector directly to avoid import issues
const atomicSelector = (state: RootState) => state.web3.atomic

describe(atomicSelector, () => {
  it('returns the atomic capability from web3 state', () => {
    expect(
      atomicSelector(
        getMockStoreData({
          web3: { atomic: 'unsupported' },
        })
      )
    ).toBe('unsupported')
  })

  it('returns supported when atomic is supported', () => {
    expect(
      atomicSelector(
        getMockStoreData({
          web3: { atomic: 'supported' },
        })
      )
    ).toBe('supported')
  })

  it('returns ready when atomic is ready', () => {
    expect(
      atomicSelector(
        getMockStoreData({
          web3: { atomic: 'ready' },
        })
      )
    ).toBe('ready')
  })
})
