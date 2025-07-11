import AsyncStorage from '@react-native-async-storage/async-storage'
import { configureStore, Middleware } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import devToolsEnhancer from 'redux-devtools-expo-dev-plugin'
import { getStoredState, PersistConfig, persistReducer, persistStore } from 'redux-persist'
import FSStorage from 'redux-persist-fs-storage'
import autoMergeLevel2 from 'redux-persist/lib/stateReconciler/autoMergeLevel2'
import createSagaMiddleware from 'redux-saga'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { PerformanceEvents } from 'src/analytics/Events'
import { apiMiddlewares } from 'src/redux/apiReducersList'
import { createMigrate } from 'src/redux/createMigrate'
import { migrations } from 'src/redux/migrations'
import rootReducer, { RootState as ReducersRootState } from 'src/redux/reducers'
import { rootSaga } from 'src/redux/sagas'
import { transactionFeedV2Api } from 'src/transactions/api'
import { resetStateOnInvalidStoredAccount } from 'src/utils/accountChecker'
import Logger from 'src/utils/Logger'
import { ONE_MINUTE_IN_MILLIS } from 'src/utils/time'

export const timeBetweenStoreSizeEvents = ONE_MINUTE_IN_MILLIS
// Set this to the epoch so that a redix_store_size event will always be emitted the first time
// the entire state is serialized in a session
let lastEventTime = 0

const persistConfig: PersistConfig<ReducersRootState> = {
  key: 'root',
  // default is -1, increment as we make migrations
  // See https://github.com/valora-inc/wallet/tree/main/WALLET.md#redux-state-migration
  version: 250,
  keyPrefix: `reduxStore-`, // the redux-persist default is `persist:` which doesn't work with some file systems.
  storage: FSStorage(),
  blacklist: ['networkInfo', 'alert', 'imports', 'keylessBackup', transactionFeedV2Api.reducerPath],
  stateReconciler: autoMergeLevel2,
  migrate: async (...args) => {
    const migrate = createMigrate(migrations)
    const state: any = await migrate(...args)

    // Do this check here once migrations have occurred, to ensure we have a RootState
    return resetStateOnInvalidStoredAccount(state) as any
  },
  // @ts-ignore the types are currently wrong
  serialize: (data: any) => {
    // We're using this to send the size of the store to analytics while using the default implementation of JSON.stringify.
    const stringifiedData = JSON.stringify(data)
    // if data._persist or any other key is present the whole state is present (the content of the keys are
    // sometimes serialized independently).
    if (data._persist && Date.now() > lastEventTime + timeBetweenStoreSizeEvents) {
      lastEventTime = Date.now()
      AppAnalytics.track(PerformanceEvents.redux_store_size, {
        size: stringifiedData.length,
      })
    }
    return stringifiedData
  },
  deserialize: (data: string) => {
    // This is the default implementation, but overriding to maintain compatibility with the serialize function
    // in case the library changes.
    return JSON.parse(data)
  },
  // @ts-ignore
  timeout: null,
}

// We used to use AsyncStorage to save the state, but moved to file system storage because of problems with Android
// maximum size limits. To keep backwards compatibility, we first try to read from the file system but if nothing is found
// it means it's an old version so we read the state from AsyncStorage.
// @ts-ignore
persistConfig.getStoredState = async (config: any) => {
  Logger.info('redux/store', 'persistConfig.getStoredState')
  try {
    // throw new Error("testing exception in getStoredState")
    const state = await getStoredState(config)
    if (state) {
      return state
    }

    const oldState = await getStoredState({
      ...config,
      storage: AsyncStorage,
      keyPrefix: 'persist:',
    })
    if (oldState) {
      return oldState
    }

    return null
  } catch (error) {
    Logger.error('redux/store', 'Failed to retrieve redux state.', error)
  }
}

// For testing only!
export const _persistConfig = persistConfig

// eslint-disable-next-line no-var
declare var window: any

export const setupStore = (initialState?: ReducersRootState, config = persistConfig) => {
  const sagaMiddleware = createSagaMiddleware({
    onError: (error, errorInfo) => {
      // Log the uncaught error so it's captured by Sentry
      // default just uses console.error
      // TODO: would be nice if we could attach errorInfo as additional data to the error
      Logger.error(
        'redux/store',
        `Uncaught error in saga with stack: ${errorInfo?.sagaStack}`,
        error
      )
    },
  })

  const middlewares: Middleware[] = [sagaMiddleware, ...apiMiddlewares]

  const persistedReducer = persistReducer(config, rootReducer)

  const createdStore = configureStore({
    reducer: persistedReducer,
    preloadedState: initialState,
    middleware: (getDefaultMiddleware: any) =>
      getDefaultMiddleware({
        immutableCheck: false,
        serializableCheck: false,
      }).concat(...middlewares),
    devTools: false,
    enhancers: (getDefaultEnhancers) => getDefaultEnhancers().concat(devToolsEnhancer()),
  })
  const createdPersistor = persistStore(createdStore)
  sagaMiddleware.run(rootSaga)

  return { store: createdStore, persistor: createdPersistor, sagaMiddleware }
}

const { store, persistor, sagaMiddleware } = setupStore()

export type RunSaga = typeof runSaga
function runSaga<T>(saga: () => Generator<unknown, T, unknown>): Promise<T> {
  return sagaMiddleware.run(saga).toPromise()
}

export type Store = typeof store
export { persistor, runSaga, store }

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

setupListeners(store.dispatch)
