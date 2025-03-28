import BigNumber from 'bignumber.js'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { getNumberFormatSettings } from 'react-native-localize'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { hideAlert, showToast } from 'src/alert/actions'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { AssetsEvents, FiatExchangeEvents, HomeEvents } from 'src/analytics/Events'
import { toggleHideBalances } from 'src/app/actions'
import { hideWalletBalancesSelector } from 'src/app/selectors'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import TokenIcon, { IconSize } from 'src/components/TokenIcon'
import Touchable from 'src/components/Touchable'
import { useShowOrHideAnimation } from 'src/components/useShowOrHideAnimation'
import { refreshAllBalances } from 'src/home/actions'
import EyeIcon from 'src/icons/EyeIcon'
import ForwardChevron from 'src/icons/ForwardChevron'
import HiddenEyeIcon from 'src/icons/HiddenEyeIcon'
import InfoIcon from 'src/icons/InfoIcon'
import { useDollarsToLocalAmount } from 'src/localCurrency/hooks'
import {
  getLocalCurrencySymbol,
  localCurrencyExchangeRateErrorSelector,
} from 'src/localCurrency/selectors'
import { navigateClearingStack } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { totalPositionsBalanceUsdSelector } from 'src/positions/selectors'
import { useDispatch, useSelector } from 'src/redux/hooks'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import {
  useTokenPricesAreStale,
  useTokensInfoUnavailable,
  useTokensWithTokenBalance,
  useTokensWithUsdValue,
  useTotalTokenBalance,
} from 'src/tokens/hooks'
import { tokenFetchErrorSelector } from 'src/tokens/selectors'

function TokenBalance({
  style = styles.balance,
  singleTokenViewEnabled = true,
  showBalanceToggle = false,
}: {
  style?: StyleProp<TextStyle>
  singleTokenViewEnabled?: boolean
  showBalanceToggle?: boolean
}) {
  const tokensWithUsdValue = useTokensWithUsdValue()
  const localCurrencySymbol = useSelector(getLocalCurrencySymbol)
  const totalTokenBalanceLocal = useTotalTokenBalance()
  const tokenFetchError = useSelector(tokenFetchErrorSelector)
  const tokensAreStale = useTokenPricesAreStale()
  // TODO(ACT-1095): Update these to filter out unsupported networks once positions support non-Celo chains
  const totalPositionsBalanceUsd = useSelector(totalPositionsBalanceUsdSelector)
  const totalPositionsBalanceLocal = useDollarsToLocalAmount(totalPositionsBalanceUsd)
  const totalBalanceLocal =
    totalTokenBalanceLocal || totalPositionsBalanceLocal
      ? new BigNumber(totalTokenBalanceLocal ?? 0).plus(totalPositionsBalanceLocal ?? 0)
      : undefined
  const { decimalSeparator } = getNumberFormatSettings()

  const hideWalletBalance = useSelector(hideWalletBalancesSelector)
  const hideBalance = showBalanceToggle && hideWalletBalance
  const balanceDisplay = hideBalance ? `XX${decimalSeparator}XX` : totalBalanceLocal?.toFormat(2)

  const TotalTokenBalance = ({ balanceDisplay }: { balanceDisplay: string }) => {
    return (
      <View style={styles.row}>
        <Text style={style} testID={'TotalTokenBalance'}>
          {!hideBalance && localCurrencySymbol}
          {balanceDisplay}
        </Text>
        {showBalanceToggle && <HideBalanceButton hideBalance={hideBalance} />}
      </View>
    )
  }

  if (tokenFetchError || tokensAreStale) {
    // Show '-' if we haven't fetched the tokens yet or prices are stale
    return <TotalTokenBalance balanceDisplay={'-'} />
  } else if (
    singleTokenViewEnabled &&
    tokensWithUsdValue.length === 1 &&
    !totalPositionsBalanceLocal?.isGreaterThan(0)
  ) {
    const tokenBalance = tokensWithUsdValue[0].balance
    return (
      <View style={styles.oneBalance}>
        <TokenIcon
          token={tokensWithUsdValue[0]}
          size={IconSize.XLARGE}
          viewStyle={styles.tokenImgView}
        />
        <View style={styles.column}>
          <TotalTokenBalance balanceDisplay={balanceDisplay ?? '-'} />
          {!hideBalance && (
            <Text style={styles.tokenBalance}>
              {formatValueToDisplay(tokenBalance)} {tokensWithUsdValue[0].symbol}
            </Text>
          )}
        </View>
      </View>
    )
  } else {
    return <TotalTokenBalance balanceDisplay={balanceDisplay ?? new BigNumber(0).toFormat(2)} />
  }
}

function HideBalanceButton({ hideBalance }: { hideBalance: boolean }) {
  const dispatch = useDispatch()
  const eyeIconOnPress = () => {
    AppAnalytics.track(hideBalance ? HomeEvents.show_balances : HomeEvents.hide_balances)
    dispatch(toggleHideBalances())
  }
  return (
    <Touchable onPress={eyeIconOnPress} hitSlop={variables.iconHitslop}>
      {hideBalance ? <HiddenEyeIcon /> : <EyeIcon />}
    </Touchable>
  )
}

function useErrorMessageWithRefresh() {
  const { t } = useTranslation()

  const tokensInfoUnavailable = useTokensInfoUnavailable()
  const tokenFetchError = useSelector(tokenFetchErrorSelector)
  const localCurrencyError = useSelector(localCurrencyExchangeRateErrorSelector)

  const dispatch = useDispatch()

  const shouldShowError = tokensInfoUnavailable && (tokenFetchError || localCurrencyError)

  useEffect(() => {
    if (shouldShowError) {
      dispatch(
        showToast(
          t('outOfSyncBanner.message'),
          t('outOfSyncBanner.button'),
          refreshAllBalances(),
          t('outOfSyncBanner.title')
        )
      )
    } else {
      dispatch(hideAlert())
    }
  }, [shouldShowError])
}

export function AssetsTokenBalance({ showInfo }: { showInfo: boolean }) {
  const { t } = useTranslation()

  const [infoVisible, setInfoVisible] = useState(false)
  const [shouldRenderInfoComponent, setShouldRenderInfoComponent] = useState(false)
  const infoOpacity = useSharedValue(0)

  useErrorMessageWithRefresh()

  useShowOrHideAnimation(
    infoOpacity,
    infoVisible,
    () => {
      setShouldRenderInfoComponent(true)
    },
    () => {
      setShouldRenderInfoComponent(false)
    }
  )

  const animatedStyles = useAnimatedStyle(() => {
    return {
      opacity: infoOpacity.value,
    }
  })

  const toggleInfoVisible = () => {
    if (!infoVisible) {
      AppAnalytics.track(AssetsEvents.show_asset_balance_info)
    }
    setInfoVisible((prev) => !prev)
  }

  const handleDismissInfo = () => {
    setInfoVisible(false)
  }

  return (
    <TouchableWithoutFeedback onPress={handleDismissInfo}>
      <View testID="AssetsTokenBalance">
        <View style={styles.row}>
          <Text style={styles.walletTabTitle}>{t('bottomTabsNavigator.wallet.title')}</Text>
          {showInfo && (
            <TouchableOpacity
              onPress={toggleInfoVisible}
              hitSlop={variables.iconHitslop}
              testID="AssetsTokenBalance/Info"
            >
              <InfoIcon color={Colors.accent} />
            </TouchableOpacity>
          )}
        </View>
        <TokenBalance
          style={styles.totalBalance}
          singleTokenViewEnabled={false}
          showBalanceToggle={true}
        />

        {shouldRenderInfoComponent && (
          <Animated.View style={[styles.totalAssetsInfoContainer, animatedStyles]}>
            <Text style={styles.totalAssetsInfoText}>{t('totalAssetsInfo')}</Text>
          </Animated.View>
        )}
      </View>
    </TouchableWithoutFeedback>
  )
}

export function FiatExchangeTokenBalance() {
  const { t } = useTranslation()
  const totalBalance = useTotalTokenBalance()
  const tokenBalances = useTokensWithTokenBalance()

  const onViewBalances = () => {
    AppAnalytics.track(FiatExchangeEvents.cico_landing_token_balance, {
      totalBalance: totalBalance?.toString(),
    })
    navigateClearingStack(Screens.TabNavigator, { initialScreen: Screens.TabWallet })
  }

  return (
    <View style={styles.container} testID="FiatExchangeTokenBalance">
      <View style={styles.titleExchange}>
        <View style={styles.row}>
          {tokenBalances.length > 1 ? (
            <TouchableOpacity style={styles.row} onPress={onViewBalances} testID="ViewBalances">
              <Text style={styles.exchangeTotalValue}>{t('totalValue')}</Text>
              <ForwardChevron height={9.62} color={Colors.contentSecondary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.exchangeTotalValue}>{t('totalValue')}</Text>
          )}
        </View>
      </View>
      <TokenBalance style={styles.exchangeBalance} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    margin: variables.contentPadding,
  },
  walletTabTitle: {
    ...typeScale.titleMedium,
    marginRight: 10,
    paddingTop: Spacing.Small12,
  },
  totalAssetsInfoContainer: {
    position: 'absolute',
    top: 32,
    width: 190,
    paddingVertical: Spacing.Smallest8,
    paddingHorizontal: Spacing.Regular16,
    backgroundColor: Colors.backgroundScrim,
    borderRadius: 8,
  },
  totalAssetsInfoText: {
    ...typeScale.bodySmall,
    color: Colors.contentTertiary,
    textAlign: 'center',
  },
  titleExchange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exchangeTotalValue: {
    ...typeScale.labelSemiBoldSmall,
    color: Colors.contentSecondary,
    paddingRight: 3,
    paddingBottom: 4,
  },
  balance: {
    ...typeScale.titleLarge,
  },
  totalBalance: {
    ...typeScale.titleLarge,
  },
  exchangeBalance: {
    ...typeScale.labelLarge,
  },
  oneBalance: {
    flexDirection: 'row',
  },
  tokenImgView: {
    borderRadius: 24,
    marginRight: 8,
  },
  column: {
    flexDirection: 'column',
  },
  tokenBalance: {
    ...typeScale.labelSemiBoldSmall,
    color: Colors.contentSecondary,
  },
})
