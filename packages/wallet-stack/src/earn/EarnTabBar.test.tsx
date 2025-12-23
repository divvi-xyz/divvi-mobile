import { fireEvent, render, within } from '@testing-library/react-native'
import React from 'react'
import EarnTabBar from 'src/earn/EarnTabBar'
import { EarnTabType } from 'src/earn/types'
import Colors from 'src/styles/colors'

describe('EarnTabBar', () => {
  const onChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders all tab bar items', () => {
    const { getAllByTestId } = render(
      <EarnTabBar activeTab={EarnTabType.AllPools} onChange={onChange} />
    )

    const tabItems = getAllByTestId('Earn/TabBarItem')
    expect(tabItems).toHaveLength(2)
    expect(tabItems[0]).toHaveTextContent('earnFlow.poolFilters.allPools', { exact: false })
    expect(within(tabItems[0]).getByText('earnFlow.poolFilters.allPools')).toHaveStyle({
      color: Colors.contentPrimary,
    })
    expect(tabItems[1]).toHaveTextContent('earnFlow.poolFilters.myPools', { exact: false })
    expect(within(tabItems[1]).getByText('earnFlow.poolFilters.myPools')).toHaveStyle({
      color: Colors.contentSecondary,
    })
  })

  it.each([{ tab: EarnTabType.AllPools }, { tab: EarnTabType.MyPools }])(
    'selecting tab $tab invokes on change',
    ({ tab }) => {
      const { getAllByTestId } = render(
        <EarnTabBar activeTab={EarnTabType.AllPools} onChange={onChange} />
      )

      fireEvent.press(getAllByTestId('Earn/TabBarItem')[tab])
      expect(onChange).toHaveBeenCalledTimes(1)
      expect(onChange).toHaveBeenCalledWith(tab)
    }
  )
})
