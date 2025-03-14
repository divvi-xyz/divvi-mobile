import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import AppAnalytics from 'src/analytics/AppAnalytics'
import { AssetsEvents } from 'src/analytics/Events'
import { getAppConfig } from 'src/appConfig'
import Colors from 'src/styles/colors'
import AssetTabBar from 'src/tokens/AssetTabBar'
import { AssetTabType } from 'src/tokens/types'
import { mockAppConfig } from 'test/values'

describe('AssetTabBar', () => {
  const onChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    jest.mocked(getAppConfig).mockReturnValue(mockAppConfig)
  })

  it('renders all items if positions is enabled', () => {
    const { getAllByTestId } = render(
      <AssetTabBar activeTab={AssetTabType.Tokens} onChange={onChange} displayPositions={true} />
    )

    const tabItems = getAllByTestId('Assets/TabBarItem')
    expect(tabItems).toHaveLength(3)
    expect(tabItems[0]).toHaveTextContent('tokens')
    expect(tabItems[0].children[0]).toHaveStyle({ color: Colors.contentPrimary })
    expect(tabItems[1]).toHaveTextContent('collectibles')
    expect(tabItems[1].children[0]).toHaveStyle({ color: Colors.contentSecondary })
    expect(tabItems[2]).toHaveTextContent('dappPositions')
    expect(tabItems[2].children[0]).toHaveStyle({ color: Colors.contentSecondary })
  })

  it('does not render positions if disabled', () => {
    const { getAllByTestId } = render(
      <AssetTabBar
        activeTab={AssetTabType.Collectibles}
        onChange={onChange}
        displayPositions={false}
      />
    )

    const tabItems = getAllByTestId('Assets/TabBarItem')
    expect(tabItems).toHaveLength(2)
    expect(tabItems[0]).toHaveTextContent('tokens')
    expect(tabItems[0].children[0]).toHaveStyle({ color: Colors.contentSecondary })
    expect(tabItems[1]).toHaveTextContent('collectibles')
    expect(tabItems[1].children[0]).toHaveStyle({ color: Colors.contentPrimary })
  })

  it('does not render collections if disableNfts is set', () => {
    jest
      .mocked(getAppConfig)
      .mockReturnValue({ ...mockAppConfig, experimental: { disableNfts: true } })
    const { getAllByTestId } = render(
      <AssetTabBar activeTab={AssetTabType.Positions} onChange={onChange} displayPositions={true} />
    )

    const tabItems = getAllByTestId('Assets/TabBarItem')
    expect(tabItems).toHaveLength(2)
    expect(tabItems[0]).toHaveTextContent('tokens')
    expect(tabItems[0].children[0]).toHaveStyle({ color: Colors.contentSecondary })
    expect(tabItems[1]).toHaveTextContent('dappPositions')
    expect(tabItems[1].children[0]).toHaveStyle({ color: Colors.contentPrimary })
  })

  it('returns null if collects and positions are disabled', () => {
    jest
      .mocked(getAppConfig)
      .mockReturnValue({ ...mockAppConfig, experimental: { disableNfts: true } })
    const { toJSON } = render(
      <AssetTabBar
        activeTab={AssetTabType.Positions}
        onChange={onChange}
        displayPositions={false}
      />
    )
    expect(toJSON()).toBeNull()
  })

  describe.each([
    { testName: 'all tabs enabled', positions: true, collectibles: true },
    { testName: 'collectibles disabled', positions: true, collectibles: false },
    { testName: 'positions disabled', positions: false, collectibles: true },
  ])('$testName', ({ positions, collectibles }) => {
    const cases = [{ tab: AssetTabType.Tokens, event: AssetsEvents.view_wallet_assets, index: 0 }]
    if (collectibles) {
      cases.push({
        tab: AssetTabType.Collectibles,
        event: AssetsEvents.view_collectibles,
        index: 1,
      })
    }
    if (positions) {
      cases.push({
        tab: AssetTabType.Positions,
        event: AssetsEvents.view_dapp_positions,
        index: collectibles ? 2 : 1,
      })
    }
    it.each(cases)(
      'selecting tab $tab fires analytics events and invokes on change',
      ({ tab, event, index }) => {
        jest
          .mocked(getAppConfig)
          .mockReturnValue({ ...mockAppConfig, experimental: { disableNfts: !collectibles } })
        const { getAllByTestId } = render(
          <AssetTabBar
            activeTab={AssetTabType.Tokens}
            onChange={onChange}
            displayPositions={positions}
          />
        )

        fireEvent.press(getAllByTestId('Assets/TabBarItem')[index])
        expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
        expect(AppAnalytics.track).toHaveBeenCalledWith(event)
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith(tab)
      }
    )
  })
})
