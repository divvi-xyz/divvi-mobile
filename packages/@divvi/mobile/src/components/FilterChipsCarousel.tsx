import React from 'react'
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native'
import { ScrollView } from 'react-native-gesture-handler'
import Touchable from 'src/components/Touchable'
import DownArrowIcon from 'src/icons/DownArrowIcon'
import Colors from 'src/styles/colors'
import { typeScale } from 'src/styles/fonts'
import { Spacing } from 'src/styles/styles'
import { NetworkId } from 'src/transactions/types'

interface BaseFilterChip {
  id: string
  name: string
  isSelected: boolean
}
export interface BooleanFilterChip<T> extends BaseFilterChip {
  filterFn: (t: T) => boolean
}

export interface NetworkFilterChip<T> extends BaseFilterChip {
  filterFn: (t: T, n: NetworkId[]) => boolean
  allNetworkIds: NetworkId[]
  selectedNetworkIds: NetworkId[]
}

export function isNetworkChip<T>(chip: FilterChip<T>): chip is NetworkFilterChip<T> {
  return 'allNetworkIds' in chip
}

export type FilterChip<T> = BooleanFilterChip<T> | NetworkFilterChip<T>

interface Props<T> {
  chips: FilterChip<T>[]
  onSelectChip(chip: FilterChip<T>): void
  style?: StyleProp<ViewStyle>
  contentContainerStyle?: StyleProp<ViewStyle>
  forwardedRef?: React.RefObject<ScrollView | null>
  scrollEnabled?: boolean
}

function FilterChipsCarousel<T>({
  chips,
  onSelectChip,
  style,
  contentContainerStyle,
  forwardedRef,
  scrollEnabled = true,
}: Props<T>) {
  return (
    <ScrollView
      horizontal={true}
      scrollEnabled={scrollEnabled}
      showsHorizontalScrollIndicator={false}
      style={[styles.container, style]}
      contentContainerStyle={[
        styles.contentContainer,
        { flexWrap: scrollEnabled ? 'nowrap' : 'wrap', width: scrollEnabled ? 'auto' : '100%' },
        contentContainerStyle,
      ]}
      ref={forwardedRef}
      testID="FilterChipsCarousel"
    >
      {chips.map((chip) => {
        const { backgroundColor, borderColor, contentColor } = chip.isSelected
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
          <View
            key={chip.id}
            style={[
              styles.filterChipBackground,
              // borderColor maybe undefined in some button configurations (e.g.,
              // gradients), so we default to backgroundColor
              { backgroundColor, borderColor: borderColor ?? backgroundColor },
            ]}
          >
            <Touchable
              onPress={() => {
                onSelectChip(chip)
              }}
              style={styles.filterChip}
            >
              <View style={styles.filterChipTextWrapper}>
                <Text style={[styles.filterChipText, { color: contentColor }]}>{chip.name}</Text>
                {isNetworkChip(chip) && (
                  <DownArrowIcon
                    color={contentColor}
                    strokeWidth={2}
                    height={Spacing.Regular16}
                    style={{ marginBottom: 2, marginLeft: 4 }}
                  />
                )}
              </View>
            </Touchable>
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: -Spacing.Thick24,
  },
  contentContainer: {
    paddingHorizontal: Spacing.Thick24,
    gap: Spacing.Smallest8,
  },
  filterChipBackground: {
    overflow: 'hidden',
    borderRadius: 94,
    borderWidth: 1,
  },
  filterChip: {
    minHeight: 32,
    minWidth: 42,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.Regular16,
  },
  filterChipText: {
    ...typeScale.labelXSmall,
  },
  filterChipTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
})

export default FilterChipsCarousel
