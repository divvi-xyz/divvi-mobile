import { estimateFeesPerGas } from 'src/viem/estimateFeesPerGas'
import networkConfig from 'src/web3/networkConfig'
import { Block } from 'viem'
import { getBlock } from 'viem/actions'
import { mainnet } from 'viem/chains'

jest.mock('viem/actions', () => ({
  ...jest.requireActual('viem/actions'),
  getBlock: jest.fn(),
}))

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getBlock).mockResolvedValue({ baseFeePerGas: BigInt(50) } as Block)
})

describe(estimateFeesPerGas, () => {
  it('should return the correct fees per gas on Celo', async () => {
    const client = {
      chain: networkConfig.viemChain.celo,
      request: jest.fn(async ({ method, params }) => {
        expect(params).toBeUndefined()
        if (method === 'eth_gasPrice') return '0x64' // 100 in hex
        if (method === 'eth_maxPriorityFeePerGas') return '0xa' // 10 in hex
        throw new Error(`Unknown method ${method}`)
      }),
    }
    const fees = await estimateFeesPerGas(client as any)
    expect(fees).toEqual({
      maxFeePerGas: BigInt(70), // baseFeePerGas * 1.2 (default multiplier in viem)
      maxPriorityFeePerGas: BigInt(10),
      baseFeePerGas: BigInt(50),
    })
  })

  it('should return the correct fees per gas on Celo when fee currency is specified', async () => {
    const client = {
      chain: networkConfig.viemChain.celo,
      request: jest.fn(async ({ method, params }) => {
        // Celo's estimateFeePerGas calls it to check whether we're post L2
        // See https://github.com/wevm/viem/blob/8c425c3be08f6cedc3d8fcca9f8cfe1fe493a4a3/src/celo/fees.ts#L101-L105
        if (method === 'eth_getCode') return '0x1'
        expect(params).toEqual(['0x123'])
        if (method === 'eth_gasPrice') return '0x64' // 100 in hex
        if (method === 'eth_maxPriorityFeePerGas') return '0xa' // 10 in hex
        throw new Error(`Unknown method ${method}`)
      }),
    }
    const fees = await estimateFeesPerGas(client as any, '0x123')
    // eth_gasPrice for cel2 returns baseFeePerGas + maxPriorityFeePerGas
    expect(fees).toEqual({
      maxFeePerGas: BigInt(118), // (eth_gasPrice - eth_maxPriorityFeePerGas) * 1.2 + eth_maxPriorityFeePerGas
      maxPriorityFeePerGas: BigInt(10),
      baseFeePerGas: BigInt(90), // eth_gasPrice - eth_maxPriorityFeePerGas
    })
  })

  it('should throw if fee currency is specified but not able to capture baseFeePerGas', async () => {
    const client = {
      chain: {
        ...networkConfig.viemChain.celo,
        fees: {
          // This custom estimateFeesPerGas doesn't call multiply, so it won't capture the baseFeePerGas
          estimateFeesPerGas: jest.fn(async () => ({
            maxFeePerGas: BigInt(130),
            maxPriorityFeePerGas: BigInt(10),
          })),
        },
      },
      request: jest.fn(async ({ method, params }) => {
        throw new Error(`Unknown method ${method}`)
      }),
    }
    await expect(estimateFeesPerGas(client as any, '0x123')).rejects.toThrow(
      'Unable to capture baseFeePerGas'
    )
  })

  it('should return the default fees per gas on other networks', async () => {
    const client = {
      chain: mainnet,
      request: jest.fn(async ({ method, params }) => {
        expect(params).toBeUndefined()
        if (method === 'eth_maxPriorityFeePerGas') return '0xa' // 10 in hex
        throw new Error(`Unknown method ${method}`)
      }),
    }
    const fees = await estimateFeesPerGas(client as any)
    expect(fees).toEqual({
      maxFeePerGas: BigInt(70),
      maxPriorityFeePerGas: BigInt(10),
      baseFeePerGas: BigInt(50),
    })
    expect(getBlock).toHaveBeenCalledWith(client)
    expect(getBlock).toHaveBeenCalledTimes(1)
  })

  it('should throw on other networks when fee currency is specified', async () => {
    const client = {
      chain: mainnet,
      request: jest.fn(async ({ method, params }) => {
        expect(params).toBeUndefined()
        if (method === 'eth_maxPriorityFeePerGas') return '0xa' // 10 in hex
        throw new Error(`Unknown method ${method}`)
      }),
    }
    await expect(estimateFeesPerGas(client as any, '0x123')).rejects.toThrow(
      'feeCurrency is only supported on Celo'
    )
    expect(getBlock).not.toHaveBeenCalled()
  })

  it('should throw on other networks if baseFeePerGas is missing', async () => {
    jest.mocked(getBlock).mockResolvedValue({ hash: '0x123', baseFeePerGas: null } as any as Block)
    const client = {
      chain: mainnet,
      request: jest.fn(async ({ method, params }) => {
        expect(params).toBeUndefined()
        if (method === 'eth_maxPriorityFeePerGas') return '0xa' // 10 in hex
        throw new Error(`Unknown method ${method}`)
      }),
    }
    await expect(estimateFeesPerGas(client as any)).rejects.toThrow(
      'missing baseFeePerGas on block: 0x123'
    )
    expect(getBlock).toHaveBeenCalledWith(client)
    expect(getBlock).toHaveBeenCalledTimes(1)
  })
})
