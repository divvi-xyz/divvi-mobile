import { atomicSelector } from 'src/web3/selectors'
import { getMockStoreData } from 'test/utils'

jest.mock('src/statsig', () => ({
  getDynamicConfigParams: jest.fn(),
}))

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
