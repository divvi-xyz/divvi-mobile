import { StatsigClientRN } from '@statsig/react-native-bindings'
import { LaunchArguments } from 'react-native-launch-arguments'
import * as config from 'src/config'
import { store } from 'src/redux/store'
import { DynamicConfigs, ExperimentConfigs } from 'src/statsig/constants'
import {
  _getGateOverrides,
  getDynamicConfigParams,
  getExperimentParams,
  getFeatureGate,
  patchUpdateStatsigUser,
  setupOverridesFromLaunchArgs,
} from 'src/statsig/index'
import { StatsigDynamicConfigs, StatsigExperiments, StatsigFeatureGates } from 'src/statsig/types'
import Logger from 'src/utils/Logger'
import { getMockStoreData } from 'test/utils'
import StatsigClientSingleton from './client'

jest.mock('src/redux/store', () => ({ store: { getState: jest.fn() } }))
jest.mock('src/utils/Logger')
jest.mock('./client')

const mockConfig = jest.mocked(config)
const mockStore = jest.mocked(store)
const MOCK_ACCOUNT = '0x000000000000000000000000000000000000000000'
const MOCK_START_ONBOARDING_TIME = 1680563877

mockStore.getState.mockImplementation(() =>
  getMockStoreData({
    web3: { account: MOCK_ACCOUNT },
    account: { startOnboardingTime: MOCK_START_ONBOARDING_TIME },
  })
)

describe('Statsig helpers', () => {
  let mockInstance: {
    getDynamicConfig: jest.Mock
    getExperiment: jest.Mock
    checkGate: jest.Mock
    updateUser: jest.Mock
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    mockConfig.STATSIG_ENABLED = true
    // Reset gate overrides before each test
    jest.mocked(LaunchArguments.value).mockReturnValue({ statsigGateOverrides: 'dummy=true' })
    setupOverridesFromLaunchArgs()

    // Initialize Statsig client before each test
    mockInstance = {
      getDynamicConfig: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('value'),
      }),
      getExperiment: jest.fn().mockReturnValue({
        get: jest.fn().mockReturnValue('value'),
        checkGate: jest.fn().mockReturnValue('value'),
      }),
      checkGate: jest.fn(),
      updateUser: jest.fn(),
    }
    jest.spyOn(StatsigClientSingleton, 'isInitialized').mockReturnValue(true)
    jest
      .spyOn(StatsigClientSingleton, 'getInstance')
      .mockReturnValue(mockInstance as unknown as StatsigClientRN)
    jest.spyOn(StatsigClientSingleton, 'updateUser').mockImplementation(mockInstance.updateUser)
  })

  describe('data validation', () => {
    it.each(Object.entries(ExperimentConfigs))(
      `ExperimentConfigs.%s has correct experimentName`,
      (key, { experimentName }) => {
        expect(key).toEqual(experimentName)
      }
    )
    it.each(Object.entries(DynamicConfigs))(
      `DynamicConfigs.%s has correct configName`,
      (key, { configName }) => {
        expect(key).toEqual(configName)
      }
    )
  })

  describe('getExperimentParams', () => {
    it('returns default values if getting statsig experiment throws error', () => {
      mockInstance.getExperiment.mockImplementation(() => {
        throw new Error('mock error')
      })
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const experimentName = 'mock_experiment_name' as StatsigExperiments
      const output = getExperimentParams({ experimentName, defaultValues })
      expect(Logger.warn).toHaveBeenCalled()
      expect(output).toEqual(defaultValues)
    })

    it('returns Statsig values if no error is thrown', () => {
      const getMock = jest.fn().mockImplementation((paramName: string, _defaultValue: string) => {
        if (paramName === 'param1') {
          return 'statsigValue1'
        } else if (paramName === 'param2') {
          return 'statsigValue2'
        } else {
          throw new Error('unexpected param name')
        }
      })
      mockInstance.getExperiment.mockReturnValue({
        get: getMock,
      })
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const experimentName = 'mock_experiment_name' as StatsigExperiments
      const output = getExperimentParams({ experimentName, defaultValues })
      expect(Logger.warn).not.toHaveBeenCalled()
      expect(mockInstance.getExperiment).toHaveBeenCalledWith(experimentName)
      expect(getMock).toHaveBeenCalledWith('param1', 'defaultValue1')
      expect(getMock).toHaveBeenCalledWith('param2', 'defaultValue2')
      expect(output).toEqual({ param1: 'statsigValue1', param2: 'statsigValue2' })
    })

    it('returns values and logs error if sdk uninitialized', () => {
      jest.spyOn(StatsigClientSingleton, 'isInitialized').mockReturnValue(false)
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const experimentName = 'mock_experiment_name' as StatsigExperiments
      const output = getExperimentParams({ experimentName, defaultValues })
      expect(Logger.warn).toHaveBeenCalled()
      expect(output).toEqual(defaultValues)
    })

    it('returns default values if statsig is not enabled', () => {
      mockConfig.STATSIG_ENABLED = false
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const experimentName = 'mock_experiment_name' as StatsigExperiments
      const output = getExperimentParams({ experimentName, defaultValues })
      expect(output).toEqual(defaultValues)
      expect(Logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('getFeatureGate', () => {
    it('returns false if getting statsig feature gate throws error', () => {
      mockInstance.checkGate.mockImplementation(() => {
        throw new Error('mock error')
      })
      const output = getFeatureGate(StatsigFeatureGates.APP_REVIEW)
      expect(Logger.warn).toHaveBeenCalled()
      expect(output).toEqual(false)
    })

    it('returns Statsig values if no error is thrown', () => {
      mockInstance.checkGate.mockReturnValue(true)
      const output = getFeatureGate(StatsigFeatureGates.APP_REVIEW)
      expect(Logger.warn).not.toHaveBeenCalled()
      expect(output).toEqual(true)
    })

    it('returns gate overrides if set', () => {
      mockInstance.checkGate.mockReturnValue(true)
      jest
        .mocked(LaunchArguments.value)
        .mockReturnValue({ statsigGateOverrides: 'app_review=false' })
      setupOverridesFromLaunchArgs()
      expect(getFeatureGate(StatsigFeatureGates.APP_REVIEW)).toEqual(false)
    })

    it('returns default values if statsig is not enabled', () => {
      mockConfig.STATSIG_ENABLED = false
      const output = getFeatureGate(StatsigFeatureGates.APP_REVIEW)
      expect(output).toEqual(false)
      expect(Logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('getDynamicConfigParams', () => {
    it('returns default values if getting statsig dynamic config throws error', () => {
      mockInstance.getDynamicConfig.mockImplementation(() => {
        throw new Error('mock error')
      })
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const configName = 'mock_config' as StatsigDynamicConfigs
      const output = getDynamicConfigParams({ configName, defaultValues })
      expect(Logger.warn).toHaveBeenCalled()
      expect(output).toEqual(defaultValues)
    })

    it('returns Statsig values if no error is thrown', () => {
      const getMock = jest.fn().mockImplementation((paramName: string, _defaultValue: string) => {
        if (paramName === 'param1') {
          return 'statsigValue1'
        } else if (paramName === 'param2') {
          return 'statsigValue2'
        } else {
          throw new Error('unexpected param name')
        }
      })
      mockInstance.getDynamicConfig.mockReturnValue({
        get: getMock,
      })
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const configName = 'mock_config' as StatsigDynamicConfigs
      const output = getDynamicConfigParams({ configName, defaultValues })
      expect(Logger.warn).not.toHaveBeenCalled()
      expect(mockInstance.getDynamicConfig).toHaveBeenCalledWith(configName)
      expect(getMock).toHaveBeenCalledWith('param1', 'defaultValue1')
      expect(getMock).toHaveBeenCalledWith('param2', 'defaultValue2')
      expect(output).toEqual({ param1: 'statsigValue1', param2: 'statsigValue2' })
    })

    it('returns values and logs error if sdk uninitialized', () => {
      jest.spyOn(StatsigClientSingleton, 'isInitialized').mockReturnValue(false)
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const configName = 'mock_config' as StatsigDynamicConfigs
      const output = getDynamicConfigParams({ configName, defaultValues })
      expect(Logger.warn).toHaveBeenCalled()
      expect(output).toEqual(defaultValues)
    })

    it('returns default values if statsig is not enabled', () => {
      mockConfig.STATSIG_ENABLED = false
      const defaultValues = { param1: 'defaultValue1', param2: 'defaultValue2' }
      const configName = 'mock_config' as StatsigDynamicConfigs
      const output = getDynamicConfigParams({ configName, defaultValues })
      expect(output).toEqual(defaultValues)
      expect(Logger.warn).not.toHaveBeenCalled()
    })
  })

  describe('patchUpdateStatsigUser', () => {
    let mockDateNow: jest.SpyInstance

    beforeEach(() => {
      mockDateNow = jest.spyOn(Date, 'now').mockReturnValue(1234)
    })

    afterEach(() => {
      mockDateNow.mockReset()
    })

    it('logs an error if statsig throws', async () => {
      mockInstance.updateUser.mockRejectedValue(new Error())
      await patchUpdateStatsigUser()
      expect(mockInstance.updateUser).toHaveBeenCalledTimes(1)
      expect(mockInstance.updateUser).toHaveBeenCalledWith({
        userID: MOCK_ACCOUNT.toLowerCase(),
        custom: {
          startOnboardingTime: MOCK_START_ONBOARDING_TIME,
          loadTime: 1234,
        },
      })
      expect(Logger.error).toHaveBeenCalledTimes(1)
    })

    it('uses default values from redux store when passed no parameters', async () => {
      await patchUpdateStatsigUser()
      expect(mockInstance.updateUser).toHaveBeenCalledTimes(1)
      expect(mockInstance.updateUser).toHaveBeenCalledWith({
        userID: MOCK_ACCOUNT.toLowerCase(),
        custom: {
          startOnboardingTime: MOCK_START_ONBOARDING_TIME,
          loadTime: 1234,
        },
      })
    })

    it('merges custom fields with defaults when passed', async () => {
      const statsigUser = {
        custom: {
          otherCustomProperty: 'foo',
        },
      }
      await patchUpdateStatsigUser(statsigUser)
      expect(mockInstance.updateUser).toHaveBeenCalledTimes(1)
      expect(mockInstance.updateUser).toHaveBeenCalledWith({
        userID: MOCK_ACCOUNT.toLowerCase(),
        custom: {
          startOnboardingTime: MOCK_START_ONBOARDING_TIME,
          otherCustomProperty: 'foo',
          loadTime: 1234,
        },
      })
    })

    it('overrides user ID when passed', async () => {
      const statsigUser = {
        userID: 'some address',
        custom: {
          otherCustomProperty: 'foo',
        },
      }
      await patchUpdateStatsigUser(statsigUser)
      expect(mockInstance.updateUser).toHaveBeenCalledTimes(1)
      expect(mockInstance.updateUser).toHaveBeenCalledWith({
        userID: 'some address',
        custom: {
          startOnboardingTime: MOCK_START_ONBOARDING_TIME,
          otherCustomProperty: 'foo',
          loadTime: 1234,
        },
      })
    })

    it('overrides default custom fields when explicitly provided', async () => {
      const statsigUser = {
        custom: {
          startOnboardingTime: 1680563880,
          otherCustomProperty: 'foo',
        },
      }
      await patchUpdateStatsigUser(statsigUser)
      expect(mockInstance.updateUser).toHaveBeenCalledTimes(1)
      expect(mockInstance.updateUser).toHaveBeenCalledWith({
        userID: MOCK_ACCOUNT.toLowerCase(),
        custom: {
          startOnboardingTime: 1680563880,
          otherCustomProperty: 'foo',
          loadTime: 1234,
        },
      })
    })

    it('does not update user if statsig is not enabled', async () => {
      mockConfig.STATSIG_ENABLED = false
      await patchUpdateStatsigUser()
      expect(mockInstance.updateUser).not.toHaveBeenCalled()
    })

    it('does not update user if statsig is not initialized', async () => {
      jest.spyOn(StatsigClientSingleton, 'isInitialized').mockReturnValue(false)
      await patchUpdateStatsigUser()
      expect(mockInstance.updateUser).not.toHaveBeenCalled()
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.any(String),
        'patchUpdateStatsigUser: SDK is uninitialized when updating user'
      )
    })
  })

  describe('setupOverridesFromLaunchArgs', () => {
    it('cleans up overrides and skips setup if no override is set', () => {
      jest.mocked(LaunchArguments.value).mockReturnValue({ statsigGateOverrides: '' })
      setupOverridesFromLaunchArgs()
      expect(_getGateOverrides()).toEqual({})
    })

    it('cleans up and sets up gate overrides if set', () => {
      jest
        .mocked(LaunchArguments.value)
        .mockReturnValue({ statsigGateOverrides: 'gate1=true,gate2=false' })
      setupOverridesFromLaunchArgs()
      expect(_getGateOverrides()).toEqual({ gate1: true, gate2: false })
    })
  })
})
