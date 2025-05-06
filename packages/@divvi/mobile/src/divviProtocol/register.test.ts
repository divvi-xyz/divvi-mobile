import { getDataSuffix, submitReferral } from '@divvi/referral-sdk'
import { getAppConfig } from 'src/appConfig'
import { store } from 'src/redux/store'
import Logger from 'src/utils/Logger'
import { getDivviData, submitDivviReferralIfNeeded } from './register'
import { markReferralSuccessful, selectIsReferralSuccessful } from './slice'

// Mock dependencies
jest.mock('src/appConfig')
jest.mock('@divvi/referral-sdk')
jest.mock('src/utils/Logger')
jest.mock('src/redux/store', () => ({
  store: {
    getState: jest.fn(),
    dispatch: jest.fn(),
  },
}))
jest.mock('./slice', () => ({
  selectIsReferralSuccessful: jest.fn(),
  markReferralSuccessful: jest.fn((payload) => ({
    type: 'divviProtocol/markReferralSuccessful',
    payload,
  })),
}))

describe('getDivviData', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890'
  const mockConsumer = '0xconsumer123456789012345678901234567890123456'
  const mockProviders = [
    '0xprovider1123456789012345678901234567890123456',
    '0xprovider2123456789012345678901234567890123456',
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(getAppConfig as jest.Mock).mockReturnValue({
      divviProtocol: {
        divviId: mockConsumer,
        campaignIds: mockProviders,
      },
    })
  })

  it('should return empty string if no consumer or providers in config', async () => {
    ;(getAppConfig as jest.Mock).mockReturnValue({
      divviProtocol: {},
    })

    const result = await getDivviData({ walletAddress: mockWalletAddress })
    expect(result).toBe('')
  })

  it('should return empty string if referral is already successful', async () => {
    ;(store.getState as jest.Mock).mockReturnValue({})
    ;(selectIsReferralSuccessful as jest.Mock).mockReturnValue(true)

    const result = await getDivviData({ walletAddress: mockWalletAddress })
    expect(result).toBe('')
    expect(selectIsReferralSuccessful).toHaveBeenCalledWith({}, mockConsumer, mockProviders)
  })

  it('should return data suffix if referral is not yet successful', async () => {
    ;(store.getState as jest.Mock).mockReturnValue({})
    ;(selectIsReferralSuccessful as jest.Mock).mockReturnValue(false)

    const mockDataSuffix = 'mock-suffix'
    ;(getDataSuffix as jest.Mock).mockReturnValue(mockDataSuffix)

    const result = await getDivviData({ walletAddress: mockWalletAddress })
    expect(result).toBe(mockDataSuffix)
    expect(getDataSuffix).toHaveBeenCalledWith({
      consumer: mockConsumer,
      providers: mockProviders,
    })
  })
})

describe('submitDivviReferralIfNeeded', () => {
  const mockWalletAddress = '0x1234567890123456789012345678901234567890'
  const mockTxHash = '0xtxhash123456789012345678901234567890123456'
  const mockChainId = 10
  const mockConsumer = '0xconsumer123456789012345678901234567890123456'
  const mockProviders = [
    '0xprovider1123456789012345678901234567890123456',
    '0xprovider2123456789012345678901234567890123456',
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    ;(getAppConfig as jest.Mock).mockReturnValue({
      divviProtocol: {
        divviId: mockConsumer,
        campaignIds: mockProviders,
      },
    })
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should not submit referral if no consumer or providers in config', async () => {
    ;(getAppConfig as jest.Mock).mockReturnValue({
      divviProtocol: {},
    })

    await submitDivviReferralIfNeeded({
      walletAddress: mockWalletAddress,
      txHash: mockTxHash,
      chainId: mockChainId,
      transactionRequest: { data: '0x123' },
    })

    expect(submitReferral).not.toHaveBeenCalled()
  })

  it('should not submit referral if transaction data does not end with divvi suffix', async () => {
    const mockDataSuffix = 'mock-suffix'
    ;(getDataSuffix as jest.Mock).mockReturnValue(mockDataSuffix)

    await submitDivviReferralIfNeeded({
      walletAddress: mockWalletAddress,
      txHash: mockTxHash,
      chainId: mockChainId,
      transactionRequest: { data: '0x123' },
    })

    expect(submitReferral).not.toHaveBeenCalled()
  })

  it('should submit referral and mark as successful if transaction data ends with divvi suffix', async () => {
    const mockDataSuffix = 'mock-suffix'
    ;(getDataSuffix as jest.Mock).mockReturnValue(mockDataSuffix)
    ;(submitReferral as jest.Mock).mockResolvedValue(undefined)

    await submitDivviReferralIfNeeded({
      walletAddress: mockWalletAddress,
      txHash: mockTxHash,
      chainId: mockChainId,
      transactionRequest: { data: `0x123${mockDataSuffix}` },
    })

    expect(submitReferral).toHaveBeenCalledWith({
      txHash: mockTxHash,
      chainId: mockChainId,
    })
    expect(store.dispatch).toHaveBeenCalledWith(
      markReferralSuccessful({
        divviId: mockConsumer,
        campaignIds: mockProviders,
      })
    )
  })

  it('should retry submission if first attempt fails with retry error', async () => {
    const mockDataSuffix = 'mock-suffix'
    ;(getDataSuffix as jest.Mock).mockReturnValue(mockDataSuffix)
    ;(submitReferral as jest.Mock)
      .mockRejectedValueOnce(new Error('Client should retry the request'))
      .mockResolvedValueOnce(undefined)

    const promise = submitDivviReferralIfNeeded({
      walletAddress: mockWalletAddress,
      txHash: mockTxHash,
      chainId: mockChainId,
      transactionRequest: { data: `0x123${mockDataSuffix}` },
    })

    // Fast-forward timers
    await jest.runAllTimersAsync()
    await promise

    expect(submitReferral).toHaveBeenCalledTimes(2)
    expect(store.dispatch).toHaveBeenCalledWith(
      markReferralSuccessful({
        divviId: mockConsumer,
        campaignIds: mockProviders,
      })
    )
  })

  it('should handle errors in submitReferral gracefully', async () => {
    const mockDataSuffix = 'mock-suffix'
    ;(getDataSuffix as jest.Mock).mockReturnValue(mockDataSuffix)
    ;(submitReferral as jest.Mock).mockRejectedValue(new Error('Submit failed'))

    await submitDivviReferralIfNeeded({
      walletAddress: mockWalletAddress,
      txHash: mockTxHash,
      chainId: mockChainId,
      transactionRequest: { data: `0x123${mockDataSuffix}` },
    })

    expect(Logger.error).toHaveBeenCalledWith(
      'DivviProtocol',
      `Error submitting referral for consumer ${mockConsumer} referring the user ${mockWalletAddress} to ${mockProviders.join(', ')}`,
      expect.any(Error)
    )
  })
})
