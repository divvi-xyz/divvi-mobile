import { useTranslation } from 'react-i18next'
import { FilterChip } from 'src/components/FilterChipsCarousel'
import { TOKEN_MIN_AMOUNT } from 'src/config'
import { useSelector } from 'src/redux/hooks'
import { getDynamicConfigParams, getFeatureGate } from 'src/statsig'
import { DynamicConfigs } from 'src/statsig/constants'
import { StatsigDynamicConfigs, StatsigFeatureGates } from 'src/statsig/types'
import { lastSwappedSelector } from 'src/swap/selectors'
import { Field } from 'src/swap/types'
import { useTokensWithTokenBalance } from 'src/tokens/hooks'
import { TokenBalance } from 'src/tokens/slice'
import { NetworkId } from 'src/transactions/types'
import { getSupportedNetworkIds } from 'src/web3/utils'

export default function useFilterChip(
  selectingField: Field | null,
  preselectedNetworkId?: NetworkId
): FilterChip<TokenBalance>[] {
  const { t } = useTranslation()

  const showSwapTokenFilters = getFeatureGate(StatsigFeatureGates.SHOW_SWAP_TOKEN_FILTERS)
  const showUKCompliantVariant = getFeatureGate(StatsigFeatureGates.SHOW_UK_COMPLIANT_VARIANT)
  const popularTokenIds: string[] = getDynamicConfigParams(
    DynamicConfigs[StatsigDynamicConfigs.SWAP_CONFIG]
  ).popularTokenIds

  const recentlySwappedTokens = useSelector(lastSwappedSelector)
  const tokensWithBalance = useTokensWithTokenBalance()
  const supportedNetworkIds = getSupportedNetworkIds()

  if (!showSwapTokenFilters) {
    return []
  }

  return [
    {
      id: 'my-tokens',
      name: t('tokenBottomSheet.filters.myTokens'),
      filterFn: (token: TokenBalance) => token.balance.gte(TOKEN_MIN_AMOUNT),
      isSelected: selectingField === Field.FROM && tokensWithBalance.length > 0,
    },
    ...(showUKCompliantVariant
      ? []
      : [
          {
            id: 'popular',
            name: t('tokenBottomSheet.filters.popular'),
            filterFn: (token: TokenBalance) => popularTokenIds.includes(token.tokenId),
            isSelected: false,
          },
        ]),
    {
      id: 'recently-swapped',
      name: t('tokenBottomSheet.filters.recentlySwapped'),
      filterFn: (token: TokenBalance) => recentlySwappedTokens.includes(token.tokenId),
      isSelected: false,
    },
    {
      id: 'network-ids',
      name: t('tokenBottomSheet.filters.selectNetwork'),
      filterFn: (token: TokenBalance, selected?: NetworkId[]) => {
        return !!selected && selected.includes(token.networkId)
      },
      isSelected: !!preselectedNetworkId,
      allNetworkIds: supportedNetworkIds,
      selectedNetworkIds: preselectedNetworkId ? [preselectedNetworkId] : supportedNetworkIds,
    },
  ]
}
