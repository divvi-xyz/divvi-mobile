import BigNumber from 'bignumber.js'
import { TIME_UNTIL_TOKEN_INFO_BECOMES_STALE } from 'src/config'
import { usdToLocalCurrencyRateSelector } from 'src/localCurrency/selectors'
import { useSelector } from 'src/redux/hooks'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import {
  cashInTokensSelector,
  cashOutTokensSelector,
  spendTokensSelector,
  swappableFromTokensSelector,
  swappableToTokensSelector,
  tokensByAddressSelector,
  tokensByCurrencySelector,
  tokensByIdSelector,
  tokensListSelector,
  tokensListWithAddressSelector,
  tokensWithTokenBalanceSelector,
  tokensWithUsdValueSelector,
  totalTokenBalanceSelector,
} from 'src/tokens/selectors'
import { TokenBalance } from 'src/tokens/slice'
import { convertLocalToTokenAmount, convertTokenToLocalAmount } from 'src/tokens/utils'
import { Currency } from 'src/utils/currencies'
import { deterministicShuffle } from 'src/utils/random'
import { walletAddressSelector } from 'src/web3/selectors'

/**
 * @deprecated use useTokenInfo and select using tokenId
 */
export function useTokenInfoByAddress(tokenAddress?: string | null) {
  const tokens = useSelector(tokensByAddressSelector)
  return tokenAddress ? tokens[tokenAddress] : undefined
}

export function useTokensWithUsdValue() {
  return useSelector(tokensWithUsdValueSelector)
}

export function useTotalTokenBalance() {
  return useSelector(totalTokenBalanceSelector)
}

export function useTokensWithTokenBalance() {
  return useSelector(tokensWithTokenBalanceSelector)
}

export function useTokensInfoUnavailable() {
  const totalBalance = useSelector(totalTokenBalanceSelector)
  return totalBalance === null
}

export function useTokensList() {
  return useSelector(tokensListSelector)
}

export function useTokenPricesAreStale() {
  const tokens = useSelector(tokensListSelector)
  // If no tokens then prices cannot be stale
  if (tokens.length === 0) return false
  // Put tokens with priceUsd into an array
  const tokensWithUsdValue = tokens.filter((tokenInfo) => tokenInfo.priceUsd !== null)
  // If tokens with usd value exist, check the time price was fetched and if ANY are stale - return true
  // Else tokens usd values are not present so we know prices are stale - return true
  if (tokensWithUsdValue.length > 0) {
    return tokensWithUsdValue.some(
      (tokenInfo) =>
        (tokenInfo.priceFetchedAt ?? 0) < Date.now() - TIME_UNTIL_TOKEN_INFO_BECOMES_STALE
    )
  } else {
    return true
  }
}

export function useSwappableTokens() {
  const shouldShuffleTokens = getFeatureGate(StatsigFeatureGates.SHUFFLE_SWAP_TOKENS_ORDER)

  const walletAddress = useSelector(walletAddressSelector)
  const swappableFromTokens = useSelector(swappableFromTokensSelector)
  const swappableToTokens = useSelector(swappableToTokensSelector)

  if (shouldShuffleTokens && walletAddress) {
    return {
      swappableFromTokens: deterministicShuffle(swappableFromTokens, 'tokenId', walletAddress),
      swappableToTokens: deterministicShuffle(swappableToTokens, 'tokenId', walletAddress),
      areSwapTokensShuffled: true,
    }
  }

  return {
    swappableFromTokens,
    swappableToTokens,
    areSwapTokensShuffled: false,
  }
}

export function useCashInTokens() {
  return useSelector(cashInTokensSelector)
}

export function useCashOutTokens(showZeroBalanceTokens: boolean = false) {
  return useSelector((state) => cashOutTokensSelector(state, showZeroBalanceTokens))
}

export function useSpendTokens() {
  return useSelector(spendTokensSelector)
}

export function useTokenInfo(tokenId?: string): TokenBalance | undefined {
  const tokens = useSelector((state) => tokensByIdSelector(state, { includePositionTokens: true }))
  return tokenId ? tokens[tokenId] : undefined
}

export function useTokensInfo(tokenIds: string[]): (TokenBalance | undefined)[] {
  const tokens = useSelector((state) => tokensByIdSelector(state, { includePositionTokens: true }))
  return tokenIds.map((tokenId) => tokens[tokenId])
}

/**
 * @deprecated
 */
export function useTokenInfoWithAddressBySymbol(symbol: string) {
  const tokens = useSelector(tokensListWithAddressSelector)
  return tokens.find((tokenInfo) => tokenInfo.symbol === symbol)
}

export function useTokenInfoByCurrency(currency: Currency) {
  const tokens = useSelector(tokensByCurrencySelector)
  return tokens[currency]
}

export function useLocalToTokenAmount(
  localAmount: BigNumber,
  tokenId: string | undefined
): BigNumber | null {
  const tokenInfo = useTokenInfo(tokenId)
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)
  return convertLocalToTokenAmount({
    localAmount,
    tokenInfo,
    usdToLocalRate,
  })
}

export function useTokenToLocalAmount(
  tokenAmount: BigNumber,
  tokenId: string | undefined
): BigNumber | null {
  const tokenInfo = useTokenInfo(tokenId)
  const usdToLocalRate = useSelector(usdToLocalCurrencyRateSelector)
  return convertTokenToLocalAmount({
    tokenAmount,
    tokenInfo,
    usdToLocalRate,
  })
}

export function useAmountAsUsd(amount: BigNumber, tokenId: string | undefined) {
  const tokenInfo = useTokenInfo(tokenId)
  if (!tokenInfo?.priceUsd) {
    return null
  }
  return amount.multipliedBy(tokenInfo.priceUsd)
}
