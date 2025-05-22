import { StatsigClientRN, StatsigUser } from '@statsig/react-native-bindings'
import { STATSIG_API_KEY, STATSIG_ENABLED, STATSIG_ENV } from 'src/config'
import { getDefaultStatsigUser } from 'src/statsig/selector'
import Logger from 'src/utils/Logger'
const TAG = 'StatsigClient'

class StatsigClientSingleton {
  private static instance: StatsigClientRN | null = null
  private static isInitializing = false
  private static initializationPromise: Promise<void> | null = null
  private static initialized = false

  public static getInstance(): StatsigClientRN {
    if (!this.instance) {
      throw new Error('StatsigClient not initialized. Call initialize() first.')
    }
    return this.instance
  }

  public static isInitialized(): boolean {
    return this.initialized
  }

  public static async initialize(overrideStableID?: string): Promise<void> {
    if (this.isInitializing) {
      return this.initializationPromise!
    }

    if (this.instance) {
      return
    }

    this.isInitializing = true
    this.initializationPromise = this.initializeInternal(overrideStableID)

    try {
      await this.initializationPromise
    } finally {
      this.isInitializing = false
      this.initializationPromise = null
    }
  }

  private static async initializeInternal(overrideStableID?: string): Promise<void> {
    if (!STATSIG_ENABLED || !STATSIG_API_KEY) {
      Logger.info(TAG, 'Statsig is disabled or API key not present, skipping initialization')
      return
    }

    try {
      const defaultUser = getDefaultStatsigUser()
      // Convert the user to match the new StatsigUser type
      const statsigUser: StatsigUser = {
        userID: defaultUser.userID?.toString(),
        customIDs: {
          stableID: overrideStableID,
        },
        custom: defaultUser.custom,
      }

      this.instance = new StatsigClientRN(STATSIG_API_KEY, statsigUser, {
        environment: STATSIG_ENV,
      })

      await this.instance.initializeAsync()
      this.initialized = true
      Logger.info(TAG, 'Statsig client initialized successfully')
    } catch (error) {
      this.initialized = false
      Logger.error(TAG, 'Failed to initialize Statsig client', error)
      throw error
    }
  }

  public static async updateUser(user?: Partial<StatsigUser>): Promise<void> {
    if (!this.instance) {
      throw new Error('StatsigClient not initialized. Call initialize() first.')
    }

    try {
      const defaultUser = getDefaultStatsigUser()
      const mergedUser: StatsigUser = {
        userID: (user?.userID ?? defaultUser.userID)?.toString(),
        custom: { ...defaultUser.custom, ...user?.custom },
      }
      await this.instance.updateUserAsync(mergedUser)
    } catch (error) {
      Logger.error(TAG, 'Failed to update Statsig user', error)
      throw error
    }
  }
}

export default StatsigClientSingleton
