import MockDate from 'mockdate'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { normalizeAddress } from 'src/utils/address'
import {
  KeychainAccounts,
  clearStoredAccounts,
  encryptPrivateKey,
  getStoredPrivateKey,
  listStoredAccounts,
} from 'src/web3/KeychainAccounts'
import * as mockedKeychain from 'test/mockedKeychain'
import {
  mockAddress,
  mockAddress2,
  mockKeychainEncryptedPrivateKey,
  mockKeychainEncryptedPrivateKey2,
  mockPrivateKey,
} from 'test/values'

const MOCK_DATE = new Date('2016-12-21T23:36:07.071Z')

beforeEach(() => {
  jest.clearAllMocks()
  mockedKeychain.clearAllItems()
})

afterEach(() => {
  MockDate.reset()
})

describe(listStoredAccounts, () => {
  it('lists all addresses sorted by creation date', async () => {
    // Setup mocked keychain content, intentionally ordering items in descending creation date
    // created using:
    // await lock.addAccount(PRIVATE_KEY1, 'password')
    // await lock.addAccount(PRIVATE_KEY2, 'password2')
    mockedKeychain.setItems({
      'account--2022-05-25T11:14:50.292Z--588e4b68193001e4d10928660ab4165b813717c0': {
        password: mockKeychainEncryptedPrivateKey2,
      },
      // This will be ignored
      'unrelated item': {
        password: 'unrelated password',
      },
      'account--2021-01-10T11:14:50.298Z--1be31a94361a391bbafb2a4ccd704f57dc04d4bb': {
        password: mockKeychainEncryptedPrivateKey,
      },
    })

    expect(await listStoredAccounts()).toEqual([
      {
        address: mockAddress,
        createdAt: new Date('2021-01-10T11:14:50.298Z'),
      },
      {
        address: mockAddress2,
        createdAt: new Date('2022-05-25T11:14:50.292Z'),
      },
    ])
  })
})

describe(clearStoredAccounts, () => {
  it('only clears the stored accounts', async () => {
    mockedKeychain.setItems({
      'account--2022-05-25T11:14:50.292Z--588e4b68193001e4d10928660ab4165b813717c0': {
        password: 'encrypted password',
      },
      'unrelated item': {
        password: 'unrelated password',
      },
      'account--2021-01-10T11:14:50.298Z--1be31a94361a391bbafb2a4ccd704f57dc04d4bb': {
        password: 'encrypted password2',
      },
    })

    await expect(clearStoredAccounts()).resolves.toBe(undefined)

    expect(mockedKeychain.getAllKeys()).toEqual(['unrelated item'])
  })
})

describe('KeychainAccounts', () => {
  let accounts: KeychainAccounts
  let date: Date

  beforeEach(() => {
    accounts = new KeychainAccounts()
    date = new Date()
  })

  const mockAddressInUpperCase = `0x${mockAddress.substring(2).toUpperCase()}`
  const mockAddressInLowerCase = mockAddress.toLowerCase()

  describe('addAccount', () => {
    beforeEach(() => {
      MockDate.set(MOCK_DATE)
    })

    it('adds a new account', async () => {
      const account = await accounts.addAccount(mockPrivateKey, 'password')

      expect(account).toEqual({
        address: mockAddress,
        createdAt: MOCK_DATE,
      })
      expect(mockedKeychain.getAllKeys()).toEqual([
        `account--2016-12-21T23:36:07.071Z--${mockAddress.substring(2)}`,
      ])
    })
    it('succeeds with a private key without 0x', async () => {
      const account = await accounts.addAccount(mockPrivateKey.substring(2), 'password')
      expect(account).toEqual({
        address: mockAddress,
        createdAt: MOCK_DATE,
      })
      expect(mockedKeychain.getAllKeys()).toEqual([
        `account--2016-12-21T23:36:07.071Z--${mockAddress.substring(2)}`,
      ])
    })
    it('fails with an invalid private key', async () => {
      await expect(
        accounts.addAccount('this is not a valid private key', 'password')
      ).rejects.toThrowError('invalid private key, expected hex or 32 bytes, got string')
    })
    it('fails if the account already exists', async () => {
      await accounts.addAccount(mockPrivateKey, 'password')
      await expect(accounts.addAccount(mockPrivateKey, 'password')).rejects.toThrowError(
        ErrorMessages.KEYCHAIN_ACCOUNT_ALREADY_EXISTS
      )
    })
  })

  describe('isUnlocked', () => {
    it('returns false if the account has not been added', () => {
      expect(accounts.isUnlocked(mockAddress)).toBe(false)
    })
    it('returns false if the account has been added but not unlocked', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      expect(accounts.isUnlocked(mockAddress)).toBe(false)
    })
    it('returns false if the account has been added and unlocked but the duration has passed', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      await accounts.unlock(mockAddress, 'password', -1) // spoofing duration passed by using a negative duration
      expect(accounts.isUnlocked(mockAddress)).toBe(false)
    })
    it('returns true if the account has been added and unlocked and the duration has not passed', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      await accounts.unlock(mockAddress, 'password', 100)
      expect(accounts.isUnlocked(mockAddress)).toBe(true)
      // check for different casing
      expect(accounts.isUnlocked(mockAddressInLowerCase)).toBe(true)
      expect(accounts.isUnlocked(mockAddressInUpperCase)).toBe(true)
    })
  })

  describe('unlock', () => {
    it('returns false if the account has not been added', async () => {
      expect(await accounts.unlock(mockAddress, 'password', 100)).toBe(false)
    })
    it('throws if the account has been added but private key is not in the keychain', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      // now remove from keychain
      mockedKeychain.clearAllItems()
      await expect(accounts.unlock(mockAddress, 'password', 100)).rejects.toThrow()
    })
    it('returns true if account is unlocked with all uppercase address', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      expect(await accounts.unlock(mockAddressInUpperCase, 'password', 100)).toBe(true)
    })
    it('unlocks the viem account', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      const viemAccount = accounts.getViemAccount(mockAddress)
      await expect(viemAccount?.signMessage({ message: 'flarf' })).rejects.toThrowError(
        'authentication needed: password or unlock'
      )
      expect(accounts.isUnlocked(mockAddress)).toBe(false)
      expect(await accounts.unlock(mockAddress, 'password', 100)).toBe(true)
      expect(accounts.isUnlocked(mockAddress)).toBe(true)
      expect(await viemAccount?.signMessage({ message: 'flarf' })).toEqual(expect.any(String))
    })
  })

  describe('updatePassphrase', () => {
    it('returns false if the account has not been added', async () => {
      expect(await accounts.updatePassphrase(mockAddress, 'password', 'new-password')).toBe(false)
    })

    it('throws if the account has been added but private key is not in the keychain', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      // now remove from keychain
      mockedKeychain.clearAllItems()
      await expect(
        accounts.updatePassphrase(mockAddress, 'password', 'new-password')
      ).rejects.toThrow()
    })

    it('returns true if the account and key is present and address is passed in different case', async () => {
      mockedKeychain.setItems({
        [`account--${date.toISOString()}--${normalizeAddress(mockAddress)}`]: {
          password: mockKeychainEncryptedPrivateKey,
        },
      })
      await accounts.loadExistingAccounts()
      expect(
        await accounts.updatePassphrase(mockAddressInUpperCase, 'password', 'new-password')
      ).toBe(true)
    })
  })
})

describe(getStoredPrivateKey, () => {
  const mockAccount = {
    address: '0x74c3b45eF45D7b02fcbF6afB0F8e9C003159DE0B',
    createdAt: new Date('2023-10-11T00:41:52.000Z'),
  }

  beforeEach(() => {
    mockedKeychain.clearAllItems()
  })

  it('pads a 63-character private key to 64 characters', async () => {
    // This simulates a private key with a leading zero that was stored as 63 chars
    const unpaddedPrivateKey = 'caa40f3d93ff6736a0e1dc4d156c49e8e6f0938c696526e435c5db37531c9f'
    const encryptedKey = await encryptPrivateKey(unpaddedPrivateKey, 'password')

    mockedKeychain.setItems({
      [`account--${mockAccount.createdAt.toISOString()}--${normalizeAddress(mockAccount.address)}`]:
        {
          password: encryptedKey,
        },
    })

    const result = await getStoredPrivateKey(mockAccount, 'password')

    // Should be padded to 64 chars and have 0x prefix (66 total)
    expect(result).toBe('0x00caa40f3d93ff6736a0e1dc4d156c49e8e6f0938c696526e435c5db37531c9f')
    expect(result?.length).toBe(66) // 0x + 64 chars
  })

  it('handles a private key already stored with 0x prefix (63 chars after prefix)', async () => {
    const unpaddedPrivateKey = '0xcaa40f3d93ff6736a0e1dc4d156c49e8e6f0938c696526e435c5db37531c9f'
    const encryptedKey = await encryptPrivateKey(unpaddedPrivateKey, 'password')

    mockedKeychain.setItems({
      [`account--${mockAccount.createdAt.toISOString()}--${normalizeAddress(mockAccount.address)}`]:
        {
          password: encryptedKey,
        },
    })

    const result = await getStoredPrivateKey(mockAccount, 'password')

    expect(result).toBe('0x00caa40f3d93ff6736a0e1dc4d156c49e8e6f0938c696526e435c5db37531c9f')
    expect(result?.length).toBe(66)
  })

  it('does not modify a correctly formatted 64-character private key', async () => {
    const properPrivateKey = '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const encryptedKey = await encryptPrivateKey(properPrivateKey, 'password')

    mockedKeychain.setItems({
      [`account--${mockAccount.createdAt.toISOString()}--${normalizeAddress(mockAccount.address)}`]:
        {
          password: encryptedKey,
        },
    })

    const result = await getStoredPrivateKey(mockAccount, 'password')

    expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
    expect(result?.length).toBe(66)
  })

  it('does not modify a correctly formatted private key with 0x prefix', async () => {
    const properPrivateKey = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    const encryptedKey = await encryptPrivateKey(properPrivateKey, 'password')

    mockedKeychain.setItems({
      [`account--${mockAccount.createdAt.toISOString()}--${normalizeAddress(mockAccount.address)}`]:
        {
          password: encryptedKey,
        },
    })

    const result = await getStoredPrivateKey(mockAccount, 'password')

    expect(result).toBe('0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef')
    expect(result?.length).toBe(66)
  })
})
