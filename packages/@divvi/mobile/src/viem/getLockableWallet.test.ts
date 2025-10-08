import { Network } from 'src/transactions/types'
import { viemTransports } from 'src/viem'
import getLockableViemWallet, { getLockableViemSmartWallet, getTransport, ViemWallet } from 'src/viem/getLockableWallet'
import { KeychainAccounts } from 'src/web3/KeychainAccounts'
import {
  mockAccount2,
  mockAddress,
  mockContractAddress,
  mockPrivateKey,
  mockTypedData,
} from 'test/values'
import { custom, erc20Abi, getAddress, toHex } from 'viem'
import {
  sendTransaction,
  signMessage,
  signTransaction,
  signTypedData,
  writeContract,
} from 'viem/actions'
import { celoAlfajores, goerli as ethereumGoerli, sepolia as ethereumSepolia } from 'viem/chains'

jest.mock('src/viem', () => {
  const mockTransport = jest.fn().mockReturnValue({
    request: jest.fn(),
    config: {},
  })
  return {
    viemTransports: {
      celo: mockTransport,
      ethereum: mockTransport,
    },
    appViemTransports: {
      celo: mockTransport,
    },
    publicClient: {
      celo: 'celoPublicClient',
      ethereum: 'ethereumPublicClient',
    },
  }
})

// Mock permissionless modules
jest.mock('permissionless', () => ({
  createSmartAccountClient: jest.fn(),
}))

jest.mock('permissionless/accounts', () => ({
  to7702KernelSmartAccount: jest.fn(),
}))

describe('getTransport', () => {
  it.each([
    [celoAlfajores, false, expect.any(Function)],
    [celoAlfajores, true, expect.any(Function)],
    [ethereumSepolia, false, expect.any(Function)],
  ])('returns correct transport for $s', (chain, useApp, expectedTransport) => {
    expect(getTransport({ chain, useApp })).toEqual(expectedTransport)
  })
  it('throws if chain not found', () => {
    expect(() => getTransport({ chain: ethereumGoerli })).toThrow()
  })
  it('throws if app transport not found', () => {
    expect(() => getTransport({ chain: ethereumSepolia, useApp: true })).toThrow()
  })
})

const methodsParams: Record<string, any> = {
  sendTransaction: {
    to: '0x0000000000000000000000000000000000000000',
    value: BigInt(1),
  },
  signTransaction: {
    to: '0x0000000000000000000000000000000000000000',
    value: BigInt(1),
    maxFeePerGas: BigInt(2),
  },
  signTypedData: { ...mockTypedData, account: undefined },
  signMessage: {
    message: 'hello world',
  },
  writeContract: {
    address: getAddress(mockContractAddress),
    abi: erc20Abi,
    functionName: 'transfer',
    args: ['0x0000000000000000000000000000000000000000', BigInt(1)],
  },
}

describe('getLockableWallet', () => {
  let wallet: ViemWallet
  let accounts: KeychainAccounts

  beforeEach(async () => {
    jest.clearAllMocks()
    const mockRequest = jest.fn(async ({ method }) => {
      switch (method) {
        case 'eth_chainId':
          return toHex(BigInt(44787))
        case 'eth_getTransactionCount':
          return toHex(BigInt(1))
        case 'eth_getBlockByNumber':
          return {} // Far from the real response, but enough for testing
        case 'eth_gasPrice':
          return toHex(BigInt(5))
        case 'eth_estimateGas':
          return toHex(BigInt(10))
        case 'eth_sendRawTransaction':
          return '0x123456789'
        default:
          throw new Error(`Test method not implemented: ${method}`)
      }
    })
    const mockTransport = custom({ request: mockRequest })
    viemTransports[Network.Celo] = mockTransport
    viemTransports[Network.Ethereum] = mockTransport
    accounts = new KeychainAccounts()
    await accounts.addAccount(mockPrivateKey, 'password')
    wallet = getLockableViemWallet(accounts, celoAlfajores, mockAddress)
  })

  it.each([
    ['sendTransaction', (args: any) => wallet.sendTransaction(args)],
    ['signTransaction', (args: any) => wallet.signTransaction(args)],
    ['signTypedData', (args: any) => wallet.signTypedData(args)],
    ['signMessage', (args: any) => wallet.signMessage(args)],
    ['writeContract', (args: any) => wallet.writeContract(args)],
  ])('cannot call %s if not unlocked', async (methodName, methodCall) => {
    await expect(methodCall(methodsParams[methodName])).rejects.toThrowError(
      'authentication needed: password or unlock'
    )
  })

  it.each([
    { method: sendTransaction, methodCall: (args: any) => wallet.sendTransaction(args) },
    { method: signTransaction, methodCall: (args: any) => wallet.signTransaction(args) },
    { method: signTypedData, methodCall: (args: any) => wallet.signTypedData(args) },
    { method: signMessage, methodCall: (args: any) => wallet.signMessage(args) },
    { method: writeContract, methodCall: (args: any) => wallet.writeContract(args) },
  ])('can call $method.name if unlocked', async ({ method, methodCall }) => {
    const unlocked = await wallet.unlockAccount('password', 100)
    expect(unlocked).toBe(true)
    await expect(methodCall(methodsParams[method.name])).resolves.toBeDefined()
  })

  it("throws if account doesn't exist in the keychain", () => {
    expect(() => getLockableViemWallet(accounts, celoAlfajores, mockAccount2)).toThrow(
      `Account ${mockAccount2} not found in KeychainAccounts`
    )
  })
})

describe('getLockableViemSmartWallet', () => {
  let accounts: KeychainAccounts

  beforeEach(async () => {
    jest.clearAllMocks()

    // Mock the smart account to return a simple object with the expected methods
    const mockSmartAccount = {
      isDeployed: jest.fn().mockResolvedValue(true),
    }

    const { to7702KernelSmartAccount } = require('permissionless/accounts')
    to7702KernelSmartAccount.mockResolvedValue(mockSmartAccount)

    // Mock createSmartAccountClient to return a client with extend method
    const { createSmartAccountClient } = require('permissionless')
    createSmartAccountClient.mockReturnValue({
      extend: jest.fn((extender) => {
        const extended = extender({})
        return {
          account: mockSmartAccount,
          unlockAccount: jest.fn().mockResolvedValue(true),
          ...extended,
        }
      }),
    })

    const mockRequest = jest.fn(async ({ method }) => {
      switch (method) {
        case 'eth_chainId':
          return toHex(BigInt(44787))
        case 'eth_getTransactionCount':
          return toHex(BigInt(1))
        case 'eth_getBlockByNumber':
          return {} // Far from the real response, but enough for testing
        case 'eth_gasPrice':
          return toHex(BigInt(5))
        case 'eth_estimateGas':
          return toHex(BigInt(10))
        case 'eth_sendRawTransaction':
          return '0x123456789'
        case 'eth_getCode':
          return '0x' // Mock deployed contract code
        default:
          throw new Error(`Test method not implemented: ${method}`)
      }
    })
    const mockTransport = custom({ request: mockRequest })
    viemTransports[Network.Celo] = mockTransport
    viemTransports[Network.Ethereum] = mockTransport
    accounts = new KeychainAccounts()
    await accounts.addAccount(mockPrivateKey, 'password')
  })

  it('returns a smart wallet with account property', async () => {
    const smartWallet = await getLockableViemSmartWallet(accounts, celoAlfajores, mockAddress)

    expect(smartWallet).toBeDefined()
    expect(smartWallet.account).toBeDefined()
    expect(smartWallet.account.isDeployed).toBeDefined()
    expect(typeof smartWallet.account.isDeployed).toBe('function')
  })

  it('can check if smart account is deployed', async () => {
    const smartWallet = await getLockableViemSmartWallet(accounts, celoAlfajores, mockAddress)
    const isDeployed = await smartWallet.account.isDeployed()

    expect(typeof isDeployed).toBe('boolean')
  })

  it('has unlockAccount method', async () => {
    const smartWallet = await getLockableViemSmartWallet(accounts, celoAlfajores, mockAddress)

    expect(smartWallet.unlockAccount).toBeDefined()
    expect(typeof smartWallet.unlockAccount).toBe('function')
  })

  it('can unlock account', async () => {
    const smartWallet = await getLockableViemSmartWallet(accounts, celoAlfajores, mockAddress)
    const unlocked = await smartWallet.unlockAccount('password', 100)

    expect(unlocked).toBe(true)
  })

  it("throws if account doesn't exist in the keychain", async () => {
    await expect(
      getLockableViemSmartWallet(accounts, celoAlfajores, mockAccount2)
    ).rejects.toThrow(`Account ${mockAccount2} not found in KeychainAccounts`)
  })

  it('throws if chain is not supported', async () => {
    await expect(
      getLockableViemSmartWallet(accounts, ethereumGoerli, mockAddress)
    ).rejects.toThrow(`No network defined for viem chain [object Object], cannot create wallet`)
  })

  it('works with useAppTransport parameter', async () => {
    const smartWalletWithAppTransport = await getLockableViemSmartWallet(
      accounts,
      celoAlfajores,
      mockAddress,
      true
    )

    expect(smartWalletWithAppTransport).toBeDefined()
    expect(smartWalletWithAppTransport.account).toBeDefined()
  })
})
