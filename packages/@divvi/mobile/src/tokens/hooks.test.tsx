import { render, renderHook } from '@testing-library/react-native'
import BigNumber from 'bignumber.js'
import React from 'react'
import { Text, View } from 'react-native'
import { Provider } from 'react-redux'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import {
  useAmountAsUsd,
  useCashInTokens,
  useCashOutTokens,
  useLocalToTokenAmount,
  useSwappableTokens,
  useTokenInfo,
  useTokenPricesAreStale,
  useTokensInfo,
  useTokenToLocalAmount,
} from 'src/tokens/hooks'
import { TokenBalance } from 'src/tokens/slice'
import { NetworkId } from 'src/transactions/types'
import { createMockStore } from 'test/utils'
import {
  mockAccount,
  mockCeloTokenId,
  mockCeurTokenId,
  mockCrealTokenId,
  mockCusdTokenId,
  mockPoofTokenId,
  mockTokenBalances,
  mockUSDCTokenId,
} from 'test/values'

jest.mock('src/statsig')

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(getFeatureGate).mockReturnValue(true)
})

const tokenAddressWithPriceAndBalance = '0x001'
const tokenIdWithPriceAndBalance = `celo-alfajores:${tokenAddressWithPriceAndBalance}`
const tokenAddressWithoutBalance = '0x002'
const tokenIdWithoutBalance = `celo-alfajores:${tokenAddressWithoutBalance}`
const ethTokenId = 'ethereum-sepolia:native'

function TestComponent({ tokenId }: { tokenId: string }) {
  const tokenAmount = useLocalToTokenAmount(new BigNumber(1), tokenId)
  const localAmount = useTokenToLocalAmount(new BigNumber(1), tokenId)
  const usdAmount = useAmountAsUsd(new BigNumber(1), tokenId)
  const tokenPricesAreStale = useTokenPricesAreStale()

  return (
    <View>
      <Text testID="tokenAmount">{tokenAmount?.toNumber()}</Text>
      <Text testID="localAmount">{localAmount?.toNumber()}</Text>
      <Text testID="usdAmount">{usdAmount?.toNumber()}</Text>
      <Text testID="pricesStale">{tokenPricesAreStale}</Text>
    </View>
  )
}

function TokenHookTestComponent({ hook }: { hook: () => TokenBalance[] }) {
  const tokens = hook()

  return <Text testID="tokenIDs">{tokens.map((token) => token.tokenId)}</Text>
}

const store = (usdToLocalRate: string | null, priceFetchedAt: number) =>
  createMockStore({
    tokens: {
      tokenBalances: {
        [tokenIdWithPriceAndBalance]: {
          address: tokenAddressWithPriceAndBalance,
          tokenId: tokenIdWithPriceAndBalance,
          networkId: NetworkId['celo-alfajores'],
          symbol: 'T1',
          balance: '0',
          priceUsd: '5',
          priceFetchedAt,
        },
        [tokenIdWithoutBalance]: {
          address: tokenAddressWithoutBalance,
          tokenId: tokenIdWithoutBalance,
          networkId: NetworkId['celo-alfajores'],
          symbol: 'T2',
          priceUsd: '5',
          balance: null,
          priceFetchedAt,
        },
      },
    },
    localCurrency: {
      usdToLocalRate,
    },
  })

const storeWithMultipleNetworkTokens = (walletAddress?: string) =>
  createMockStore({
    web3: {
      account: walletAddress ?? mockAccount,
    },
    tokens: {
      tokenBalances: {
        ...mockTokenBalances,
        [mockCrealTokenId]: {
          ...mockTokenBalances[mockCrealTokenId],
          balance: '1',
          minimumAppVersionToSwap: '1.0.0',
        },
        [mockCeloTokenId]: {
          ...mockTokenBalances[mockCeloTokenId],
          balance: '1',
          isSwappable: true,
        },
        [ethTokenId]: {
          tokenId: ethTokenId,
          symbol: 'ETH',
          balance: '10',
          priceUsd: '5',
          networkId: NetworkId['ethereum-sepolia'],
          priceFetchedAt: Date.now(),
          isCashInEligible: true,
          isCashOutEligible: true,
          minimumAppVersionToSwap: '0.0.1',
        },
      },
    },
    positions: {
      positions: [
        {
          type: 'app-token' as const,
          networkId: NetworkId['celo-alfajores'],
          tokenId: 'celo-alfajores:0xa',
          address: '0xa',
          priceUsd: '60',
          balance: '3',
          displayProps: {
            title: 'Title',
          },
          tokens: [
            {
              networkId: NetworkId['celo-alfajores'],
              tokenId: 'celo-alfajores:0xb',
              balance: '1',
              priceUsd: '30',
            },
            {
              networkId: NetworkId['celo-alfajores'],
              tokenId: 'celo-alfajores:0xc',
              balance: '2',
              priceUsd: '20',
            },
          ],
        },
      ],
    },
  })

describe('token to fiat exchanges', () => {
  it('maps correctly if all the info is available', async () => {
    const { getByTestId } = render(
      <Provider store={store('2', Date.now())}>
        <TestComponent tokenId={tokenIdWithPriceAndBalance} />
      </Provider>
    )

    const tokenAmount = getByTestId('tokenAmount')
    expect(tokenAmount.props.children).toEqual(0.1)
    const localAmount = getByTestId('localAmount')
    expect(localAmount.props.children).toEqual(10)
    const usdAmount = getByTestId('usdAmount')
    expect(usdAmount.props.children).toEqual(5)
    const pricesStale = getByTestId('pricesStale')
    expect(pricesStale.props.children).toEqual(false)
  })

  it('returns undefined if there is no balance set', async () => {
    const { getByTestId } = render(
      <Provider store={store('2', Date.now())}>
        <TestComponent tokenId={tokenIdWithoutBalance} />
      </Provider>
    )

    const tokenAmount = getByTestId('tokenAmount')
    expect(tokenAmount.props.children).toBeUndefined()
    const localAmount = getByTestId('localAmount')
    expect(localAmount.props.children).toBeUndefined()
    const usdAmount = getByTestId('usdAmount')
    expect(usdAmount.props.children).toBeUndefined()
    const pricesStale = getByTestId('pricesStale')
    expect(pricesStale.props.children).toEqual(false)
  })

  it('returns undefined if there is no exchange rate', async () => {
    const { getByTestId } = render(
      <Provider store={store(null, Date.now())}>
        <TestComponent tokenId={tokenIdWithPriceAndBalance} />
      </Provider>
    )

    const tokenAmount = getByTestId('tokenAmount')
    expect(tokenAmount.props.children).toBeUndefined()
    const localAmount = getByTestId('localAmount')
    expect(localAmount.props.children).toBeUndefined()

    // USD amount doesn't use the exchange rate
    const usdAmount = getByTestId('usdAmount')
    expect(usdAmount.props.children).toEqual(5)
    const pricesStale = getByTestId('pricesStale')
    expect(pricesStale.props.children).toEqual(false)
  })

  it('returns undefined if the token doesnt exist', async () => {
    const { getByTestId } = render(
      <Provider store={store('2', Date.now())}>
        <TestComponent tokenId={'0x000'} />
      </Provider>
    )

    const tokenAmount = getByTestId('tokenAmount')
    expect(tokenAmount.props.children).toBeUndefined()
    const localAmount = getByTestId('localAmount')
    expect(localAmount.props.children).toBeUndefined()
    const usdAmount = getByTestId('usdAmount')
    expect(usdAmount.props.children).toBeUndefined()
    const pricesStale = getByTestId('pricesStale')
    expect(pricesStale.props.children).toEqual(false)
  })

  it('shows prices are stale', async () => {
    const { getByTestId } = render(
      <Provider store={store('2', Date.now() - 100000000)}>
        <TestComponent tokenId={tokenIdWithPriceAndBalance} />
      </Provider>
    )

    const pricesStale = getByTestId('pricesStale')
    expect(pricesStale.props.children).toEqual(true)
  })
})

describe('useSwappableTokens', () => {
  it('returns sorted tokens with balance for the non-holdout group', () => {
    jest
      .mocked(getFeatureGate)
      .mockImplementation(
        (featureGate) => featureGate !== StatsigFeatureGates.SHUFFLE_SWAP_TOKENS_ORDER
      )
    const { result } = renderHook(() => useSwappableTokens(), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current.swappableToTokens.map((token) => token.tokenId)).toEqual([
      ethTokenId,
      mockCeloTokenId,
    ])
    expect(result.current.swappableFromTokens.map((token) => token.tokenId)).toEqual([
      ethTokenId,
      mockCeloTokenId,
      mockPoofTokenId,
      mockCrealTokenId,
    ])
  })

  it('returns deterministically shuffled tokens for each user in the holdout group', () => {
    const expectedToTokens1 = [mockCeloTokenId, ethTokenId]
    const expectedFromTokens1 = [mockPoofTokenId, mockCeloTokenId, ethTokenId, mockCrealTokenId]

    const expectedToTokens2 = [ethTokenId, mockCeloTokenId]
    const expectedFromTokens2 = [mockCrealTokenId, ethTokenId, mockPoofTokenId, mockCeloTokenId]

    const { result: result1 } = renderHook(() => useSwappableTokens(), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })
    const { result: result2 } = renderHook(() => useSwappableTokens(), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens('0xabcde')}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result1.current.swappableToTokens.map((token) => token.tokenId)).toEqual(
      expectedToTokens1
    )
    expect(result1.current.swappableFromTokens.map((token) => token.tokenId)).toEqual(
      expectedFromTokens1
    )
    expect(result1.current.areSwapTokensShuffled).toBe(true)

    expect(result2.current.swappableToTokens.map((token) => token.tokenId)).toEqual(
      expectedToTokens2
    )
    expect(result2.current.swappableFromTokens.map((token) => token.tokenId)).toEqual(
      expectedFromTokens2
    )
    expect(result2.current.areSwapTokensShuffled).toBe(true)
  })
})

describe('useCashInTokens', () => {
  it('returns tokens eligible for cash in', () => {
    const { getByTestId } = render(
      <Provider store={storeWithMultipleNetworkTokens()}>
        <TokenHookTestComponent hook={useCashInTokens} />
      </Provider>
    )

    expect(getByTestId('tokenIDs').props.children).toEqual([
      mockCeurTokenId,
      mockCusdTokenId,
      mockCeloTokenId,
      mockCrealTokenId,
      ethTokenId,
      mockUSDCTokenId,
    ])
  })
})

describe('useCashOutTokens', () => {
  it('returns tokens eligible for cash out', () => {
    const { getByTestId } = render(
      <Provider store={storeWithMultipleNetworkTokens()}>
        <TokenHookTestComponent hook={useCashOutTokens} />
      </Provider>
    )

    expect(getByTestId('tokenIDs').props.children).toEqual([mockCeloTokenId, ethTokenId])
  })
})

describe('useTokenInfo', () => {
  it('returns the token when it exists', () => {
    const { result } = renderHook(() => useTokenInfo(mockCeloTokenId), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current?.tokenId).toEqual(mockCeloTokenId)
  })

  it('returns position tokens when they exist', () => {
    const { result } = renderHook(() => useTokenInfo('celo-alfajores:0xb'), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current?.tokenId).toEqual('celo-alfajores:0xb')
  })

  it('returns undefined if the tokenId is not found', () => {
    const { result } = renderHook(() => useTokenInfo(undefined), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current).toBeUndefined()
  })
})

describe('useTokensInfo', () => {
  it('returns the token when it exists', () => {
    const { result } = renderHook(() => useTokensInfo([mockCeloTokenId, mockUSDCTokenId]), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current[0]?.tokenId).toEqual(mockCeloTokenId)
    expect(result.current[1]?.tokenId).toEqual(mockUSDCTokenId)
  })

  it('returns position tokens when they exist', () => {
    const { result } = renderHook(
      () => useTokensInfo(['celo-alfajores:0xb', 'celo-alfajores:0xc']),
      {
        wrapper: (component) => (
          <Provider store={storeWithMultipleNetworkTokens()}>
            {component?.children ? component.children : component}
          </Provider>
        ),
      }
    )

    expect(result.current[0]?.tokenId).toEqual('celo-alfajores:0xb')
    expect(result.current[1]?.tokenId).toEqual('celo-alfajores:0xc')
  })

  it('returns empty array if the tokenId is not found', () => {
    const { result } = renderHook(() => useTokensInfo(['iDoNotExist']), {
      wrapper: (component) => (
        <Provider store={storeWithMultipleNetworkTokens()}>
          {component?.children ? component.children : component}
        </Provider>
      ),
    })

    expect(result.current).toEqual([])
  })
})
