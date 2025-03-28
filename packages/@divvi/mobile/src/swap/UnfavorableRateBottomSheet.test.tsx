import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React, { act } from 'react'
import { PanResponder } from 'react-native'
import UnfavorableRateBottomSheet from 'src/swap/UnfavorableRateBottomSheet'

jest.unmock('src/swap/UnfavorableRateBottomSheet')

describe('UnfavorableRateBottomSheet', () => {
  const onConfirm = jest.fn()
  const onCancel = jest.fn()
  const fromTokenAmount = '10 CELO'
  const toTokenAmount = '11 cUSD'

  beforeEach(() => {
    jest.clearAllMocks()
    jest
      .spyOn(PanResponder, 'create')
      .mockImplementation((config: any) => ({ panHandlers: config }))
    jest.useFakeTimers()
  })

  it('renders correctly', () => {
    const { getByText, queryByText } = render(
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
    expect(queryByText('swapUnfavorableRateBottomSheet.confirmed')).toBeFalsy()
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

  it('calls onConfirm when slider is completed and then resets', async () => {
    const { getByTestId, getByText, queryByText } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmount={fromTokenAmount}
        toTokenAmount={toTokenAmount}
      />
    )
    const slider = getByTestId('SlideButton/Slider')
    // Simulate sliding action
    slider.props.onPanResponderRelease(null, { dx: 2 })

    await waitFor(() => {
      expect(getByText('swapUnfavorableRateBottomSheet.confirmed')).toBeTruthy()
      expect(queryByText('swapUnfavorableRateBottomSheet.confirm')).toBeFalsy()
    })

    jest.advanceTimersByTime(600)

    expect(onConfirm).toHaveBeenCalled()

    await act(() => jest.advanceTimersByTime(600))

    await waitFor(() => {
      expect(queryByText('swapUnfavorableRateBottomSheet.confirmed')).toBeFalsy()
      expect(queryByText('swapUnfavorableRateBottomSheet.confirm')).toBeTruthy()
    })

    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not call onConfirm when slider is not completed', () => {
    const { getByTestId } = render(
      <UnfavorableRateBottomSheet
        forwardedRef={{ current: null }}
        onConfirm={onConfirm}
        onCancel={onCancel}
        fromTokenAmount={fromTokenAmount}
        toTokenAmount={toTokenAmount}
      />
    )
    const slider = getByTestId('SlideButton/Slider')
    slider.props.onPanResponderRelease(null, { dx: 1 })

    jest.advanceTimersByTime(600)
    expect(onConfirm).not.toHaveBeenCalled()
  })
})
