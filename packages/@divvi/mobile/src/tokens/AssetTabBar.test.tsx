import { fireEvent, render, within } from '@testing-library/react-native'
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
    expect(tabItems[0]).toHaveTextContent('assets.tabBar.tokens', { exact: false })
    expect(within(tabItems[0]).getByText('assets.tabBar.tokens')).toHaveStyle({
      color: Colors.contentPrimary,
    })
    expect(tabItems[1]).toHaveTextContent('assets.tabBar.collectibles', { exact: false })
    expect(within(tabItems[1]).getByText('assets.tabBar.collectibles')).toHaveStyle({
      color: Colors.contentSecondary,
    })
    expect(tabItems[2]).toHaveTextContent('assets.tabBar.dappPositions', { exact: false })
    expect(within(tabItems[2]).getByText('assets.tabBar.dappPositions')).toHaveStyle({
      color: Colors.contentSecondary,
    })
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
    expect(tabItems[0]).toHaveTextContent('assets.tabBar.tokens', { exact: false })
    expect(within(tabItems[0]).getByText('assets.tabBar.tokens')).toHaveStyle({
      color: Colors.contentSecondary,
    })
    expect(tabItems[1]).toHaveTextContent('assets.tabBar.collectibles', { exact: false })
    expect(within(tabItems[1]).getByText('assets.tabBar.collectibles')).toHaveStyle({
      color: Colors.contentPrimary,
    })
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
    expect(tabItems[0]).toHaveTextContent('assets.tabBar.tokens', { exact: false })
    expect(within(tabItems[0]).getByText('assets.tabBar.tokens')).toHaveStyle({
      color: Colors.contentSecondary,
    })
    expect(tabItems[1]).toHaveTextContent('assets.tabBar.dappPositions', { exact: false })
    expect(within(tabItems[1]).getByText('assets.tabBar.dappPositions')).toHaveStyle({
      color: Colors.contentPrimary,
    })
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
    const cases = [{ tab: AssetTabType.Tokens, event: AssetsEvents.view_wallet_assets }]
    if (collectibles) {
      cases.push({ tab: AssetTabType.Collectibles, event: AssetsEvents.view_collectibles })
    }
    if (positions) {
      cases.push({ tab: AssetTabType.Positions, event: AssetsEvents.view_dapp_positions })
    }
    it.each(cases)(
      'selecting tab $tab fires analytics events and invokes on change',
      ({ tab, event }) => {
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

        const index = cases.findIndex((c) => c.tab === tab)
        fireEvent.press(getAllByTestId('Assets/TabBarItem')[index])
        expect(AppAnalytics.track).toHaveBeenCalledTimes(1)
        expect(AppAnalytics.track).toHaveBeenCalledWith(event)
        expect(onChange).toHaveBeenCalledTimes(1)
        expect(onChange).toHaveBeenCalledWith(tab)
      }
    )
  })
})
