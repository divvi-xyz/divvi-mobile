import BigNumber from 'bignumber.js'
import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useSelector } from 'react-redux'
import { type BottomSheetModalRefType } from 'src/components/BottomSheet'
import InfoBottomSheet, {
  InfoBottomSheetContentBlock,
  InfoBottomSheetHeading,
  InfoBottomSheetParagraph,
} from 'src/components/InfoBottomSheet'
import { ReviewDetailsItem } from 'src/components/ReviewTransaction'
import RowDivider from 'src/components/RowDivider'
import { APP_NAME } from 'src/config'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { Spacing } from 'src/styles/styles'
import type { AppFeeAmount, SwapFeeAmount } from 'src/swap/types'
import { useTokenToLocalAmount } from 'src/tokens/hooks'
import type { TokenBalance } from 'src/tokens/slice'

const TAG = 'components/FeeInfoBottomSheet'

interface Props {
  forwardedRef: React.RefObject<BottomSheetModalRefType>
  appFee?: AppFeeAmount
  crossChainFee?: SwapFeeAmount
  networkFee?: SwapFeeAmount
}

function useFee(props: {
  tokenAmount: BigNumber | null | undefined
  tokenInfo: TokenBalance | null | undefined
}) {
  const localAmount = useTokenToLocalAmount(
    props.tokenAmount ?? new BigNumber(0), // added ?? just because condition can't be called before hooks
    props.tokenInfo?.tokenId
  )

  if (!props.tokenAmount || !props.tokenInfo) {
    return null
  }
  return { tokenAmount: props.tokenAmount, localAmount, tokenInfo: props.tokenInfo }
}

export default function FeeInfoBottomSheet(props: Props) {
  const { t } = useTranslation()
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol) ?? LocalCurrencySymbol.USD
  const networkFee = useFee({
    tokenAmount: props.networkFee?.amount,
    tokenInfo: props.networkFee?.token,
  })
  const networkMaxFee = useFee({
    tokenAmount: props.networkFee?.maxAmount,
    tokenInfo: props.networkFee?.token,
  })
  const appFee = useFee({
    tokenAmount: props.appFee?.amount,
    tokenInfo: props.appFee?.token,
  })
  const crossChainFee = useFee({
    tokenAmount: props.crossChainFee?.amount,
    tokenInfo: props.crossChainFee?.token,
  })
  const crossChainMaxFee = useFee({
    tokenAmount: props.crossChainFee?.maxAmount,
    tokenInfo: props.crossChainFee?.token,
  })

  const hasNetworkFee = !!(networkFee || networkMaxFee)
  const hasCrossChainFee = !!(crossChainFee || crossChainMaxFee)
  const hasAppFee = !!props.appFee
  const appFeeIsNotZero = hasAppFee && !!appFee && !!appFee.tokenAmount.gt(0)

  if (!hasNetworkFee && !hasAppFee && !hasCrossChainFee) {
    return null
  }

  return (
    <InfoBottomSheet
      forwardedRef={props.forwardedRef}
      title={hasNetworkFee && (hasAppFee || hasCrossChainFee) ? t('fees') : t('networkFee')}
      testID="FeeInfoBottomSheet"
    >
      <InfoBottomSheetContentBlock>
        <InfoBottomSheetHeading>
          <Trans i18nKey="breakdown" />
        </InfoBottomSheetHeading>

        {networkFee ? (
          <ReviewDetailsItem
            approx
            fontSize="small"
            label={t('estimatedNetworkFee')}
            testID="FeeInfoBottomSheet/EstimatedNetworkFee"
            type="token-amount"
            tokenAmount={networkFee.tokenAmount}
            localAmount={networkFee.localAmount}
            tokenInfo={networkFee.tokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        ) : (
          <ReviewDetailsItem
            fontSize="small"
            label={t('estimatedNetworkFee')}
            testID="FeeInfoBottomSheet/EstimatedNetworkFee"
            type="plain-text"
            value={t('unknown')}
          />
        )}
        {networkMaxFee ? (
          <ReviewDetailsItem
            fontSize="small"
            label={t('maxNetworkFee')}
            testID="FeeInfoBottomSheet/MaxNetworkFee"
            type="token-amount"
            tokenAmount={networkMaxFee.tokenAmount}
            localAmount={networkMaxFee.localAmount}
            tokenInfo={networkMaxFee.tokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        ) : (
          <ReviewDetailsItem
            fontSize="small"
            label={t('maxNetworkFee')}
            testID="FeeInfoBottomSheet/MaxNetworkFee"
            type="plain-text"
            value={t('unknown')}
          />
        )}

        {hasAppFee && (
          <>
            <RowDivider
              testID="FeeInfoBottomSheet/Divider/AppFee"
              marginVertical={Spacing.Smallest8}
            />
            {appFeeIsNotZero ? (
              <ReviewDetailsItem
                fontSize="small"
                label={t('appFee', { appName: APP_NAME })}
                type="token-amount"
                testID="FeeInfoBottomSheet/AppFee"
                tokenAmount={appFee.tokenAmount}
                localAmount={appFee.localAmount}
                tokenInfo={appFee.tokenInfo}
                localCurrencySymbol={localCurrencySymbol}
              />
            ) : (
              <ReviewDetailsItem
                fontSize="small"
                label={t('appFee', { appName: APP_NAME })}
                type="plain-text"
                testID="FeeInfoBottomSheet/AppFee"
                value={t('free')}
              />
            )}
          </>
        )}

        {hasCrossChainFee && (
          <RowDivider
            testID="FeeInfoBottomSheet/Divider/CrossChainFee"
            marginVertical={Spacing.Smallest8}
          />
        )}

        {crossChainFee && (
          <ReviewDetailsItem
            approx
            fontSize="small"
            label={t('estimatedCrossChainFee')}
            type="token-amount"
            testID="FeeInfoBottomSheet/EstimatedCrossChainFee"
            tokenAmount={crossChainFee.tokenAmount}
            localAmount={crossChainFee.localAmount}
            tokenInfo={crossChainFee.tokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        )}

        {crossChainMaxFee && (
          <ReviewDetailsItem
            fontSize="small"
            label={t('maxCrossChainFee')}
            type="token-amount"
            testID="FeeInfoBottomSheet/MaxCrossChainFee"
            tokenAmount={crossChainMaxFee.tokenAmount}
            localAmount={crossChainMaxFee.localAmount}
            tokenInfo={crossChainMaxFee.tokenInfo}
            localCurrencySymbol={localCurrencySymbol}
          />
        )}
      </InfoBottomSheetContentBlock>

      <InfoBottomSheetContentBlock>
        <InfoBottomSheetHeading>
          <Trans i18nKey="moreInformation" />
        </InfoBottomSheetHeading>

        <InfoBottomSheetParagraph>
          <Trans
            i18nKey={'feeInfoBottomSheet.feesInfo'}
            context={
              hasCrossChainFee && props.appFee?.percentage.gt(0)
                ? 'crossChainWithAppFee'
                : hasCrossChainFee
                  ? 'crossChain'
                  : props.appFee?.percentage.gt(0)
                    ? 'sameChainWithAppFee'
                    : 'sameChain'
            }
            tOptions={{ appFeePercentage: props.appFee?.percentage.toFormat() }}
          />
        </InfoBottomSheetParagraph>
      </InfoBottomSheetContentBlock>
    </InfoBottomSheet>
  )
}
