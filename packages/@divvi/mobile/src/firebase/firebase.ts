import firebase, { ReactNativeFirebase } from '@react-native-firebase/app'
import '@react-native-firebase/auth'
import '@react-native-firebase/database'
import { FirebaseDatabaseTypes } from '@react-native-firebase/database'
import '@react-native-firebase/messaging'
// We can't combine the 2 imports otherwise it only imports the type and fails at runtime
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging'
import { PermissionsAndroid, PermissionStatus, Platform } from 'react-native'
import DeviceInfo from 'react-native-device-info'
import { eventChannel } from 'redux-saga'
import { handleUpdateAccountRegistration } from 'src/account/saga'
import { updateAccountRegistration } from 'src/account/updateAccountRegistration'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { AppEvents } from 'src/analytics/Events'
import { pushNotificationsPermissionChanged } from 'src/app/actions'
import {
  pushNotificationRequestedUnixTimeSelector,
  pushNotificationsEnabledSelector,
} from 'src/app/selectors'
import { DEFAULT_PERSONA_TEMPLATE_ID, FETCH_TIMEOUT_DURATION, FIREBASE_ENABLED } from 'src/config'
import { Actions } from 'src/firebase/actions'
import { handleNotification } from 'src/firebase/notifications'
import { Actions as HomeActions } from 'src/home/actions'
import { NotificationReceiveState } from 'src/notifications/types'
import { retrieveSignedMessage } from 'src/pincode/authentication'
import Logger from 'src/utils/Logger'
import { Awaited } from 'src/utils/typescript'
import { call, put, select, take } from 'typed-redux-saga'

const TAG = 'firebase/firebase'

interface NotificationChannelEvent {
  message: FirebaseMessagingTypes.RemoteMessage
  stateType: NotificationReceiveState
}

export function* watchFirebaseNotificationChannel() {
  if (!FIREBASE_ENABLED) {
    return
  }

  try {
    const channel = createFirebaseNotificationChannel()

    Logger.debug(`${TAG}/watchFirebaseNotificationChannel`, 'Started channel watching')

    while (true) {
      const event = (yield* take(channel)) as NotificationChannelEvent
      if (!event) {
        Logger.debug(`${TAG}/watchFirebaseNotificationChannel`, 'Data in channel was empty')
        continue
      }
      Logger.debug(
        `${TAG}/watchFirebaseNotificationChannel`,
        'Notification received in the channel'
      )
      yield* call(handleNotification, event.message, event.stateType)
    }
  } catch (error) {
    Logger.error(
      `${TAG}/watchFirebaseNotificationChannel`,
      'Error proccesing notification channel event',
      error
    )
  } finally {
    Logger.debug(`${TAG}/watchFirebaseNotificationChannel`, 'Notification channel terminated')
  }
}

export function* checkInitialNotification() {
  if (!FIREBASE_ENABLED) {
    return
  }

  // We need this initial check because the app could be in the killed state
  // or in the background when the push notification arrives

  // Manual type checking because yield calls can't infer return type yet :'(
  const initialNotification: Awaited<
    ReturnType<FirebaseMessagingTypes.Module['getInitialNotification']>
  > = yield* call([firebase.messaging(), 'getInitialNotification'])
  if (initialNotification) {
    Logger.info(TAG, 'App opened fresh via a notification', initialNotification)
    yield* call(handleNotification, initialNotification, NotificationReceiveState.AppColdStart)
  }
}

export const initializeAuth = async (app: ReactNativeFirebase.Module, address: string) => {
  Logger.info(TAG, 'Initializing Firebase auth')
  const user = await app.auth().signInAnonymously()
  if (!user) {
    throw new Error('No Firebase user specified')
  }

  const userRef = app.database().ref('users')
  // Save some user data in DB if it's not there yet
  await userRef.child(user.user.uid).transaction((userData: { address?: string }) => {
    if (userData == null) {
      return { address }
    } else if (userData.address !== undefined && userData.address !== address) {
      // This shouldn't happen! If this is thrown it means the firebase user is reused
      // with different addresses (which we don't want) or the db was incorrectly changed remotely!
      Logger.debug("User address in the db doesn't match persisted address - updating address")
      return {
        address,
      }
    }
  })
  Logger.info(TAG, 'Firebase Auth initialized successfully')
}

export const firebaseSignOut = async (app: ReactNativeFirebase.FirebaseApp) => {
  await app.auth().signOut()
}

function createFirebaseNotificationChannel() {
  return eventChannel((emitter) => {
    const unsubscribe = () => {
      Logger.info(TAG, 'Notification channel closed, resetting callbacks.')
      firebase.messaging().onMessage(() => null)
      firebase.messaging().onNotificationOpenedApp(() => null)
    }

    firebase.messaging().onMessage((message) => {
      Logger.info(TAG, 'Notification received while open')
      emitter({
        message,
        stateType: NotificationReceiveState.AppAlreadyOpen,
      })
    })

    firebase.messaging().onNotificationOpenedApp((message) => {
      Logger.info(TAG, 'App opened via a notification')
      emitter({
        message,
        stateType: NotificationReceiveState.AppOpenedFromBackground,
      })
    })
    return unsubscribe
  })
}

const actionSeen: Record<string, boolean> = {}

export function* takeWithInMemoryCache(action: Actions | HomeActions) {
  if (actionSeen[action]) {
    return
  }
  yield* take(action)
  actionSeen[action] = true
  return
}

export function* initializeCloudMessaging(app: ReactNativeFirebase.Module, address: string) {
  Logger.info(TAG, 'Initializing Firebase Cloud Messaging')

  // permissions are denied by default on Android API level 33+, so we track
  // whether we should prompt the user for permission manually through redux
  // instead of relying on firebase messaging's `hasPermission` method
  const pushNotificationRequestedUnixTime = yield* select(pushNotificationRequestedUnixTimeSelector)
  const lastKnownEnabledState = yield* select(pushNotificationsEnabledSelector)

  if (pushNotificationRequestedUnixTime === null && !lastKnownEnabledState) {
    yield takeWithInMemoryCache(HomeActions.VISIT_HOME) // better than take(HomeActions.VISIT_HOME) because if failure occurs, retries can succeed without an additional visit home

    Logger.info(TAG, 'requesting permission')
    try {
      let permissionGranted = false
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const permissionStatus: PermissionStatus = yield* call(
          [PermissionsAndroid, 'request'],
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        )
        permissionGranted = permissionStatus === 'granted'
      } else {
        const permissionStatus = yield* call([app.messaging(), 'requestPermission'])
        permissionGranted = permissionStatus === firebase.messaging.AuthorizationStatus.AUTHORIZED
      }

      AppAnalytics.track(AppEvents.push_notifications_permission_changed, {
        enabled: permissionGranted,
      })
      yield* put(pushNotificationsPermissionChanged(permissionGranted, true))
    } catch (error) {
      Logger.warn(TAG, 'Failed to request permission from the user', error)
      throw error
    }
  } else {
    // this call needs to include context: https://github.com/redux-saga/redux-saga/issues/27
    // Manual type checking because yield calls can't infer return type yet :'(
    const authStatus: Awaited<ReturnType<FirebaseMessagingTypes.Module['hasPermission']>> =
      yield* call([app.messaging(), 'hasPermission'])

    const pushNotificationsEnabled = authStatus !== firebase.messaging.AuthorizationStatus.DENIED

    if (lastKnownEnabledState !== pushNotificationsEnabled) {
      AppAnalytics.track(AppEvents.push_notifications_permission_changed, {
        enabled: pushNotificationsEnabled,
      })
      yield* put(pushNotificationsPermissionChanged(pushNotificationsEnabled, false))
    }
  }
  let fcmToken
  const isEmulator = yield* call([DeviceInfo, 'isEmulator'])
  // Emulators can't handle fcm tokens and calling getToken on them will throw an error
  if (!isEmulator) {
    fcmToken = yield* call([app.messaging(), 'getToken'])
  }
  if (fcmToken) {
    yield* call(handleUpdateAccountRegistration)
  }

  app.messaging().onTokenRefresh(async (fcmToken) => {
    Logger.info(TAG, 'Cloud Messaging token refreshed')

    try {
      const signedMessage = await retrieveSignedMessage()
      if (signedMessage) {
        await updateAccountRegistration(address, signedMessage, { fcmToken })
      }
    } catch (error) {
      Logger.error(
        `${TAG}@initializeCloudMessaging`,
        'Unable to update cloud messaging token',
        error
      )
    }
  })
}

const VALUE_CHANGE_HOOK = 'value'

export async function notificationsChannel() {
  return simpleReadChannel('notificationsV2')
}

export async function fetchRewardsSenders() {
  return fetchListFromFirebase('rewardsSenders')
}

export async function fetchInviteRewardsSenders() {
  return fetchListFromFirebase('inviteRewardAddresses')
}

export async function fetchCoinbasePaySenders() {
  return fetchListFromFirebase('coinbasePayAddresses')
}

async function fetchListFromFirebase(path: string) {
  if (!FIREBASE_ENABLED) {
    return null
  }
  return eventChannel((emit: any) => {
    const onValueChange = firebase
      .database()
      .ref(path)
      .on(
        VALUE_CHANGE_HOOK,
        (snapshot) => {
          emit(snapshot.val() ?? [])
        },
        (error: Error) => {
          Logger.warn(TAG, error.toString())
        }
      )

    return () => firebase.database().ref(path).off(VALUE_CHANGE_HOOK, onValueChange)
  })
}

export function simpleReadChannel(key: string) {
  if (!FIREBASE_ENABLED) {
    return null
  }

  const errorCallback = (error: Error) => {
    Logger.warn(TAG, error.toString())
  }

  return eventChannel((emit: any) => {
    const emitter = (snapshot: FirebaseDatabaseTypes.DataSnapshot) => {
      const value = snapshot.val()
      Logger.debug(`Got value from Firebase for key ${key}:`, value)
      emit(value || {})
    }

    const onValueChange = firebase.database().ref(key).on(VALUE_CHANGE_HOOK, emitter, errorCallback)

    const cancel = () => {
      firebase.database().ref(key).off(VALUE_CHANGE_HOOK, onValueChange)
    }

    return cancel
  })
}

export async function readOnceFromFirebase(path: string) {
  if (!FIREBASE_ENABLED) {
    Logger.info(`${TAG}/readOnceFromFirebase`, 'Firebase disabled')
    return null
  }

  const timeout = new Promise<void>((_, reject) =>
    setTimeout(
      () => reject(Error(`Reading from Firebase @ ${path} timed out.`)),
      FETCH_TIMEOUT_DURATION
    )
  )
  const fetchFromFirebase = firebase
    .database()
    .ref(path)
    .once('value')
    .then((snapshot) => snapshot.val())
  return Promise.race([timeout, fetchFromFirebase])
}

export async function getPersonaTemplateId() {
  if (!FIREBASE_ENABLED) {
    return DEFAULT_PERSONA_TEMPLATE_ID
  }

  return readOnceFromFirebase('persona/templateId')
}
