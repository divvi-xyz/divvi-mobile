import { getDataSuffix } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import { PublicAppConfig } from 'src/public'
import { RootState, store } from 'src/redux/store'
import { Address } from 'viem'
import { getDivviData } from './register'
import { hasReferralSucceededSelector, selectReferrals } from './slice'

// Mock dependencies
jest.mock('src/appConfig')
jest.mock('@divvi/referral-sdk')
jest.mock('src/utils/Logger')
jest.mock('src/redux/store', () => ({
  store: {
    getState: jest.fn(),
  },
}))
jest.mock('./slice', () => ({
  hasReferralSucceededSelector: jest.fn(),
  selectReferrals: jest.fn(),
}))

describe('getDivviData', () => {
  const mockConsumer: Address = '0xconsumer123456789012345678901234567890123456'
  const mockProviders: Address[] = [
    '0xprovider1123456789012345678901234567890123456',
    '0xprovider2123456789012345678901234567890123456',
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAppConfig).mockReturnValue({
      divviProtocol: {
        divviId: mockConsumer,
        campaignIds: mockProviders,
      },
    } as PublicAppConfig)
  })

  it('should return null if no consumer or providers in config', () => {
    jest.mocked(getAppConfig).mockReturnValue({
      divviProtocol: {},
    } as PublicAppConfig)

    const result = getDivviData()
    expect(result).toBeNull()
  })

  it('should return null if referral is already successful', () => {
    jest.mocked(store.getState).mockReturnValue({} as RootState)
    jest.mocked(hasReferralSucceededSelector).mockReturnValue(true)

    const result = getDivviData()
    expect(result).toBeNull()
    expect(hasReferralSucceededSelector).toHaveBeenCalledWith({}, mockConsumer, mockProviders)
  })

  it('should return null if referral is pending', () => {
    jest.mocked(store.getState).mockReturnValue({} as RootState)
    jest.mocked(hasReferralSucceededSelector).mockReturnValue(false)

    const mockDataSuffix = 'mock-suffix'
    jest.mocked(getDataSuffix).mockReturnValue(mockDataSuffix)
    jest.mocked(selectReferrals).mockReturnValue({
      [mockDataSuffix]: {
        txHash: '0x123',
        chainId: 1,
        divviId: mockConsumer,
        campaignIds: mockProviders,
        status: 'pending',
      },
    })

    const result = getDivviData()
    expect(result).toBeNull()
    expect(selectReferrals).toHaveBeenCalledWith({})
    expect(getDataSuffix).toHaveBeenCalledWith({
      consumer: mockConsumer,
      providers: mockProviders,
    })
  })

  it('should return data suffix if referral is not yet successful and not pending', () => {
    jest.mocked(store.getState).mockReturnValue({} as RootState)
    jest.mocked(hasReferralSucceededSelector).mockReturnValue(false)
    jest.mocked(selectReferrals).mockReturnValue({})

    const mockDataSuffix = 'mock-suffix'
    jest.mocked(getDataSuffix).mockReturnValue(mockDataSuffix)

    const result = getDivviData()
    expect(result).toBe(mockDataSuffix)
    expect(getDataSuffix).toHaveBeenCalledWith({
      consumer: mockConsumer,
      providers: mockProviders,
    })
  })
})
