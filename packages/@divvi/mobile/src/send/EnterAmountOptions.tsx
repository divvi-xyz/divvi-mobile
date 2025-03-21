import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Keyboard, KeyboardEvent, Platform, StyleSheet, Text, View } from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Touchable from 'src/components/Touchable'
import { useSelector } from 'src/redux/hooks'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import { demoModeEnabledSelector } from 'src/web3/selectors'

export default function EnterAmountOptions({
  onPressAmount,
  selectedAmount,
  testID,
}: {
  onPressAmount(amount: number): void
  selectedAmount: number | null
  testID: string
}) {
  const { t } = useTranslation()
  const translateY = useSharedValue(0)
  const [isVisible, setIsVisible] = useState(false)
  const demoModeEnabled = useSelector(demoModeEnabledSelector)

  const amountOptions = useMemo(() => {
    return [
      {
        amount: 0.25,
        label: t('percentage', { percentage: 25 }),
      },
      {
        amount: 0.5,
        label: t('percentage', { percentage: 50 }),
      },
      {
        amount: 0.75,
        label: t('percentage', { percentage: 75 }),
      },
      {
        amount: 1,
        label: t('maxSymbol'),
      },
    ]
  }, [])

  useEffect(() => {
    // This component should ideally follow the keyboard animation, so it should
    // be visible before the keyboard is shown and dismissed. Sadly Android does
    // not support the keyboardWillShow or keyboardWillHide events.
    const keyboardShowEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const keyboardHideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSubscription = Keyboard.addListener(keyboardShowEvent, (event: KeyboardEvent) => {
      setIsVisible(true)
      translateY.value = withTiming(-event.endCoordinates.height, {
        duration: event.duration || 300,
      })
    })
    const hideSubscription = Keyboard.addListener(keyboardHideEvent, (event: KeyboardEvent) => {
      translateY.value = withTiming(0, { duration: event.duration || 300 }, (isFinished) => {
        if (isFinished) {
          runOnJS(setIsVisible)(false)
        }
      })
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
    }
  })

  if (!isVisible) {
    return null
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          position: 'absolute',
          bottom: demoModeEnabled ? -variables.demoModeBorderWidth : 0,
          width: variables.width,
        },
        animatedStyle,
      ]}
    >
      <View style={styles.contentContainer} testID={testID}>
        {amountOptions.map(({ amount, label }) => {
          const { backgroundColor, borderColor, contentColor } =
            selectedAmount === amount
              ? {
                  backgroundColor: Array.isArray(Colors.buttonPrimaryBackground)
                    ? Colors.buttonPrimaryBackground[0]
                    : Colors.buttonPrimaryBackground,
                  borderColor: Colors.buttonPrimaryBorder,
                  contentColor: Colors.buttonPrimaryContent,
                }
              : {
                  backgroundColor: Colors.buttonSecondaryBackground,
                  borderColor: Colors.buttonSecondaryBorder,
                  contentColor: Colors.buttonSecondaryContent,
                }
          return (
            <Touchable borderRadius={100} key={label} onPress={() => onPressAmount(amount)}>
              <View
                style={[
                  styles.chip,
                  // borderColor maybe undefined in some button configurations (e.g.,
                  // gradients), so we default to backgroundColor
                  { backgroundColor, borderColor: borderColor ?? backgroundColor },
                ]}
              >
                <Text style={[styles.chipText, { color: contentColor }]}>{label}</Text>
              </View>
            </Touchable>
          )
        })}

        <Touchable
          onPress={() => {
            Keyboard.dismiss()
          }}
        >
          <View style={[styles.chip, { borderWidth: 0 }]}>
            <Text style={styles.chipText}>{t('done')}</Text>
          </View>
        </Touchable>
      </View>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundTertiary,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: Spacing.Small12,
    paddingHorizontal: Spacing.Thick24,
    gap: Spacing.Smallest8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 100,
    borderColor: Colors.contentPrimary,
    paddingVertical: Spacing.Smallest8,
    paddingHorizontal: Spacing.Regular16,
  },
  chipText: {
    ...typeScale.labelSemiBoldXSmall,
  },
})
