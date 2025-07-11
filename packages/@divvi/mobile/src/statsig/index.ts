import { DynamicConfig, StatsigUser } from '@statsig/react-native-bindings'
import _ from 'lodash'
import { LaunchArguments } from 'react-native-launch-arguments'
import { ExpectedLaunchArgs, STATSIG_ENABLED } from 'src/config'
import { FeatureGates } from 'src/statsig/constants'
import { getDefaultStatsigUser } from 'src/statsig/selector'
import {
  StatsigDynamicConfigs,
  StatsigExperiments,
  StatsigFeatureGates,
  StatsigParameter,
} from 'src/statsig/types'
import Logger from 'src/utils/Logger'
import StatsigClientSingleton from './client'

const TAG = 'Statsig'

let gateOverrides: { [key: string]: boolean } = {}

// Only for testing
export function _getGateOverrides() {
  return gateOverrides
}

function getParams<T extends Record<string, StatsigParameter>>({
  config,
  defaultValues,
}: {
  config: DynamicConfig
  defaultValues: T
}) {
  type Parameter = keyof T
  type DefaultValue = T[Parameter]
  const output = {} as T
  for (const [param, defaultValue] of Object.entries(defaultValues) as [
    Parameter,
    DefaultValue,
  ][]) {
    output[param] = config.get(param as string, defaultValue) as DefaultValue
  }
  return output
}

export function getExperimentParams<T extends Record<string, StatsigParameter>>({
  experimentName,
  defaultValues,
}: {
  experimentName: StatsigExperiments
  defaultValues: T
}): T {
  try {
    if (!STATSIG_ENABLED) {
      return defaultValues
    }
    if (!StatsigClientSingleton.isInitialized()) {
      Logger.warn(
        TAG,
        'getExperimentParams: SDK is uninitialized when getting experiment',
        experimentName
      )
      return defaultValues
    }
    const client = StatsigClientSingleton.getInstance()

    const experiment = client.getExperiment(experimentName)
    return getParams({ config: experiment, defaultValues })
  } catch (error) {
    Logger.warn(
      TAG,
      `getExperimentParams: Error getting params for experiment: ${experimentName}`,
      error
    )
    return defaultValues
  }
}

function _getDynamicConfigParams<T extends Record<string, StatsigParameter>>({
  configName,
  defaultValues,
}: {
  configName: StatsigDynamicConfigs
  defaultValues: T
}): T {
  try {
    if (!STATSIG_ENABLED) {
      return defaultValues
    }
    if (!StatsigClientSingleton.isInitialized()) {
      Logger.warn(
        TAG,
        'getDynamicConfigParams: SDK is uninitialized when getting config',
        configName
      )
      return defaultValues
    }
    const client = StatsigClientSingleton.getInstance()

    const config = client.getDynamicConfig(configName)
    return getParams({ config, defaultValues })
  } catch (error) {
    Logger.warn(TAG, `Error getting params for dynamic config: ${configName}`, error)
    return defaultValues
  }
}

// Cannot be used to retrieve dynamic config for multichain features
export function getDynamicConfigParams<T extends Record<string, StatsigParameter>>({
  configName,
  defaultValues,
}: {
  configName: StatsigDynamicConfigs
  defaultValues: T
}): T {
  return _getDynamicConfigParams({ configName, defaultValues })
}

export function getFeatureGate(featureGateName: StatsigFeatureGates) {
  const defaultGateValue = FeatureGates[featureGateName]
  try {
    if (featureGateName in gateOverrides) {
      return gateOverrides[featureGateName]
    }

    if (!STATSIG_ENABLED) {
      return defaultGateValue
    }
    if (!StatsigClientSingleton.isInitialized()) {
      Logger.warn(TAG, 'getFeatureGate: SDK is uninitialized when checking gate', featureGateName)
      return defaultGateValue
    }
    const client = StatsigClientSingleton.getInstance()

    return client.checkGate(featureGateName)
  } catch (error) {
    Logger.warn(TAG, `Error getting feature gate: ${featureGateName}`, error)
    return defaultGateValue
  }
}

/**
 * Updates the current Statsig user. If no argument is given, a default StatsigUser
 * object is used to update the user, based on values from the redux store. If a StatsigUser
 * object is provided as a parameter, the provided object will be deep merged with the default
 * object from redux, with the provided object overriding fields in the default
 * object. The default object also includes a `loadTime` field which is set to
 * current time, so calling this method with no args will always force a refresh
 * since `loadTime` will change.
 *
 * If the update fails for whatever reason, an error will be logged.
 *
 * This function does not update default values in redux; callers are expected to update redux
 * state themselves.
 */
export async function patchUpdateStatsigUser(statsigUser?: StatsigUser) {
  try {
    if (!STATSIG_ENABLED) {
      return
    }
    if (!StatsigClientSingleton.isInitialized()) {
      Logger.warn(TAG, 'patchUpdateStatsigUser: SDK is uninitialized when updating user')
      return
    }
    const defaultUser = getDefaultStatsigUser()
    await StatsigClientSingleton.updateUser(_.merge(defaultUser, statsigUser))
  } catch (error) {
    Logger.error(TAG, 'Failed to update Statsig user', error)
  }
}

export function setupOverridesFromLaunchArgs() {
  try {
    Logger.debug(TAG, 'Cleaning up local overrides')
    const newGateOverrides: typeof gateOverrides = {}
    const { statsigGateOverrides } = LaunchArguments.value<ExpectedLaunchArgs>()
    if (statsigGateOverrides) {
      Logger.debug(TAG, 'Setting up gate overrides', statsigGateOverrides)
      statsigGateOverrides.split(',').forEach((gateOverride: string) => {
        const [gate, value] = gateOverride.split('=')
        newGateOverrides[gate] = value === 'true'
      })
    }
    gateOverrides = newGateOverrides
  } catch (err) {
    Logger.debug(TAG, 'Overrides setup failed', err)
  }
}
