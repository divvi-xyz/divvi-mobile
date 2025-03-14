import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, View } from 'react-native'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { AssetsEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import GradientBlock from 'src/components/GradientBlock'
import Touchable from 'src/components/Touchable'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { vibrateInformative } from 'src/styles/hapticFeedback'
import { Spacing } from 'src/styles/styles'
import variables from 'src/styles/variables'
import { AssetTabType } from 'src/tokens/types'

const DEVICE_WIDTH_BREAKPOINT = 340

export default function TabBar({
  activeTab,
  onChange,
  displayPositions,
}: {
  activeTab: AssetTabType
  onChange: (selectedTab: AssetTabType) => void
  displayPositions: boolean
}) {
  const { t } = useTranslation()

  const items = useMemo(() => {
    const items = [{ id: AssetTabType.Tokens, text: t('assets.tabBar.tokens') }]
    if (!getAppConfig().experimental?.disableNfts) {
      items.push({ id: AssetTabType.Collectibles, text: t('assets.tabBar.collectibles') })
    }
    if (displayPositions) {
      items.push({ id: AssetTabType.Positions, text: t('assets.tabBar.dappPositions') })
    }
    return items
  }, [t, displayPositions])

  if (items.length <= 1) {
    return null
  }

  const handleSelectOption = (id: AssetTabType) => () => {
    AppAnalytics.track(
      [
        AssetsEvents.view_wallet_assets,
        AssetsEvents.view_collectibles,
        AssetsEvents.view_dapp_positions,
      ][id]
    )
    onChange(id)
    vibrateInformative()
  }

  // On a smaller device, if there are more than two tabs, use smaller gaps
  // between tabs
  const gap =
    items.length > 2 && variables.width < DEVICE_WIDTH_BREAKPOINT
      ? Spacing.Smallest8
      : Spacing.Regular16

  return (
    <View style={[styles.container, { gap }]} testID="Assets/TabBar">
      {items.map((item) => (
        <Touchable
          testID="Assets/TabBarItem"
          key={item.id}
          onPress={handleSelectOption(item.id)}
          style={styles.touchable}
        >
          <>
            <Text
              style={[item.id === activeTab ? styles.itemSelected : styles.item]}
              numberOfLines={1}
            >
              {item.text}
            </Text>

            {item.id === activeTab && <GradientBlock style={styles.activeTabUnderline} />}
          </>
        </Touchable>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
  },
  touchable: {
    flexShrink: 1,
  },
  item: {
    ...typeScale.bodyMedium,
    color: Colors.contentSecondary,
  },
  itemSelected: {
    ...typeScale.labelMedium,
  },
  activeTabUnderline: {
    height: 2,
    marginTop: 4,
  },
})
