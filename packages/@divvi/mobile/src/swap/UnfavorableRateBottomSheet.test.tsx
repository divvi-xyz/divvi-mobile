import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import UnfavorableRateBottomSheet from 'src/swap/UnfavorableRateBottomSheet'

describe('UnfavorableRateBottomSheet', () => {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  const fromTokenAmount = '10 CELO'
  const fromLocalAmount = '$10.00'
  const toTokenAmount = '11 cUSD'
  const toLocalAmount = '$11.00'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const { getByText, getByTestId } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmountDisplay={fromTokenAmount}
        fromLocalAmountDisplay={fromLocalAmount}
        toTokenAmountDisplay={toTokenAmount}
        toLocalAmountDisplay={toLocalAmount}
      />
    )
    expect(getByText('swapUnfavorableRateBottomSheet.title')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.description')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.cancel')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.confirm')).toBeTruthy()
    expect(getByTestId('AmountContainer')).toBeTruthy()
  })

  it.each`
    testCase                        | fromLocalAmount | toLocalAmount | expected
    ${'both local amounts present'} | ${'$10.00'}     | ${'$11.00'}   | ${/^10 CELO \(\$10\.00\)11 cUSD \(\$11\.00\)$/}
    ${'from local amount missing'}  | ${''}           | ${'$11.00'}   | ${/^10 CELO11 cUSD \(\$11\.00\)$/}
    ${'to local amount missing'}    | ${'$10.00'}     | ${''}         | ${/^10 CELO \(\$10\.00\)11 cUSD$/}
    ${'both local amounts missing'} | ${''}           | ${''}         | ${/^10 CELO11 cUSD$/}
  `('renders correctly with $testCase', ({ fromLocalAmount, toLocalAmount, expected }) => {
    const { getByTestId } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmountDisplay={fromTokenAmount}
        fromLocalAmountDisplay={fromLocalAmount}
        toTokenAmountDisplay={toTokenAmount}
        toLocalAmountDisplay={toLocalAmount}
      />
    )
    expect(getByTestId('AmountContainer')).toBeTruthy()
    expect(getByTestId('AmountContainer')).toHaveTextContent(expected)
  })

  it('calls onCancel when cancel button is pressed', () => {
    const { getByText } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmountDisplay={fromTokenAmount}
        fromLocalAmountDisplay={fromLocalAmount}
        toTokenAmountDisplay={toTokenAmount}
        toLocalAmountDisplay={toLocalAmount}
      />
    )
    fireEvent.press(getByText('swapUnfavorableRateBottomSheet.cancel'))
    expect(onCancel).toHaveBeenCalled()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('calls onConfirm when confirm button is pressed', () => {
    const { getByText } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmountDisplay={fromTokenAmount}
        fromLocalAmountDisplay={fromLocalAmount}
        toTokenAmountDisplay={toTokenAmount}
        toLocalAmountDisplay={toLocalAmount}
      />
    )
    fireEvent.press(getByText('swapUnfavorableRateBottomSheet.confirm'))
    expect(onConfirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
