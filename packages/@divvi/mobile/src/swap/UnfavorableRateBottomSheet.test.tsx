import { fireEvent, render } from '@testing-library/react-native'
import React from 'react'
import UnfavorableRateBottomSheet from 'src/swap/UnfavorableRateBottomSheet'
describe('UnfavorableRateBottomSheet', () => {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  const fromTokenAmount = '10 CELO'
  const toTokenAmount = '11 cUSD'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders correctly', () => {
    const { getByText } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmount={fromTokenAmount}
        toTokenAmount={toTokenAmount}
      />
    )
    expect(getByText('swapUnfavorableRateBottomSheet.title')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.description')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.cancel')).toBeTruthy()
    expect(getByText('swapUnfavorableRateBottomSheet.confirm')).toBeTruthy()
    expect(getByText('10 CELO → 11 cUSD')).toBeTruthy()
  })

  it('calls onCancel when cancel button is pressed', () => {
    const { getByText } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmount={fromTokenAmount}
        toTokenAmount={toTokenAmount}
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
        fromTokenAmount={fromTokenAmount}
        toTokenAmount={toTokenAmount}
      />
    )
    fireEvent.press(getByText('swapUnfavorableRateBottomSheet.confirm'))
    expect(onConfirm).toHaveBeenCalled()
    expect(onCancel).not.toHaveBeenCalled()
  })
})
