import { debounce, throttle } from 'lodash'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultCountryCodeSelector } from 'src/account/selectors'
import { phoneNumberVerifiedSelector } from 'src/app/selectors'
import { getAppConfig } from 'src/appConfig'
import { getPublicClient } from 'src/public'
import {
  Recipient,
  RecipientType,
  filterRecipientFactory,
  getRecipientFromAddress,
  sortRecipients,
} from 'src/recipients/recipient'
import { phoneRecipientCacheSelector, recipientInfoSelector } from 'src/recipients/reducer'
import { resolveId } from 'src/recipients/resolve-id'
import { useSelector } from 'src/redux/hooks'
import { isValidAddress } from 'src/utils/address'
import Logger from 'src/utils/Logger'
import { parsePhoneNumber } from 'src/utils/phoneNumbers'
import { Address } from 'viem'
import { normalize } from 'viem/ens'

// Ref: https://github.com/valora-xyz/resolve-kit/blob/f84005ea0b522fb6ae40e10ab53d07cf8ef823ef/src/types.ts#L3
export enum ResolutionKind {
  Address = 'address',
  Ens = 'ens',
}

// Ref: https://github.com/valora-xyz/resolve-kit/blob/f84005ea0b522fb6ae40e10ab53d07cf8ef823ef/src/types.ts#L8
export interface NameResolution {
  kind: ResolutionKind
  address: string
  name?: string
  thumbnailPath?: string
}

const TYPING_DEBOUNCE_MILLSECONDS = 300
const SEARCH_THROTTLE_TIME = 100

const TAG = 'send/hooks'

/**
 * Returns a single ordered list of all recipients to show in search results,
 * as well as the search query state variable itself and its setter.
 *
 * onSearch is a callback function which will be called with the search query
 * just before it's updated.
 *
 * This hook is tested via the SendSelectRecipient.test.tsx file.
 */
export function useMergedSearchRecipients(onSearch: (searchQuery: string) => void) {
  const [searchQuery, setSearchQuery] = useState('')

  const { contactRecipients, recentRecipients } = useSendRecipients()

  const [contactsFiltered, setContactsFiltered] = useState(() => contactRecipients)
  const [recentFiltered, setRecentFiltered] = useState(() => recentRecipients)

  const recentRecipientsFilter = useMemo(
    () => filterRecipientFactory(recentRecipients, false),
    [recentRecipients]
  )
  const contactRecipientsFilter = useMemo(
    () => filterRecipientFactory(contactRecipients, true),
    [contactRecipients]
  )

  const throttledSearch = throttle((searchInput: string) => {
    // Prevents re-render if the searchQuery has not changed
    // Such as with a Keyboard.dismiss() on iOS 16.4+
    if (searchQuery === searchInput) return
    onSearch(searchInput)
    setSearchQuery(searchInput)
    setRecentFiltered(recentRecipientsFilter(searchInput))
    setContactsFiltered(contactRecipientsFilter(searchInput))
  }, SEARCH_THROTTLE_TIME)

  useEffect(() => {
    // Clear search when recipients change to avoid tricky states
    setSearchQuery('')
  }, [recentRecipients, contactRecipients])

  const resolvedRecipients = useResolvedRecipients(searchQuery)
  const uniqueSearchRecipient = useUniqueSearchRecipient(searchQuery)

  const mergedRecipients = useMemo(
    () =>
      mergeRecipients({
        contactRecipients: contactsFiltered,
        recentRecipients: recentFiltered,
        resolvedRecipients,
        uniqueSearchRecipient,
      }),
    [contactsFiltered, recentFiltered, resolvedRecipients, uniqueSearchRecipient]
  )

  return {
    mergedRecipients,
    searchQuery,
    setSearchQuery: throttledSearch,
  }
}

/**
 * Fetches recipients based off the search query by fetching from the resolveId endpoint or Viem.
 * The search query is debounced before making a network request in order to prevent excessive calls.
 *
 * @param searchQuery - The search query (phone number or ENS name)
 * @returns Array of resolved recipients with addresses and metadata
 */
export function useResolvedRecipients(searchQuery: string): Recipient[] {
  const debouncedQuery = useDebouncedValue(searchQuery, TYPING_DEBOUNCE_MILLSECONDS)

  const phoneResolutions = usePhoneRecipients(debouncedQuery)
  const ensResolutions = useEnsRecipients(debouncedQuery)

  const activeResolutions = phoneResolutions.length ? phoneResolutions : ensResolutions
  const mappedRecipients = useMapResolutionsToRecipients(debouncedQuery, activeResolutions)

  // Return empty array for empty queries
  if (!debouncedQuery?.trim()) {
    return []
  }

  return mappedRecipients
}

/**
 * Returns recent and contact recipients from Redux.
 */
export function useSendRecipients() {
  const phoneNumberVerified = useSelector(phoneNumberVerifiedSelector)
  const contactsCache = useSelector(phoneRecipientCacheSelector)
  const contactRecipients = useMemo(
    () => sortRecipients(phoneNumberVerified ? Object.values(contactsCache) : []),
    [contactsCache, phoneNumberVerified]
  )
  const recentRecipients = useSelector((state) => state.send.recentRecipients)
  return {
    contactRecipients,
    recentRecipients,
  }
}

async function resolveEnsAddress(ensName: string): Promise<Address | null> {
  try {
    const publicClient = getPublicClient({ networkId: 'ethereum-mainnet' })
    const normalizedName = normalize(ensName)
    return await publicClient.getEnsAddress({ name: normalizedName })
  } catch (error) {
    Logger.error(TAG, 'ENS resolution failed', error)
    return null
  }
}

function checkIsValidEnsName(name: string): boolean {
  try {
    if (name.length < 3) return false
    // Will throw if the name is not a valid ENS name
    normalize(name.trim())
    return true
  } catch (error) {
    Logger.error('checkIsValidEnsName', 'Invalid ENS name', name)
    return false
  }
}

/**
 * Fetches avatar for an ENS name asynchronously
 */
async function fetchEnsAvatar(ensName: string): Promise<string | null> {
  try {
    const publicClient = getPublicClient({ networkId: 'ethereum-mainnet' })
    const normalizedName = normalize(ensName)

    const avatarPromise = publicClient.getEnsAvatar({ name: normalizedName })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Avatar timeout')), 3_000)
    )

    const avatar = await Promise.race([avatarPromise, timeoutPromise])
    return avatar
  } catch (error) {
    return null
  }
}

/**
 * Updates avatar for an ENS name when it loads asynchronously
 */
function updateAvatarWhenLoaded(
  ensQuery: string,
  setResolutions: (updater: (prev: NameResolution[]) => NameResolution[]) => void
) {
  fetchEnsAvatar(ensQuery)
    .then((avatar) => {
      if (avatar) {
        setResolutions((prev) =>
          prev.map((resolution) =>
            resolution.kind === ResolutionKind.Ens && resolution.name === ensQuery
              ? { ...resolution, thumbnailPath: avatar }
              : resolution
          )
        )
      }
    })
    .catch((error) => {
      Logger.debug(TAG, 'Avatar fetch failed for', ensQuery, ':', error)
    })
}

/**
 * Processes ENS resolution for a search query and returns NameResolution format
 */
async function processEnsResolution(
  searchQuery: string,
  setResolutions: (updater: (prev: NameResolution[]) => NameResolution[]) => void
): Promise<NameResolution[]> {
  const config = getAppConfig()
  if (!config.experimental?.alchemyApiKey) {
    Logger.warn(TAG, 'alchemyApiKey not found, skipping ENS resolution')
    return []
  }

  // Normalize ENS query: convert to lowercase, trim whitespace, and ensure .eth suffix
  const ensQuery = searchQuery.toLowerCase().trim().endsWith('.eth')
    ? searchQuery.toLowerCase().trim()
    : `${searchQuery.toLowerCase().trim()}.eth`

  if (!checkIsValidEnsName(ensQuery)) {
    return []
  }

  try {
    const ensAddress = await resolveEnsAddress(ensQuery)

    if (ensAddress) {
      // Fetch avatar asynchronously and update when it loads
      updateAvatarWhenLoaded(ensQuery, setResolutions)

      return [
        {
          kind: ResolutionKind.Ens,
          address: ensAddress,
          name: ensQuery,
        },
      ]
    }
    return []
  } catch (error) {
    Logger.error(TAG, 'ENS resolution failed', error)
    return []
  }
}

/**
 * Merges all recipient types, including contacts, recents, resolved, and unique, into a single
 * ordered list.
 *
 * Recipients are ordered by the following precedence:
 *  - Resolved recipients
 *  - Recent recipients
 *  - Contact recipients
 *  - Unique recipient, if present and no other recipients exist
 *
 * If there are any duplicated recipients (by phone number or address), they are deduplicated,
 * picking the recipient to show based on the precedence listed above.
 */
export function mergeRecipients({
  contactRecipients,
  recentRecipients,
  resolvedRecipients,
  uniqueSearchRecipient,
}: {
  contactRecipients: Recipient[]
  recentRecipients: Recipient[]
  resolvedRecipients: Recipient[]
  uniqueSearchRecipient?: Recipient
}): Recipient[] {
  const allRecipients: Recipient[] = [
    ...resolvedRecipients,
    ...recentRecipients,
    ...contactRecipients,
  ]

  const mergedRecipients: Recipient[] = []
  for (const potentialRecipient of allRecipients) {
    if (
      !mergedRecipients.find(
        (mergedRecipient) =>
          (mergedRecipient.e164PhoneNumber === potentialRecipient.e164PhoneNumber &&
            mergedRecipient.e164PhoneNumber) ||
          (mergedRecipient.address === potentialRecipient.address && mergedRecipient.address)
      )
    ) {
      mergedRecipients.push(potentialRecipient)
    }
  }

  if (!mergedRecipients.length && uniqueSearchRecipient) {
    mergedRecipients.push(uniqueSearchRecipient)
  }

  return mergedRecipients
}

/**
 * Determines a "unique" recipient to show, if no other recipients are available.
 * This unique recipient will only appear in search results if the search query
 * is exactly a phone number or address that does not otherwise appear in any
 * other recipient lookup.
 */
export function useUniqueSearchRecipient(searchQuery: string): Recipient | undefined {
  const defaultCountryCode = useSelector(defaultCountryCodeSelector)
  const recipientInfo = useSelector(recipientInfoSelector)

  const parsedNumber = parsePhoneNumber(searchQuery, defaultCountryCode ?? undefined)
  if (parsedNumber) {
    return {
      displayNumber: parsedNumber.displayNumber,
      e164PhoneNumber: parsedNumber.e164Number,
      recipientType: RecipientType.PhoneNumber,
    }
  }
  if (isValidAddress(searchQuery)) {
    return getRecipientFromAddress(searchQuery.toLowerCase(), recipientInfo)
  }
}

/**
 * Maps resolution data to a list of recipients.
 */
export function useMapResolutionsToRecipients(
  searchQuery: string,
  resolutions: NameResolution[]
): Recipient[] {
  const recipientInfo = useSelector(recipientInfoSelector)

  const resolvedRecipients = resolutions.map((resolution) => {
    const lowerCaseAddress = resolution.address.toLowerCase()
    switch (resolution.kind) {
      case ResolutionKind.Address:
        return getRecipientFromAddress(lowerCaseAddress, recipientInfo)
      case ResolutionKind.Ens:
        return {
          address: lowerCaseAddress,
          name: resolution.name,
          recipientType: RecipientType.Ens,
          thumbnailPath: resolution.thumbnailPath,
        }
      default:
        return getRecipientFromAddress(lowerCaseAddress, recipientInfo)
    }
  })

  return resolvedRecipients.filter((recipient) => !!recipient)
}

/**
 * Generic hook that debounces a value to prevent excessive updates.
 * Useful for search inputs, API calls, or any value that changes frequently.
 *
 * @param value - The value to debounce
 * @param delayMs - The delay in milliseconds before updating the debounced value
 * @returns The debounced value
 */
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = debounce(() => setDebouncedValue(value), delayMs)
    handler()
    return () => handler.cancel()
  }, [value, delayMs])

  return debouncedValue
}

/**
 * Hook that resolves phone numbers to wallet addresses via the resolveId API.
 *
 * @param searchQuery - The phone number to resolve (e.g., "+1234567890")
 * @returns Array of name resolutions containing wallet addresses
 */
function usePhoneRecipients(searchQuery: string): NameResolution[] {
  const [resolutions, setResolutions] = useState<NameResolution[]>([])
  const defaultCountryCode = useSelector(defaultCountryCodeSelector)

  const fetchPhoneResolution = useCallback(async () => {
    const parsed = parsePhoneNumber(searchQuery, defaultCountryCode ?? undefined)
    if (!parsed) {
      setResolutions([])
      return
    }

    try {
      const result = await resolveId(parsed.e164Number)
      setResolutions(result?.resolutions ?? [])
    } catch (error) {
      Logger.error(TAG, 'Phone number resolution failed', error)
      setResolutions([])
    }
  }, [searchQuery, defaultCountryCode])

  useEffect(() => {
    if (searchQuery.trim()) {
      void fetchPhoneResolution()
    } else {
      setResolutions([])
    }
  }, [searchQuery, fetchPhoneResolution])

  return resolutions
}

/**
 * Hook that resolves ENS names to wallet addresses via client-side resolution.
 * Uses Viem and Alchemy for ENS resolution
 *
 * @param searchQuery - The ENS name to resolve (e.g., "vitalik.eth")
 * @returns Array of name resolutions containing wallet addresses
 */
function useEnsRecipients(searchQuery: string): NameResolution[] {
  const [resolutions, setResolutions] = useState<NameResolution[]>([])

  const resolveEns = useCallback(async () => {
    try {
      const result = await processEnsResolution(searchQuery, setResolutions)
      setResolutions(result)
    } catch (error) {
      Logger.error(TAG, 'ENS resolution failed', error)
      setResolutions([])
    }
  }, [searchQuery])

  useEffect(() => {
    if (searchQuery.trim()) {
      void resolveEns()
    } else {
      setResolutions([])
    }
  }, [searchQuery, resolveEns])

  return resolutions
}
