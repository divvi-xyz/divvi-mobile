import { BottomSheetView } from '@gorhom/bottom-sheet'
import React, { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import FastImage from 'react-native-fast-image'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { HomeEvents } from 'src/analytics/Events'
import { BottomSheetModalRefType } from 'src/components/BottomSheet'
import BottomSheetBase from 'src/components/BottomSheetBase'
import Button, { BtnSizes, BtnTypes } from 'src/components/Button'
import { divviBottomSheetSeen } from 'src/home/actions'
import { showDivviBottomSheetSelector } from 'src/home/selectors'
import { divviPie } from 'src/images/Images'
import Logo from 'src/images/Logo'
import LogoHeart from 'src/images/LogoHeart'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { useDispatch, useSelector } from 'src/redux/hooks'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'

const DIVVI_SLICES_URL = 'https://slices.divvi.xyz'

export default function DivviBottomSheet() {
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const insets = useSafeAreaInsets()
  const insetsStyle = { paddingBottom: Math.max(insets.bottom, Spacing.Regular16) }

  const bottomSheetRef = useRef<BottomSheetModalRefType>(null)

  const shouldShowBottomSheet = useSelector(showDivviBottomSheetSelector)

  const handleBottomSheetPositionChange = (index: number) => {
    if (index === -1) {
      AppAnalytics.track(HomeEvents.divvi_bottom_sheet_displayed)
      dispatch(divviBottomSheetSeen())
    }
  }

  const handleCtaPress = () => {
    AppAnalytics.track(HomeEvents.divvi_bottom_sheet_cta_pressed)
    bottomSheetRef.current?.close()
    navigate(Screens.WebViewScreen, { uri: DIVVI_SLICES_URL })
  }

  const handleBottomSheetClose = () => {
    dispatch(divviBottomSheetSeen())
  }

  useEffect(() => {
    if (shouldShowBottomSheet) {
      const timeoutId = setTimeout(() => {
        bottomSheetRef.current?.expand()
      }, 1000)
      return () => clearTimeout(timeoutId)
    }
  }, [shouldShowBottomSheet, bottomSheetRef.current])

  if (!shouldShowBottomSheet) {
    return null
  }

  return (
    <BottomSheetBase
      forwardedRef={bottomSheetRef}
      handleComponent={() => null} // handle is rendered within the content body
      backgroundStyle={styles.bottomSheetBackground}
      onChange={handleBottomSheetPositionChange}
      onClose={handleBottomSheetClose}
    >
      <BottomSheetView style={[insetsStyle, styles.sheetContainer]}>
        <View style={styles.topSection}>
          <View style={styles.handleBar} />
          <View style={styles.iconRow}>
            <LogoHeart size={72} />
            <Text style={styles.iconPlus}>+</Text>
            <Logo
              size={56}
              color={Colors.secondaryAccent}
              backgroundColor={Colors.contentPrimary}
            />
            <Text style={styles.iconEquals}>=</Text>
            <Text style={styles.emoji}>🎉</Text>
          </View>
        </View>
        <View style={styles.bottomSection}>
          <Text style={styles.title}>{t('divviBottomSheet.title')}</Text>
          <View style={styles.descriptionRow}>
            <Text style={styles.description}>
              {t('divviBottomSheet.body_part1') + ' '}
              <Logo size={Spacing.Regular16} translateY={3} />
              {' ' + t('divviBottomSheet.body_part2') + ' '}
              <LogoHeart size={Spacing.Regular16} translateY={3} />
              {' ' + t('divviBottomSheet.body_part3')}
              <View style={styles.inlineImageWrapper}>
                <FastImage style={styles.inlineImage} source={divviPie} />
              </View>
              {t('divviBottomSheet.body_part4')}
            </Text>
          </View>
          <Button
            style={styles.button}
            type={BtnTypes.PRIMARY}
            size={BtnSizes.FULL}
            onPress={handleCtaPress}
            text={t('divviBottomSheet.cta')}
          />
        </View>
      </BottomSheetView>
    </BottomSheetBase>
  )
}

const styles = StyleSheet.create({
  sheetContainer: {
    padding: 0,
    backgroundColor: 'transparent',
  },
  topSection: {
    backgroundColor: Colors.contentPrimary,
    borderTopLeftRadius: Spacing.Thick24,
    borderTopRightRadius: Spacing.Thick24,
    alignItems: 'center',
    paddingTop: Spacing.Small12,
    paddingBottom: Spacing.Thick24,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 4,
    backgroundColor: Colors.borderPrimary,
    marginBottom: Spacing.Regular16,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.Regular16,
  },
  iconPlus: {
    ...typeScale.titleMedium,
    color: '#fff',
    fontWeight: 'bold',
  },
  iconEquals: {
    ...typeScale.titleMedium,
    color: '#fff',
    fontWeight: 'bold',
  },
  emoji: {
    fontSize: 50,
  },
  bottomSection: {
    paddingHorizontal: Spacing.Thick24,
    paddingTop: Spacing.Thick24,
    paddingBottom: Spacing.Regular16,
    alignItems: 'center',
  },
  title: {
    ...typeScale.titleSmall,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: Spacing.Small12,
  },
  descriptionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.Thick24,
    textAlign: 'left',
  },
  description: {
    ...typeScale.bodySmall,
    color: Colors.contentSecondary,
  },
  button: {
    ...typeScale.labelSemiBoldSmall,
    width: '100%',
  },
  bottomSheetBackground: {
    marginTop: Spacing.Thick24,
  },
  inlineImageWrapper: {
    paddingLeft: 2,
    paddingRight: 2,
  },
  inlineImage: {
    width: Spacing.Regular16,
    height: Spacing.Regular16,
    transform: [{ translateY: 3 }],
  },
})
