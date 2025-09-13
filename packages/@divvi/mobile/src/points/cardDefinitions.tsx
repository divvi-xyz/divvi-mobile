import React from 'react'
import { useTranslation } from 'react-i18next'
import IconWithNetworkBadge from 'src/components/IconWithNetworkBadge'
import Celebration from 'src/icons/Celebration'
import CircledIcon from 'src/icons/CircledIcon'
import EarnCoins from 'src/icons/EarnCoins'
import SwapArrows from 'src/icons/SwapArrows'
import { ClaimHistoryCardItem } from 'src/points/types'
import { useSelector } from 'src/redux/hooks'
import { NETWORK_NAMES } from 'src/shared/conts'
import colors from 'src/styles/colors'
import { tokensByIdSelector } from 'src/tokens/selectors'
import Logger from 'src/utils/Logger'

const TAG = 'Points/cardDefinitions'

const ICON_SIZE = 40

export interface HistoryCardMetadata {
  icon: React.ReactNode
  title: string
  subtitle: string
  pointsAmount: number
}

export function useGetHistoryDefinition(): (
  history: ClaimHistoryCardItem
) => HistoryCardMetadata | undefined {
  const { t } = useTranslation()
  const tokensById = useSelector(tokensByIdSelector)

  return (history: ClaimHistoryCardItem) => {
    switch (history.activityId) {
      case 'create-wallet': {
        return {
          icon: (
            <CircledIcon backgroundColor={colors.backgroundSecondary} radius={ICON_SIZE}>
              <Celebration color={colors.contentPrimary} />
            </CircledIcon>
          ),
          title: t('points.history.cards.createWallet.title'),
          subtitle: t('points.history.cards.createWallet.subtitle'),
          pointsAmount: history.pointsAmount,
        }
      }
      case 'swap': {
        const fromToken = tokensById[history.metadata.from]
        const toToken = tokensById[history.metadata.to]
        if (!fromToken || !toToken) {
          Logger.error(TAG, `Cannot find tokens ${history.metadata.from} or ${history.metadata.to}`)
          return undefined
        }
        return {
          icon: (
            <CircledIcon backgroundColor={colors.backgroundSecondary} radius={ICON_SIZE}>
              <SwapArrows color={colors.contentPrimary} />
            </CircledIcon>
          ),
          title: t('points.history.cards.swap.title'),
          subtitle: t('points.history.cards.swap.subtitle', {
            fromToken: fromToken.symbol,
            toToken: toToken.symbol,
          }),
          pointsAmount: history.pointsAmount,
        }
      }
      case 'deposit-earn': {
        const token = tokensById[history.metadata.tokenId]
        if (!token) {
          Logger.error(TAG, `Cannot find token ${history.metadata.tokenId}`)
          return undefined
        }
        return {
          icon: (
            <IconWithNetworkBadge networkId={token.networkId}>
              <CircledIcon backgroundColor={colors.backgroundSecondary} radius={ICON_SIZE}>
                <EarnCoins color={colors.contentPrimary} />
              </CircledIcon>
            </IconWithNetworkBadge>
          ),
          title: t('points.history.cards.depositEarn.title'),
          subtitle: t('points.history.cards.depositEarn.subtitle', {
            network: NETWORK_NAMES[token.networkId],
          }),
          pointsAmount: history.pointsAmount,
        }
      }
      default: {
        const _exhaustiveCheck: never = history
        return _exhaustiveCheck
      }
    }
  }
}
