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
import colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { vibrateSuccess } from 'src/styles/hapticFeedback'
import { Spacing } from 'src/styles/styles'
import { TokenBalance } from 'src/tokens/slice'

const BUTTON_HEIGHT = 56
const SLIDER_SIZE = 40

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
  const pan = useRef(new Animated.Value(0)).current
  const [completed, setCompleted] = useState(false)

  // use both ref and state so changes to layout trigger re-renders and the
  // PanResponder has access to the latest value
  const slideThresholdRef = useRef(1)
  const [slideThreshold, setSlideThreshold] = useState(1)

  // ensure the latest onComplete is used by the pan responder
  const onCompleteRef = useRef(onComplete)
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: () => !completed,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > slideThresholdRef.current) {
          Animated.timing(pan, {
            toValue: slideThresholdRef.current,
            duration: 50,
            useNativeDriver: true,
          }).start(() => {
            setCompleted(true)
            vibrateSuccess()
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
            useNativeDriver: true,
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
          ? { backgroundColor: colors.backgroundTertiary }
          : { backgroundColor: colors.buttonTertiaryBackground },
      ]}
      onLayout={(event) => {
        // threshold is the left edge of the slider, so we need to subtract the
        // width of the slider and the margin
        const newThreshold = event.nativeEvent.layout.width - SLIDER_SIZE - 2 * Spacing.Smallest8
        setSlideThreshold(newThreshold)
        slideThresholdRef.current = newThreshold
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
                  inputRange: [0, slideThreshold],
                  outputRange: [0, slideThreshold],
                  extrapolate: 'clamp',
                }),
              },
            ],
          },
        ]}
        testID="SlideButton/Slider"
      >
        {!completed ? (
          <ForwardChevron color={colors.contentTertiary} />
        ) : (
          <Checkmark height={24} width={24} color={colors.contentTertiary} />
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
    borderColor: colors.buttonTertiaryBorder,
    borderRadius: BUTTON_HEIGHT / 2,
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
    color: colors.buttonSecondaryContent,
  },
  slider: {
    backgroundColor: Array.isArray(colors.buttonPrimaryBackground)
      ? colors.buttonPrimaryBackground[0]
      : colors.buttonPrimaryBackground,
    width: SLIDER_SIZE,
    height: SLIDER_SIZE,
    borderRadius: SLIDER_SIZE / 2,
    justifyContent: 'center',
    alignItems: 'center',
    margin: Spacing.Smallest8,
  },
})
