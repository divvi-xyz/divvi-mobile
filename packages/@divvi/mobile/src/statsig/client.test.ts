import { StatsigClientRN } from '@statsig/react-native-bindings'
import StatsigClientSingleton from './client'

jest.mock('@statsig/react-native-bindings')
jest.mock('src/statsig/selector', () => ({
  getDefaultStatsigUser: jest.fn().mockReturnValue({
    userID: 'test-user-id',
    custom: {},
  }),
}))
jest.mock('src/utils/Logger')
jest.mock('src/config', () => ({
  STATSIG_ENABLED: jest.fn().mockReturnValue(true),
  STATSIG_API_KEY: 'test-api-key',
  STATSIG_ENV: 'test',
}))

describe('StatsigClient', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(StatsigClientRN.prototype, 'initializeAsync').mockResolvedValue({
      success: true,
      duration: 0,
      source: 'Network',
      error: null,
      sourceUrl: 'test',
    })
    jest.spyOn(StatsigClientRN.prototype, 'updateUserAsync').mockResolvedValue({
      success: true,
      duration: 0,
      source: 'Network',
      error: null,
      sourceUrl: 'test',
    })
  })

  it('should throw an error if not initialized', () => {
    expect(() => StatsigClientSingleton.getInstance()).toThrow(
      'StatsigClient not initialized. Call initialize() first.'
    )
  })

  it('should initialize the client', async () => {
    await StatsigClientSingleton.initialize()
    const client = StatsigClientSingleton.getInstance()
    expect(client).toBeDefined()
    expect(client).toBeInstanceOf(StatsigClientRN)
  })

  it('updates user', async () => {
    await StatsigClientSingleton.updateUser({
      userID: 'test-user-id',
      custom: { test: 'test' },
      customIDs: { stableID: 'custom-stable-id' },
    })
    expect(StatsigClientRN.prototype.updateUserAsync).toHaveBeenCalledWith({
      userID: 'test-user-id',
      custom: { test: 'test' },
      customIDs: { stableID: 'custom-stable-id' },
    })
  })
})
