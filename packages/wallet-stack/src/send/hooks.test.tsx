import { render, renderHook, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import { getAppConfig } from 'src/appConfig'
import { RecipientType } from 'src/recipients/recipient'
import { resolveId } from 'src/recipients/resolve-id'
import {
  ResolutionKind,
  mergeRecipients,
  useMapResolutionsToRecipients,
  useResolvedRecipients,
  useSendRecipients,
  useUniqueSearchRecipient,
  type NameResolution,
} from 'src/send/hooks'
import { createMockStore } from 'test/utils'
import {
  mockAccount,
  mockAddressToE164Number,
  mockE164NumberToAddress,
  mockInvitableRecipient2,
  mockInvitableRecipient3,
  mockPhoneRecipientCache,
  mockRecipient,
  mockRecipient2,
  mockRecipient3,
  mockRecipient4,
} from 'test/values'

jest.mock('src/recipients/resolve-id')
jest.mock('viem/ens', () => ({
  normalize: jest.fn((name: string) => {
    // Mock normalize to return the name as-is for testing
    return name.toLowerCase()
  }),
}))

// Mock getPublicClient for ENS resolution
jest.mock('src/public', () => ({
  getPublicClient: jest.fn(() => ({
    getEnsAddress: jest.fn().mockResolvedValue('0xd8da6bf26964af9d7eed9e03e53415d37aa96045'),
  })),
}))

// Mock getAppConfig to provide the fake API key for ENS resolution
jest.mocked(getAppConfig).mockReturnValue({
  displayName: 'Test App',
  deepLinkUrlScheme: 'testapp',
  registryName: 'test',
  experimental: {
    alchemyApiKey: 'test-key',
  },
})

jest.mock('src/utils/phoneNumbers', () => ({
  parsePhoneNumber: jest.fn((phoneNumber: string) => {
    if (phoneNumber === '+15555555555') {
      return {
        e164Number: '+15555555555',
      }
    }
    if (phoneNumber === '7255555555') {
      return {
        e164Number: '+17255555555',
        displayNumber: '(725) 555-5555',
      }
    }
    return null
  }),
}))

const getStore = (phoneNumberVerified: boolean = true) =>
  createMockStore({
    app: {
      phoneNumberVerified,
    },
    send: {
      recentRecipients: [mockRecipient, mockRecipient2],
    },
    recipients: {
      phoneRecipientCache: mockPhoneRecipientCache,
    },
    identity: {
      addressToE164Number: mockAddressToE164Number,
      e164NumberToAddress: mockE164NumberToAddress,
    },
  })

describe('useResolvedRecipients', () => {
  beforeEach(() => {
    jest.mocked(resolveId).mockImplementation(async (id) => {
      return {
        resolutions:
          id === '+15555555555' // E164 format that parsePhoneNumber will produce
            ? [
                {
                  kind: ResolutionKind.Address,
                  address: mockAccount,
                },
              ]
            : [],
      }
    })
  })

  it('resolves ENS names', async () => {
    const { result } = renderHook(() => useResolvedRecipients('vitalik.eth'), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={getStore(true)}>{children}</Provider>
      ),
    })

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
      expect(result.current[0]).toEqual({
        address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        name: 'vitalik.eth',
        recipientType: RecipientType.Ens,
        thumbnailPath: undefined,
      })
    })
  })

  it('resolves phone numbers', async () => {
    const { result } = renderHook(() => useResolvedRecipients('+15555555555'), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={getStore(true)}>{children}</Provider>
      ),
    })

    await waitFor(() => {
      expect(result.current).toHaveLength(1)
      expect(result.current[0]).toEqual({
        address: mockAccount.toLowerCase(),
        name: 'John Doe',
        thumbnailPath: undefined,
        contactId: 'contactId',
        e164PhoneNumber: '+14155550000',
        displayNumber: '14155550000',
        recipientType: RecipientType.Address,
      })
    })
  })
})

describe('useSendRecipients', () => {
  function renderHook(phoneVerified: boolean) {
    const result = jest.fn()

    function TestComponent() {
      const recipients = useSendRecipients()
      result(recipients)
      return null
    }
    render(
      <Provider store={getStore(phoneVerified)}>
        <TestComponent />
      </Provider>
    )

    return result
  }

  it('gets sorted contact and recent recipients', () => {
    const result = renderHook(true)
    expect(result.mock.calls[0][0]).toEqual({
      recentRecipients: [mockRecipient, mockRecipient2],
      contactRecipients: [mockInvitableRecipient3, mockInvitableRecipient2, mockRecipient],
    })
  })

  it('excludes contact recipients if phone number is not verified', () => {
    const result = renderHook(false)
    expect(result.mock.calls[0][0]).toEqual({
      recentRecipients: [mockRecipient, mockRecipient2],
      contactRecipients: [],
    })
  })
})

describe('mergeRecipients', () => {
  it('orders recipients correctly without duplicates', () => {
    const resolvedRecipients = [mockRecipient3]
    const recentRecipients = [mockRecipient2]
    const contactRecipients = [
      mockRecipient,
      {
        ...mockRecipient3,
        name: 'some other name',
      },
    ]
    const mergedRecipients = mergeRecipients({
      contactRecipients,
      recentRecipients,
      resolvedRecipients,
      uniqueSearchRecipient: mockRecipient4,
    })
    expect(mergedRecipients).toEqual([mockRecipient3, mockRecipient2, mockRecipient])
  })
  it('uses the unique recipient if none other available', () => {
    const mergedRecipients = mergeRecipients({
      contactRecipients: [],
      recentRecipients: [],
      resolvedRecipients: [],
      uniqueSearchRecipient: mockRecipient4,
    })
    expect(mergedRecipients).toEqual([mockRecipient4])
  })
  it('returns empty list when no recipients available', () => {
    const mergedRecipients = mergeRecipients({
      contactRecipients: [],
      recentRecipients: [],
      resolvedRecipients: [],
    })
    expect(mergedRecipients).toEqual([])
  })
  it('does not dedpulicate undefined address', () => {
    const mergedRecipients = mergeRecipients({
      contactRecipients: [
        {
          ...mockRecipient,
          address: undefined,
        },
      ],
      recentRecipients: [
        {
          ...mockRecipient2,
          e164PhoneNumber: 'fake phone number',
          address: undefined,
        },
      ],
      resolvedRecipients: [],
    })
    expect(mergedRecipients).toEqual([
      {
        ...mockRecipient2,
        e164PhoneNumber: 'fake phone number',
        address: undefined,
      },
      {
        ...mockRecipient,
        address: undefined,
      },
    ])
  })
  it('does not dedpulicate undefined phone number', () => {
    const mergedRecipients = mergeRecipients({
      contactRecipients: [
        {
          ...mockRecipient,
          e164PhoneNumber: undefined,
        },
      ],
      recentRecipients: [
        {
          ...mockRecipient2,
          e164PhoneNumber: undefined,
          address: 'some fake address',
        },
      ],
      resolvedRecipients: [],
    })
    expect(mergedRecipients).toEqual([
      {
        ...mockRecipient2,
        address: 'some fake address',
        e164PhoneNumber: undefined,
      },
      {
        ...mockRecipient,
        e164PhoneNumber: undefined,
      },
    ])
  })
})

describe('useUniqueSearchRecipient', () => {
  function renderHook(searchQuery: string) {
    const result = jest.fn()

    function TestComponent() {
      const recipient = useUniqueSearchRecipient(searchQuery)
      result(recipient)
      return null
    }

    render(
      <Provider store={getStore()}>
        <TestComponent />
      </Provider>
    )

    return result
  }

  it('returns unique phone number recipient', () => {
    const result = renderHook('7255555555')
    expect(result.mock.calls[0][0]).toEqual({
      displayNumber: '(725) 555-5555',
      e164PhoneNumber: '+17255555555',
      recipientType: RecipientType.PhoneNumber,
    })
  })
  it('returns unique address recipient', () => {
    const mockAddress = '0x000000000000000000000000000000000000ABCD'
    const result = renderHook(mockAddress)
    expect(result.mock.calls[0][0]).toEqual({
      address: mockAddress.toLowerCase(),
      recipientType: RecipientType.Address,
    })
  })
  it('returns no results', () => {
    const result = renderHook('neither address nor phone number')
    expect(result.mock.calls[0][0]).toBe(undefined)
  })
})

describe('useMapResolutionsToRecipients', () => {
  function renderHook(searchQuery: string, resolutions: NameResolution[]) {
    const result = jest.fn()

    function TestComponent() {
      const recipients = useMapResolutionsToRecipients(searchQuery, resolutions)
      result(recipients)
      return null
    }

    render(
      <Provider store={getStore()}>
        <TestComponent />
      </Provider>
    )

    return result
  }

  it('returns recipient for address-based resolution', () => {
    const mockResolutions = [
      {
        kind: ResolutionKind.Address,
        address: mockAccount,
      },
    ]
    const result = renderHook('some query', mockResolutions)
    expect(result.mock.calls[0][0][0]).toEqual({
      address: mockAccount.toLowerCase(),
      name: 'John Doe',
      thumbnailPath: undefined,
      contactId: 'contactId',
      e164PhoneNumber: '+14155550000',
      displayNumber: '14155550000',
      recipientType: RecipientType.Address,
    })
  })

  it('returns recipient for ENS-based resolution', () => {
    const mockResolutions = [
      {
        kind: ResolutionKind.Ens,
        address: mockAccount,
        name: 'Ens Handle',
      },
    ]
    const result = renderHook('some query', mockResolutions)
    expect(result.mock.calls[0][0][0]).toEqual({
      address: mockAccount.toLowerCase(),
      name: 'Ens Handle',
      recipientType: RecipientType.Ens,
    })
  })
})
