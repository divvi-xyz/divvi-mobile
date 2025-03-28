import { BigNumber } from 'bignumber.js'
import React, { RefObject, useEffect, useRef, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Animated, PanResponder, StyleSheet, Text, View } from 'react-native'
import BottomSheet, { BottomSheetModalRefType } from 'src/components/BottomSheet'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { formatValueToDisplay } from 'src/components/TokenDisplay'
import ArrowRightThick from 'src/icons/ArrowRightThick'
import Checkmark from 'src/icons/Checkmark'
import ForwardChevron from 'src/icons/ForwardChevron'
import { getLocalCurrencySymbol } from 'src/localCurrency/selectors'
import { useSelector } from 'src/redux/hooks'
import { default as Colors, default as colors } from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import { TokenBalance } from 'src/tokens/slice'

const BUTTON_HEIGHT = 56

export default function UnfavorableRateBottomSheet({
  forwardedRef,
  onConfirm,
  onCancel,
  fromTokenAmount,
  fromLocalAmount,
  toTokenAmount,
  toLocalAmount,
  fromTokenInfo,
  toTokenInfo,
}: {
  forwardedRef: RefObject<BottomSheetModalRefType>
  onConfirm: () => void
  onCancel: () => void
  fromTokenAmount: BigNumber | null
  fromLocalAmount: BigNumber | null
  toTokenAmount: BigNumber | null
  toLocalAmount: BigNumber | null
  fromTokenInfo: TokenBalance | undefined
  toTokenInfo: TokenBalance | undefined
}) {
  const { t } = useTranslation()

  const localCurrencySymbol = useSelector(getLocalCurrencySymbol)

  if (!fromTokenInfo || !toTokenInfo || !fromTokenAmount || !toTokenAmount) {
    // should never happen
    return null
  }

  return (
    <BottomSheet
      forwardedRef={forwardedRef}
      title={t('swapUnfavorableRateBottomSheet.title')}
      description={t('swapUnfavorableRateBottomSheet.description')}
      testId="UnfavorableSwapBottomSheet"
    >
      {/* TODO: use new TokenDisplay component proposed in https://github.com/divvi-xyz/divvi-mobile/pull/181 */}
      <View style={styles.amountContainer}>
        <Text style={styles.tokenAmount} testID="FromAmount">
          <Trans
            i18nKey={'tokenAndLocalAmount'}
            context={fromLocalAmount ? undefined : 'noFiatPrice'}
            tOptions={{
              tokenAmount: `${formatValueToDisplay(fromTokenAmount.abs())}`,
              localAmount: fromLocalAmount ? formatValueToDisplay(fromLocalAmount) : '',
              tokenSymbol: fromTokenInfo?.symbol,
              localCurrencySymbol,
            }}
          >
            <Text style={styles.localAmount} />
          </Trans>
        </Text>
        <ArrowRightThick />
        <Text style={styles.tokenAmount} testID="ToAmount">
          <Trans
            i18nKey={'tokenAndLocalAmount'}
            context={toLocalAmount ? undefined : 'noFiatPrice'}
            tOptions={{
              tokenAmount: `${formatValueToDisplay(toTokenAmount.abs())}`,
              localAmount: toLocalAmount ? formatValueToDisplay(toLocalAmount) : '',
              tokenSymbol: toTokenInfo?.symbol,
              localCurrencySymbol,
            }}
          >
            <Text style={styles.localAmount} />
          </Trans>
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          onPress={() => {
            forwardedRef.current?.close()
            onCancel()
          }}
          type={BtnTypes.PRIMARY}
          size={BtnSizes.FULL}
          text={t('swapUnfavorableRateBottomSheet.cancel')}
          touchableStyle={{ height: BUTTON_HEIGHT }}
        />
        <SlideButton
          onComplete={() => {
            forwardedRef.current?.close()
            onConfirm()
          }}
        />
      </View>
    </BottomSheet>
  )
}

const SlideButton = ({ onComplete }: { onComplete: () => void }) => {
  const { t } = useTranslation()
  const slideThreshold = useRef(1)
  const pan = useRef(new Animated.Value(0)).current
  const [completed, setCompleted] = useState(false)

  const onCompleteRef = useRef(onComplete)

  // ensure the latest onComplete is used by the pan responder
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !completed,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > slideThreshold.current) {
          Animated.timing(pan, {
            toValue: slideThreshold.current,
            duration: 50,
            useNativeDriver: false,
          }).start(() => {
            setCompleted(true)
            // delay the onComplete to allow the user to see the checkmark
            setTimeout(onCompleteRef.current, 500)
            // reset after a second to allow the user to slide again in case the
            // transaction submission fails
            setTimeout(() => {
              setCompleted(false)
              pan.setValue(0)
            }, 1000)
          })
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start()
        }
      },
    })
  ).current

  return (
    <View
      style={[
        styles.slideButtonContainer,
        completed
          ? { backgroundColor: Colors.buttonSecondaryBackground }
          : { backgroundColor: Colors.buttonTertiaryBackground },
      ]}
      onLayout={(event) => {
        const { width } = event.nativeEvent.layout
        // threshold is the left edge of the slider, so we need to subtract the
        // width of the slider which is same as the height of the button
        slideThreshold.current = width - BUTTON_HEIGHT
      }}
      testID="SlideButton"
    >
      <Text style={styles.slideButtonText}>
        {completed
          ? t('swapUnfavorableRateBottomSheet.confirmed')
          : t('swapUnfavorableRateBottomSheet.confirm')}
      </Text>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.slider,
          {
            transform: [
              {
                translateX: pan.interpolate({
                  inputRange: [0, slideThreshold.current],
                  outputRange: [0, slideThreshold.current],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
        testID="SlideButton/Slider"
      >
        {!completed ? (
          <ForwardChevron color={Colors.contentTertiary} />
        ) : (
          <Checkmark height={24} width={24} color={Colors.contentTertiary} />
        )}
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  amountContainer: {
    flexDirection: 'row',
    marginVertical: Spacing.Thick24,
    gap: Spacing.Smallest8,
    alignItems: 'center',
  },
  tokenAmount: {
    ...typeScale.labelSemiBoldSmall,
  },
  localAmount: {
    ...typeScale.bodySmall,
    color: colors.contentSecondary,
  },
  buttonContainer: {
    gap: Spacing.Small12,
  },
  slideButtonContainer: {
    borderWidth: 1,
    borderColor: Colors.buttonTertiaryBorder,
    borderRadius: 30,
    justifyContent: 'center',
    overflow: 'hidden',
    width: '100%',
    height: BUTTON_HEIGHT,
  },
  slideButtonText: {
    ...typeScale.labelSemiBoldMedium,
    position: 'absolute',
    width: '100%',
    textAlign: 'center',
    color: Colors.buttonSecondaryContent,
  },
  slider: {
    backgroundColor: Array.isArray(Colors.buttonPrimaryBackground)
      ? Colors.buttonPrimaryBackground[0]
      : Colors.buttonPrimaryBackground,
    width: 40, // Reduced width slightly due to margin
    height: 40, // Reduced height slightly due to margin
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.Smallest8,
  },
})
