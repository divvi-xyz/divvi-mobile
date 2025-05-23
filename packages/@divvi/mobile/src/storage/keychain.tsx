import * as Keychain from '@divvi/react-native-keychain'
import Logger from 'src/utils/Logger'
import { ensureError } from 'src/utils/ensureError'

const TAG = 'storage/keychain'
// the user cancelled error strings are OS specific
const KEYCHAIN_USER_CANCELLED_ERRORS = [
  'user canceled the operation',
  'error: code: 13, msg: cancel',
  'error: code: 10, msg: fingerprint operation canceled by the user',
]

interface SecureStorage {
  key: string
  value: string
  options?: Keychain.SetOptions
}

export function isUserCancelledError(error: Error) {
  return KEYCHAIN_USER_CANCELLED_ERRORS.some((userCancelledError) =>
    error.toString().toLowerCase().includes(userCancelledError)
  )
}

export async function storeItem({ key, value, options = {} }: SecureStorage) {
  try {
    const result = await Keychain.setGenericPassword('CELO', value, {
      service: key,
      accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      ...options,
    })
    if (result === false) {
      throw new Error('Store result false')
    }

    // check that we can correctly read the keychain before proceeding
    const retrievedResult = await retrieveStoredItem(key)
    if (retrievedResult !== value) {
      await removeStoredItem(key)
      Logger.error(
        `${TAG}@storeItem`,
        `Retrieved value for key '${key}' does not match stored value`
      )
      throw new Error(`Retrieved value for key '${key}' does not match stored value`)
    }

    return result
  } catch (error) {
    Logger.error(TAG, 'Error storing item', error, true, value)
    throw error
  }
}

export async function retrieveStoredItem(key: string, options: Keychain.GetOptions = {}) {
  try {
    const item = await Keychain.getGenericPassword({
      service: key,
      rules: Keychain.SECURITY_RULES.NONE,
      ...options,
    })
    if (!item) {
      return null
    }
    return item.password
  } catch (err) {
    const error = ensureError(err)
    if (!isUserCancelledError(error)) {
      // triggered when biometry verification fails and user cancels the action
      Logger.error(TAG, 'Error retrieving stored item', error, true)
    }
    throw error
  }
}

export async function removeStoredItem(key: string) {
  try {
    return Keychain.resetGenericPassword({
      service: key,
    })
  } catch (error) {
    Logger.error(TAG, 'Error clearing item', error, true)
    throw error
  }
}

export async function listStoredItems() {
  try {
    return Keychain.getAllGenericPasswordServices({ skipUIAuth: true })
  } catch (error) {
    Logger.error(TAG, 'Error listing items', error, true)
    throw error
  }
}

export async function clearStoredItems(): Promise<string[]> {
  const items = await listStoredItems()
  const promises = items.map((item) => removeStoredItem(item))
  const results = await Promise.allSettled(promises)

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      Logger.error(TAG, `Failed to remove stored item: ${items[index]}`, result.reason)
    }
  })

  return items
}
