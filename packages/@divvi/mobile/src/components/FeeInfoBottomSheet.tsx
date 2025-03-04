import BigNumber from 'bignumber.js'
import React, { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import { useSelector } from 'react-redux'
import { type BottomSheetModalRefType } from 'src/components/BottomSheet'
import InfoBottomSheet from 'src/components/InfoBottomSheet'
import { ReviewDetailsItem } from 'src/components/ReviewTransaction'
import { APP_NAME } from 'src/config'
import { LocalCurrencySymbol } from 'src/localCurrency/consts'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import type { AppFeeAmount, SwapFeeAmount } from 'src/swap/types'
import { useTokenToLocalAmount } from 'src/tokens/hooks'
import type { TokenBalance } from 'src/tokens/slice'

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
  const appFeePresent = !!props.appFee
  const appFeeIsNotZero = appFeePresent && !!appFee && !!appFee?.tokenAmount.gt(0)

  const moreThanOneFee = useMemo(
    () => [hasNetworkFee, appFeeIsNotZero, hasCrossChainFee].filter(Boolean).length > 1,
    [hasNetworkFee, appFeeIsNotZero, hasCrossChainFee]
  )

  return (
    <InfoBottomSheet
      forwardedRef={props.forwardedRef}
      title={moreThanOneFee ? t('fees') : t('networkFee')}
      testID="FeeInfoBottomSheet"
    >
      <Text style={styles.label}>{t('breakdown')}</Text>

      {networkFee && (
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
      )}
      {networkMaxFee && (
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
      )}

      {/**
       * We need to show a divider if we have any info about app fee but only if we also have
       * network fee present. Otherwise, this is the first fee in the breakdown and we don't
       * need this divider at all.
       */}
      {appFeeIsNotZero && hasNetworkFee && <Divider />}

      {appFeePresent && (
        <>
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

      {/**
       * We need to show a divider if we have any info about cross-chain fee (est or max) but only
       * if we also have app fee or network fee present. Otherwise, this is the first fee in the
       * breakdown and we don't need this divider at all.
       */}
      {hasCrossChainFee && (appFeePresent || hasNetworkFee) && <Divider />}

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

      <View style={styles.moreInfoContainer}>
        <Text style={styles.label}>{t('moreInformation')}</Text>
        <Text style={styles.infoText}>
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
        </Text>
      </View>
    </InfoBottomSheet>
  )
}

function Divider() {
  return <View style={styles.divider} />
}

const styles = StyleSheet.create({
  divider: {
    marginVertical: Spacing.Smallest8,
    height: 1,
    backgroundColor: Colors.borderPrimary,
    width: '100%',
  },
  label: {
    ...typeScale.labelSemiBoldSmall,
  },
  infoText: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  moreInfoContainer: {
    marginTop: Spacing.Regular16,
    gap: Spacing.Smallest8,
  },
})
